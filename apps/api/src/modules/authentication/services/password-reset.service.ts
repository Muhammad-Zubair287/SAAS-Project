import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AuthRepository } from '../repositories/auth.repository';
import { InvitationRepository } from '../repositories/invitation.repository';
import { PasswordService } from './password.service';
import { generateSecureToken, hashToken } from '../utils/token.utils';
import {
  NOTIFICATION_GATEWAY,
  type NotificationGateway,
} from '../interfaces/notification-gateway.interface';
import type { PasswordResetRequestDto } from '../dto/password-reset-request.dto';
import type { PasswordResetConfirmDto } from '../dto/password-reset-confirm.dto';
import type { RequestContext } from './auth.service';

@Injectable()
export class PasswordResetService {
  private readonly resetExpiryHours: number;

  constructor(
    private readonly authRepo: AuthRepository,
    private readonly invitationRepo: InvitationRepository,
    private readonly passwordService: PasswordService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    @Inject(NOTIFICATION_GATEWAY) private readonly notifier: NotificationGateway,
  ) {
    this.resetExpiryHours = config.getOrThrow<number>('auth.passwordResetExpiryHours');
  }

  // Returns void regardless of whether the email exists — prevents user enumeration.
  async requestPasswordReset(dto: PasswordResetRequestDto, ctx: RequestContext): Promise<void> {
    const emailNormalised = dto.email.toLowerCase().trim();
    const user = await this.authRepo.findUserByEmail(emailNormalised);

    if (!user || user.status !== 'ACTIVE') {
      return; // Silent no-op — do not reveal whether the account exists.
    }

    // Invalidate any existing reset tokens for this user before creating a fresh one.
    await this.invitationRepo.deleteUserResetTokens(user.id);

    const token = generateSecureToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + this.resetExpiryHours * 60 * 60 * 1000);

    await this.invitationRepo.createResetToken(user.id, tokenHash, expiresAt);

    await this.emitAudit({
      tenantId: null,
      actorId: user.id,
      actorEmail: user.email,
      action: 'PASSWORD_RESET_REQUESTED',
      metadata: { ipAddress: ctx.ipAddress },
      severity: 'INFO',
      correlationId: ctx.correlationId,
    });

    void this.notifier
      .sendPasswordReset({ to: user.email, resetToken: token, expiresAt })
      .catch(() => undefined);
  }

  async confirmPasswordReset(dto: PasswordResetConfirmDto, ctx: RequestContext): Promise<void> {
    const tokenHash = hashToken(dto.token);
    const resetToken = await this.invitationRepo.findResetTokenByHash(tokenHash);

    if (!resetToken || resetToken.usedAt !== null) {
      throw new AppException({
        code: ERROR_CODES.PASSWORD_RESET_TOKEN_INVALID,
        message: 'Password reset token is invalid or has already been used.',
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      });
    }

    if (resetToken.expiresAt < new Date()) {
      throw new AppException({
        code: ERROR_CODES.PASSWORD_RESET_TOKEN_EXPIRED,
        message: 'Password reset token has expired. Please request a new one.',
        statusCode: HttpStatus.GONE,
      });
    }

    const passwordHash = await this.passwordService.hashPassword(dto.newPassword);

    // Atomic: mark token used + replace credential + revoke all sessions.
    await this.invitationRepo.resetPasswordTransaction(
      resetToken.id,
      resetToken.userId,
      passwordHash,
    );

    const user = await this.authRepo.findUserById(resetToken.userId);

    await this.emitAudit({
      tenantId: null,
      actorId: resetToken.userId,
      actorEmail: user?.email ?? '',
      action: 'PASSWORD_RESET_COMPLETED',
      metadata: { ipAddress: ctx.ipAddress },
      severity: 'INFO',
      correlationId: ctx.correlationId,
    });
  }

  private async emitAudit(data: {
    tenantId: string | null;
    actorId: string;
    actorEmail: string;
    action: string;
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
          resourceType: 'password_credential',
          ...(data.metadata ? { metadata: data.metadata as Prisma.InputJsonValue } : {}),
          correlationId: data.correlationId,
          severity: data.severity,
        },
      });
    } catch {
      // Audit failure must never interrupt a business operation.
    }
  }
}
