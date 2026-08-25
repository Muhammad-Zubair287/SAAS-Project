import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { AuditActorType, AuditEventSeverity } from '../../../common/enums/platform.enum';
import { SessionService } from './session.service';

@Injectable()
export class TenantSessionAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
  ) {}

  async listSessions(tenantId: string) {
    const rows = await this.prisma.session.findMany({
      where: {
        tenantId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        userId: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        idleExpiresAt: true,
        expiresAt: true,
        user: { select: { email: true, displayName: true } },
      },
    });

    return rows.map((s) => ({
      id: s.id,
      userId: s.userId,
      email: s.user.email,
      displayName: s.user.displayName,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      signedInAt: s.createdAt.toISOString(),
      lastActivityHint: s.idleExpiresAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
    }));
  }

  async revokeSession(
    tenantId: string,
    sessionId: string,
    actor: { userId: string; email: string },
    correlationId: string,
  ) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, tenantId },
    });
    if (!session) {
      throw new AppException({
        code: ERROR_CODES.SESSION_NOT_FOUND,
        message: 'Session not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    await this.sessionService.revokeSession(sessionId);
    await this.prisma.auditEvent.create({
      data: {
        tenantId,
        actorId: actor.userId,
        actorType: AuditActorType.USER,
        actorEmail: actor.email,
        module: 'identity',
        action: 'session.revoked',
        resourceType: 'session',
        resourceId: sessionId,
        correlationId,
        severity: AuditEventSeverity.WARNING,
      },
    });
    return { id: sessionId, revoked: true };
  }

  async revokeAll(
    tenantId: string,
    actor: { userId: string; email: string },
    correlationId: string,
  ) {
    const result = await this.prisma.session.updateMany({
      where: { tenantId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.prisma.auditEvent.create({
      data: {
        tenantId,
        actorId: actor.userId,
        actorType: AuditActorType.USER,
        actorEmail: actor.email,
        module: 'identity',
        action: 'session.revoked_all',
        resourceType: 'session',
        resourceId: tenantId,
        after: { count: result.count },
        correlationId,
        severity: AuditEventSeverity.WARNING,
      },
    });
    return { revokedCount: result.count };
  }
}
