import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { generateSecret, generateURI, verifySync } from 'otplib';
import * as bcrypt from 'bcrypt';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { MfaRepository } from '../repositories/mfa.repository';
import { AuthRepository } from '../repositories/auth.repository';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { ChallengeService } from './challenge.service';
import { encryptAesGcm, decryptAesGcm } from '../utils/crypto.utils';
import { generateBackupCodes } from '../utils/backup-code.utils';
import type { CurrentUserContext } from '../interfaces/current-user-context.interface';
import type { AuthResponseDto } from '../dto/auth-response.dto';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';
import type { DisableMfaDto } from '../dto/disable-mfa.dto';
import type { ChallengeMfaDto } from '../dto/challenge-mfa.dto';
import type { VerifyMfaDto } from '../dto/verify-mfa.dto';
import type { RequestContext } from './auth.service';

export interface EnrollMfaResponse {
  secret: string;
  otpauthUrl: string;
}

@Injectable()
export class MfaService {
  private readonly encryptionKey: string;
  private readonly accessExpiry: string;
  private readonly bcryptRounds: number;

  constructor(
    private readonly mfaRepo: MfaRepository,
    private readonly authRepo: AuthRepository,
    private readonly passwordService: PasswordService,
    private readonly sessionService: SessionService,
    private readonly challengeService: ChallengeService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.encryptionKey = config.getOrThrow<string>('auth.mfaEncryptionKey');
    this.accessExpiry = config.getOrThrow<string>('jwt.accessExpiry');
    this.bcryptRounds = config.getOrThrow<number>('auth.bcryptRounds');
  }

  async enroll(user: CurrentUserContext): Promise<EnrollMfaResponse> {
    if (!user.tenantId) {
      throw new AppException({
        code: ERROR_CODES.PERMISSION_DENIED,
        message: 'Platform staff accounts cannot enrol MFA through this endpoint.',
        statusCode: HttpStatus.FORBIDDEN,
      });
    }

    const existing = await this.mfaRepo.findActiveCredential(user.userId);
    if (existing) {
      throw new AppException({
        code: ERROR_CODES.MFA_ALREADY_ENABLED,
        message: 'MFA is already enabled for this account.',
        statusCode: HttpStatus.CONFLICT,
      });
    }

    // Remove any stale PENDING credential before creating a fresh one.
    await this.mfaRepo.deletePendingCredential(user.userId);

    const secret = generateSecret();
    const secretEncrypted = encryptAesGcm(secret, this.encryptionKey);
    const otpauthUrl = generateURI({ strategy: 'totp', label: user.email, issuer: 'Workforce Cloud OS', secret });

    await this.mfaRepo.createCredential({
      userId: user.userId,
      tenantId: user.tenantId,
      credentialType: 'TOTP',
      secretEncrypted,
    });

    return { secret, otpauthUrl };
  }

  async verifyAndEnable(
    user: CurrentUserContext,
    dto: VerifyMfaDto,
  ): Promise<{ backupCodes: string[] }> {
    const credential = await this.mfaRepo.findPendingCredential(user.userId);
    if (!credential) {
      throw new AppException({
        code: ERROR_CODES.MFA_NOT_ENROLLED,
        message: 'No pending MFA enrollment found. Please start enrollment first.',
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      });
    }

    const secret = decryptAesGcm(credential.secretEncrypted, this.encryptionKey);
    const { valid } = verifySync({ token: dto.code, secret, epochTolerance: 30 });
    if (!valid) {
      throw new AppException({
        code: ERROR_CODES.MFA_VERIFICATION_FAILED,
        message: 'TOTP code is invalid. Please try again.',
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      });
    }

    const plainCodes = generateBackupCodes();
    const hashedCodes = await Promise.all(
      plainCodes.map((c) => bcrypt.hash(c, this.bcryptRounds)),
    );

    await this.mfaRepo.enableCredential(credential.id, hashedCodes, new Date());

    await this.emitAudit({
      tenantId: user.tenantId,
      actorId: user.userId,
      actorEmail: user.email,
      action: 'MFA_ENABLED',
      resourceId: credential.id,
      severity: 'INFO',
      correlationId: '',
    });

    return { backupCodes: plainCodes };
  }

  async hasActiveMfa(userId: string): Promise<boolean> {
    const credential = await this.mfaRepo.findActiveCredential(userId);
    return credential !== null;
  }

  async completeMfaChallenge(
    dto: ChallengeMfaDto,
    ctx: RequestContext,
  ): Promise<AuthResponseDto> {
    const { userId, tenantId, email } = this.challengeService.validateChallengeToken(
      dto.challengeToken,
    );

    const credential = await this.mfaRepo.findActiveCredential(userId);
    if (!credential) {
      throw new AppException({
        code: ERROR_CODES.MFA_NOT_ENROLLED,
        message: 'No active MFA credential found.',
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      });
    }

    const codeAccepted = await this.verifyCode(credential, dto.code);
    if (!codeAccepted) {
      throw new AppException({
        code: ERROR_CODES.MFA_VERIFICATION_FAILED,
        message: 'MFA code is invalid or has already been used.',
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    const user = await this.authRepo.findUserById(userId);
    if (!user) {
      throw new AppException({
        code: ERROR_CODES.AUTHENTICATION_REQUIRED,
        message: 'User not found.',
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    const { session, refreshToken } = await this.sessionService.createSession(userId, tenantId, {
      userAgent: ctx.userAgent,
      ipAddress: ctx.ipAddress,
    });

    await this.authRepo.updateLastLoginAt(userId);

    const { accessToken, expiresIn } = this.issueAccessToken({
      userId,
      tenantId,
      email,
      platformRole: user.platformRole ?? null,
      sessionId: session.id,
    });

    await this.emitAudit({
      tenantId,
      actorId: userId,
      actorEmail: email,
      action: 'MFA_CHALLENGE_COMPLETED',
      resourceId: session.id,
      metadata: { ipAddress: ctx.ipAddress, userAgent: ctx.userAgent },
      severity: 'INFO',
      correlationId: ctx.correlationId,
    });

    return { accessToken, refreshToken, tokenType: 'Bearer', expiresIn, sessionId: session.id };
  }

  async disableMfa(
    user: CurrentUserContext,
    dto: DisableMfaDto,
    ctx: RequestContext,
  ): Promise<void> {
    const passwordCredential = await this.mfaRepo.findPasswordCredentialByUserId(user.userId);
    if (!passwordCredential) {
      throw new AppException({
        code: ERROR_CODES.INVALID_CREDENTIALS,
        message: 'Invalid credentials.',
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    const passwordValid = await this.passwordService.verifyPassword(
      dto.password,
      passwordCredential.passwordHash,
    );
    if (!passwordValid) {
      throw new AppException({
        code: ERROR_CODES.INVALID_CREDENTIALS,
        message: 'Invalid credentials.',
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    const credential = await this.mfaRepo.findActiveCredential(user.userId);
    if (!credential) {
      throw new AppException({
        code: ERROR_CODES.MFA_NOT_ENROLLED,
        message: 'MFA is not enabled on this account.',
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      });
    }

    const codeValid = await this.verifyCode(credential, dto.code);
    if (!codeValid) {
      throw new AppException({
        code: ERROR_CODES.MFA_VERIFICATION_FAILED,
        message: 'TOTP code is invalid.',
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      });
    }

    await this.mfaRepo.disableCredential(credential.id);

    // Revoke all OTHER sessions — current session remains valid so the response is returned.
    await this.authRepo.revokeAllUserSessionsExcept(user.userId, user.sessionId);

    await this.emitAudit({
      tenantId: user.tenantId,
      actorId: user.userId,
      actorEmail: user.email,
      action: 'MFA_DISABLED',
      resourceId: credential.id,
      metadata: { ipAddress: ctx.ipAddress },
      severity: 'WARNING',
      correlationId: ctx.correlationId,
    });
  }

  async regenerateBackupCodes(
    user: CurrentUserContext,
    dto: VerifyMfaDto,
    ctx: RequestContext,
  ): Promise<{ backupCodes: string[] }> {
    const credential = await this.mfaRepo.findActiveCredential(user.userId);
    if (!credential) {
      throw new AppException({
        code: ERROR_CODES.MFA_NOT_ENROLLED,
        message: 'MFA is not enabled on this account.',
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      });
    }

    const secret = decryptAesGcm(credential.secretEncrypted, this.encryptionKey);
    const { valid } = verifySync({ token: dto.code, secret, epochTolerance: 30 });
    if (!valid) {
      throw new AppException({
        code: ERROR_CODES.MFA_VERIFICATION_FAILED,
        message: 'TOTP code is invalid.',
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      });
    }

    const plainCodes = generateBackupCodes();
    const hashedCodes = await Promise.all(
      plainCodes.map((c) => bcrypt.hash(c, this.bcryptRounds)),
    );

    await this.mfaRepo.updateBackupCodes(credential.id, hashedCodes);

    await this.emitAudit({
      tenantId: user.tenantId,
      actorId: user.userId,
      actorEmail: user.email,
      action: 'MFA_BACKUP_CODES_REGENERATED',
      resourceId: credential.id,
      metadata: { ipAddress: ctx.ipAddress },
      severity: 'INFO',
      correlationId: ctx.correlationId,
    });

    return { backupCodes: plainCodes };
  }

  // Tries TOTP first; if that fails, attempts each backup code (consumed on match).
  private async verifyCode(
    credential: { id: string; secretEncrypted: string; backupCodesEncrypted: string[] },
    code: string,
  ): Promise<boolean> {
    const secret = decryptAesGcm(credential.secretEncrypted, this.encryptionKey);

    if (verifySync({ token: code, secret, epochTolerance: 30 }).valid) {
      return true;
    }

    // Try backup codes — O(n) but n is always 10.
    for (let i = 0; i < credential.backupCodesEncrypted.length; i++) {
      const hash = credential.backupCodesEncrypted[i]!;
      const matches = await bcrypt.compare(code, hash);
      if (matches) {
        const remaining = [
          ...credential.backupCodesEncrypted.slice(0, i),
          ...credential.backupCodesEncrypted.slice(i + 1),
        ];
        await this.mfaRepo.updateBackupCodes(credential.id, remaining);
        return true;
      }
    }

    return false;
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
    return {
      accessToken: this.jwtService.sign(jwtPayload),
      expiresIn: this.parseExpirySeconds(this.accessExpiry),
    };
  }

  private parseExpirySeconds(expiry: string): number {
    const match = /^(\d+)(s|m|h|d)$/.exec(expiry);
    if (!match) return 900;
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return parseInt(match[1]!, 10) * (multipliers[match[2]!] ?? 60);
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
          resourceType: 'mfa_credential',
          resourceId: data.resourceId,
          ...(data.metadata ? { metadata: data.metadata as Prisma.InputJsonValue } : {}),
          correlationId: data.correlationId,
          severity: data.severity,
        },
      });
    } catch {
      // Audit failure must never interrupt an MFA operation.
    }
  }
}
