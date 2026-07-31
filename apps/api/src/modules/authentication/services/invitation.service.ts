import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { InvitationRepository } from '../repositories/invitation.repository';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { generateSecureToken, hashToken } from '../utils/token.utils';
import {
  NOTIFICATION_GATEWAY,
  type NotificationGateway,
} from '../interfaces/notification-gateway.interface';
import type { InvitationCreateDto } from '../dto/invitation-create.dto';
import type { InvitationAcceptDto } from '../dto/invitation-accept.dto';
import type { AuthResponseDto } from '../dto/auth-response.dto';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';
import type { RequestContext } from './auth.service';

export interface InvitationCreatedResponse {
  id: string;
  email: string;
  tenantId: string;
  expiresAt: Date;
  createdAt: Date;
}

@Injectable()
export class InvitationService {
  private readonly invitationExpiryHours: number;
  private readonly accessExpiry: string;

  constructor(
    private readonly invitationRepo: InvitationRepository,
    private readonly passwordService: PasswordService,
    private readonly sessionService: SessionService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    @Inject(NOTIFICATION_GATEWAY) private readonly notifier: NotificationGateway,
  ) {
    this.invitationExpiryHours = config.getOrThrow<number>('auth.invitationExpiryHours');
    this.accessExpiry = config.getOrThrow<string>('jwt.accessExpiry');
  }

  async createInvitation(
    dto: InvitationCreateDto,
    inviterUserId: string | null,
    ctx: RequestContext,
  ): Promise<InvitationCreatedResponse> {
    const emailNormalised = dto.email.toLowerCase().trim();

    await this.invitationRepo.findOrCreateUserForInvitation(emailNormalised);

    const token = generateSecureToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + this.invitationExpiryHours * 60 * 60 * 1000);

    const invitation = await this.invitationRepo.createInvitation({
      tenantId: dto.tenantId,
      email: emailNormalised,
      roleIds: dto.roleIds ?? [],
      tokenHash,
      invitedBy: inviterUserId,
      expiresAt,
    });

    await this.emitAudit({
      tenantId: dto.tenantId,
      actorId: inviterUserId ?? '00000000-0000-0000-0000-000000000000',
      actorEmail: '',
      action: 'INVITATION_CREATED',
      resourceId: invitation.id,
      metadata: { inviteeEmail: emailNormalised },
      severity: 'INFO',
      correlationId: ctx.correlationId,
    });

    // Fire-and-forget — notification failure must not fail the invitation creation.
    void this.notifier
      .sendInvitation({ to: emailNormalised, invitationToken: token, expiresAt })
      .catch(() => undefined);

    return {
      id: invitation.id,
      email: invitation.email,
      tenantId: invitation.tenantId,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
    };
  }

  async acceptInvitation(dto: InvitationAcceptDto, ctx: RequestContext): Promise<AuthResponseDto> {
    const tokenHash = hashToken(dto.token);
    const invitation = await this.invitationRepo.findInvitationByTokenHash(tokenHash);

    if (!invitation) {
      throw new AppException({
        code: ERROR_CODES.INVITATION_NOT_FOUND,
        message: 'Invitation not found or token is invalid.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    if (invitation.acceptedAt !== null) {
      throw new AppException({
        code: ERROR_CODES.INVITATION_ALREADY_ACCEPTED,
        message: 'This invitation has already been accepted.',
        statusCode: HttpStatus.CONFLICT,
      });
    }

    if (invitation.expiresAt < new Date()) {
      throw new AppException({
        code: ERROR_CODES.INVITATION_EXPIRED,
        message: 'This invitation has expired.',
        statusCode: HttpStatus.GONE,
      });
    }

    const user = await this.invitationRepo.findUserByEmailNormalised(invitation.email);
    if (!user) {
      throw new AppException({
        code: ERROR_CODES.INVITATION_NOT_FOUND,
        message: 'User account for this invitation could not be found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    const passwordHash = await this.passwordService.hashPassword(dto.password);
    const activateUser = user.status === 'INVITED';

    await this.invitationRepo.acceptInvitationTransaction(
      invitation.id,
      user.id,
      passwordHash,
      activateUser,
    );

    const { session, refreshToken } = await this.sessionService.createSession(
      user.id,
      invitation.tenantId,
      { userAgent: ctx.userAgent, ipAddress: ctx.ipAddress },
    );

    const { accessToken, expiresIn } = this.issueAccessToken({
      userId: user.id,
      tenantId: invitation.tenantId,
      email: user.email,
      platformRole: user.platformRole ?? null,
      sessionId: session.id,
    });

    await this.emitAudit({
      tenantId: invitation.tenantId,
      actorId: user.id,
      actorEmail: user.email,
      action: 'INVITATION_ACCEPTED',
      resourceId: invitation.id,
      metadata: { ipAddress: ctx.ipAddress },
      severity: 'INFO',
      correlationId: ctx.correlationId,
    });

    return { accessToken, refreshToken, tokenType: 'Bearer', expiresIn, sessionId: session.id };
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
          resourceType: 'invitation',
          resourceId: data.resourceId,
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
