import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AuthRepository } from '../repositories/auth.repository';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { MfaService } from './mfa.service';
import { ChallengeService } from './challenge.service';
import type { LoginDto } from '../dto/login.dto';
import type { RefreshTokenDto } from '../dto/refresh-token.dto';
import type { AuthResponseDto } from '../dto/auth-response.dto';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

export interface MfaChallengeResponse {
  mfaRequired: true;
  challengeToken: string;
}

export type LoginResponse = AuthResponseDto | MfaChallengeResponse;

export interface RequestContext {
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string;
}

// Nil UUID used as actorId for audit events where the user cannot be identified.
const NIL_UUID = '00000000-0000-0000-0000-000000000000';

const BLOCKED_TENANT_STATUSES = new Set(['SUSPENDED', 'CLOSED', 'ARCHIVED']);

@Injectable()
export class AuthService {
  private readonly accessExpiry: string;

  constructor(
    private readonly authRepo: AuthRepository,
    private readonly sessionService: SessionService,
    private readonly passwordService: PasswordService,
    private readonly mfaService: MfaService,
    private readonly challengeService: ChallengeService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.accessExpiry = config.getOrThrow<string>('jwt.accessExpiry');
  }

  async login(dto: LoginDto, ctx: RequestContext): Promise<LoginResponse> {
    const emailNormalised = dto.email.toLowerCase().trim();
    const user = await this.authRepo.findUserByEmail(emailNormalised);

    // Guard: user not found or no password credential (constant-time path).
    if (!user || !user.passwordCredential) {
      await this.emitAudit({
        tenantId: dto.tenantId ?? null,
        actorId: user?.id ?? NIL_UUID,
        actorEmail: emailNormalised,
        action: 'LOGIN_FAILED',
        metadata: { reason: 'credentials_invalid', ipAddress: ctx.ipAddress },
        severity: 'WARNING',
        correlationId: ctx.correlationId,
      });
      throw new AppException({
        code: ERROR_CODES.INVALID_CREDENTIALS,
        message: 'Invalid email or password.',
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    const passwordValid = await this.passwordService.verifyPassword(
      dto.password,
      user.passwordCredential.passwordHash,
    );

    if (!passwordValid) {
      await this.emitAudit({
        tenantId: dto.tenantId ?? null,
        actorId: user.id,
        actorEmail: user.email,
        action: 'LOGIN_FAILED',
        metadata: { reason: 'credentials_invalid', ipAddress: ctx.ipAddress },
        severity: 'WARNING',
        correlationId: ctx.correlationId,
      });
      throw new AppException({
        code: ERROR_CODES.INVALID_CREDENTIALS,
        message: 'Invalid email or password.',
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    if (user.status === 'LOCKED') {
      throw new AppException({
        code: ERROR_CODES.ACCOUNT_LOCKED,
        message: 'Account is locked. Please contact your administrator.',
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    if (user.status === 'DEACTIVATED') {
      throw new AppException({
        code: ERROR_CODES.ACCOUNT_DISABLED,
        message: 'Account has been deactivated.',
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    if (user.status !== 'ACTIVE') {
      throw new AppException({
        code: ERROR_CODES.AUTHENTICATION_REQUIRED,
        message: 'Account is not yet active.',
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    if (dto.tenantId) {
      const tenant = await this.authRepo.findTenantStatus(dto.tenantId);
      if (!tenant) {
        throw new AppException({
          code: ERROR_CODES.AUTHENTICATION_REQUIRED,
          message: 'Tenant not found.',
          statusCode: HttpStatus.UNAUTHORIZED,
        });
      }
      if (BLOCKED_TENANT_STATUSES.has(tenant.status)) {
        throw new AppException({
          code: ERROR_CODES.TENANT_SUSPENDED,
          message: 'Tenant is not accessible.',
          statusCode: HttpStatus.FORBIDDEN,
        });
      }
    }

    // Check for active MFA — if enrolled, issue a short-lived challenge token instead of a session.
    const hasMfa = await this.mfaService.hasActiveMfa(user.id);
    if (hasMfa) {
      const challengeToken = this.challengeService.issueChallengeToken(
        user.id,
        dto.tenantId ?? null,
        user.email,
      );
      return { mfaRequired: true as const, challengeToken };
    }

    const { session, refreshToken } = await this.sessionService.createSession(
      user.id,
      dto.tenantId ?? null,
      { userAgent: ctx.userAgent, ipAddress: ctx.ipAddress },
    );

    await this.authRepo.updateLastLoginAt(user.id);

    const { accessToken, expiresIn } = this.issueAccessToken({
      userId: user.id,
      tenantId: dto.tenantId ?? null,
      email: user.email,
      platformRole: user.platformRole ?? null,
      sessionId: session.id,
    });

    await this.emitAudit({
      tenantId: dto.tenantId ?? null,
      actorId: user.id,
      actorEmail: user.email,
      action: 'LOGIN_SUCCESS',
      resourceId: session.id,
      metadata: { ipAddress: ctx.ipAddress, userAgent: ctx.userAgent },
      severity: 'INFO',
      correlationId: ctx.correlationId,
    });

    return { accessToken, refreshToken, tokenType: 'Bearer', expiresIn, sessionId: session.id };
  }

  async refresh(dto: RefreshTokenDto, ctx: RequestContext): Promise<AuthResponseDto> {
    const { session, refreshToken } = await this.sessionService.validateAndRotate(
      dto.refreshToken,
      { userAgent: ctx.userAgent, ipAddress: ctx.ipAddress },
    );

    // Reload user to enforce current status (account may have been locked post-login).
    const user = await this.authRepo.findUserById(session.userId);
    if (!user) {
      throw new AppException({
        code: ERROR_CODES.AUTHENTICATION_REQUIRED,
        message: 'User not found.',
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    if (user.status !== 'ACTIVE') {
      await this.authRepo.revokeSession(session.id);
      throw new AppException({
        code: user.status === 'LOCKED' ? ERROR_CODES.ACCOUNT_LOCKED : ERROR_CODES.ACCOUNT_DISABLED,
        message: 'Account is no longer active.',
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    const { accessToken, expiresIn } = this.issueAccessToken({
      userId: user.id,
      tenantId: session.tenantId,
      email: user.email,
      platformRole: user.platformRole ?? null,
      sessionId: session.id,
    });

    await this.emitAudit({
      tenantId: session.tenantId,
      actorId: user.id,
      actorEmail: user.email,
      action: 'REFRESH',
      resourceId: session.id,
      metadata: { ipAddress: ctx.ipAddress },
      severity: 'INFO',
      correlationId: ctx.correlationId,
    });

    return { accessToken, refreshToken, tokenType: 'Bearer', expiresIn, sessionId: session.id };
  }

  async logout(
    sessionId: string,
    userId: string,
    userEmail: string,
    ctx: RequestContext,
  ): Promise<void> {
    if (!sessionId) return;

    await this.sessionService.revokeSession(sessionId);

    await this.emitAudit({
      tenantId: null,
      actorId: userId,
      actorEmail: userEmail,
      action: 'LOGOUT',
      resourceId: sessionId,
      metadata: { ipAddress: ctx.ipAddress },
      severity: 'INFO',
      correlationId: ctx.correlationId,
    });
  }

  private issueAccessToken(payload: {
    userId: string;
    tenantId: string | null;
    email: string;
    platformRole: string | null;
    sessionId: string;
  }): { accessToken: string; expiresIn: number } {
    const jwtPayload: JwtPayload = {
      sub: payload.userId,
      tenantId: payload.tenantId ?? undefined,
      email: payload.email,
      roles: [],
      scope: payload.tenantId ? 'tenant' : 'platform',
      sessionId: payload.sessionId,
      platformRole: payload.platformRole,
    };
    const accessToken = this.jwtService.sign(jwtPayload);
    return { accessToken, expiresIn: this.parseExpirySeconds(this.accessExpiry) };
  }

  private parseExpirySeconds(expiry: string): number {
    const match = /^(\d+)(s|m|h|d)$/.exec(expiry);
    if (!match) return 900;
    const value = parseInt(match[1]!, 10);
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * (multipliers[match[2]!] ?? 60);
  }

  private async emitAudit(data: {
    tenantId: string | null;
    actorId: string;
    actorEmail: string;
    action: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
    severity: string;
    correlationId: string;
  }): Promise<void> {
    try {
      await this.prisma.auditEvent.create({
        data: {
          tenantId: data.tenantId,
          actorId: data.actorId,
          actorType: 'USER',
          actorEmail: data.actorEmail || null,
          module: 'authentication',
          action: data.action,
          resourceType: 'session',
          resourceId: data.resourceId,
          ...(data.metadata ? { metadata: data.metadata as Prisma.InputJsonValue } : {}),
          correlationId: data.correlationId,
          severity: data.severity,
        },
      });
    } catch {
      // Audit failure must never interrupt an auth operation.
    }
  }
}
