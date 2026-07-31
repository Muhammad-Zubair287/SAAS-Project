import { HttpStatus, Injectable } from '@nestjs/common';
import { randomBytes, randomUUID } from 'crypto';
import type { Session } from '@prisma/client';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { AuthRepository, type CreateSessionInput } from '../repositories/auth.repository';
import { PasswordService } from './password.service';

// Business rules from spec: idle 30 min, absolute 12 h.
const ABSOLUTE_TTL_MS = 12 * 60 * 60 * 1000;
const IDLE_TTL_MS = 30 * 60 * 1000;

export interface SessionRequestContext {
  userAgent: string | null;
  ipAddress: string | null;
}

export interface NewSession {
  session: Session;
  refreshToken: string;
}

@Injectable()
export class SessionService {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly password: PasswordService,
  ) {}

  private buildExpiry(): { expiresAt: Date; idleExpiresAt: Date } {
    const now = Date.now();
    return {
      expiresAt: new Date(now + ABSOLUTE_TTL_MS),
      idleExpiresAt: new Date(now + IDLE_TTL_MS),
    };
  }

  // Format: <sessionId>.<64-hex-random>
  // Only the 64-hex random part (64 bytes) is hashed — stays within bcrypt 72-byte limit.
  private buildRefreshToken(sessionId: string): { refreshToken: string; randomPart: string } {
    const randomPart = randomBytes(32).toString('hex');
    return { refreshToken: `${sessionId}.${randomPart}`, randomPart };
  }

  private parseRefreshToken(token: string): { sessionId: string; randomPart: string } | null {
    const dot = token.indexOf('.');
    if (dot < 1) return null;
    return { sessionId: token.slice(0, dot), randomPart: token.slice(dot + 1) };
  }

  private buildSessionData(
    sessionId: string,
    userId: string,
    tenantId: string | null,
    hash: string,
    family: string,
    ctx: SessionRequestContext,
  ): CreateSessionInput {
    return {
      id: sessionId,
      userId,
      tenantId,
      refreshTokenHash: hash,
      refreshTokenFamily: family,
      userAgent: ctx.userAgent,
      ipAddress: ctx.ipAddress,
      ...this.buildExpiry(),
    };
  }

  async createSession(
    userId: string,
    tenantId: string | null,
    ctx: SessionRequestContext,
  ): Promise<NewSession> {
    const sessionId = randomUUID();
    const { refreshToken, randomPart } = this.buildRefreshToken(sessionId);
    const hash = await this.password.hashPassword(randomPart);

    const session = await this.authRepo.createSession(
      this.buildSessionData(sessionId, userId, tenantId, hash, randomUUID(), ctx),
    );

    return { session, refreshToken };
  }

  async validateAndRotate(
    refreshToken: string,
    ctx: SessionRequestContext,
  ): Promise<NewSession> {
    const parsed = this.parseRefreshToken(refreshToken);
    if (!parsed) {
      throw new AppException({
        code: ERROR_CODES.INVALID_TOKEN,
        message: 'Invalid refresh token format.',
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    const { sessionId, randomPart } = parsed;
    const session = await this.authRepo.findSessionById(sessionId);

    if (!session) {
      throw new AppException({
        code: ERROR_CODES.INVALID_TOKEN,
        message: 'Session not found.',
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    // Token reuse detected: revoke entire family to protect against token theft.
    if (session.revokedAt !== null) {
      await this.authRepo.revokeSessionFamily(session.refreshTokenFamily);
      throw new AppException({
        code: ERROR_CODES.INVALID_TOKEN,
        message: 'Refresh token already used. All sessions in this family have been revoked.',
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    if (session.expiresAt < new Date()) {
      await this.authRepo.revokeSession(session.id);
      throw new AppException({
        code: ERROR_CODES.SESSION_EXPIRED,
        message: 'Session has expired.',
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    if (session.idleExpiresAt < new Date()) {
      await this.authRepo.revokeSession(session.id);
      throw new AppException({
        code: ERROR_CODES.SESSION_EXPIRED,
        message: 'Session has expired due to inactivity.',
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    const valid = await this.password.verifyPassword(randomPart, session.refreshTokenHash);
    if (!valid) {
      await this.authRepo.revokeSessionFamily(session.refreshTokenFamily);
      throw new AppException({
        code: ERROR_CODES.INVALID_TOKEN,
        message: 'Invalid refresh token.',
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    // Rotate: revoke old, create new session preserving the family.
    const newSessionId = randomUUID();
    const { refreshToken: newToken, randomPart: newRandomPart } = this.buildRefreshToken(newSessionId);
    const newHash = await this.password.hashPassword(newRandomPart);

    const newSession = await this.authRepo.rotateSession(
      session.id,
      this.buildSessionData(
        newSessionId,
        session.userId,
        session.tenantId,
        newHash,
        session.refreshTokenFamily,
        ctx,
      ),
    );

    return { session: newSession, refreshToken: newToken };
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.authRepo.revokeSession(sessionId);
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.authRepo.revokeAllUserSessions(userId);
  }
}
