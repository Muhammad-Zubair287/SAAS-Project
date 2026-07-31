import { HttpStatus, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SupportGrantStatus } from '@prisma/client';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { AuditEventSeverity } from '../../../common/enums/platform.enum';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { SupportGrantRepository } from '../repositories/support-grant.repository';
import { TenantRepository } from '../repositories/tenant.repository';
import { PlatformAuditService } from './platform-audit.service';
import type { CreateSupportGrantDto, RevokeSupportGrantDto } from '../dto/create-support-grant.dto';
import type { PlatformActorContext } from '../../../common/interfaces/platform-actor.interface';
import type { SupportGrantResponseDto } from '../dto/tenant-response.dto';

const MAX_GRANT_HOURS = 24;

@Injectable()
export class SupportGrantService {
  constructor(
    private readonly grantRepo: SupportGrantRepository,
    private readonly tenantRepo: TenantRepository,
    private readonly audit: PlatformAuditService,
    private readonly prisma: PrismaService,
  ) {}

  async create(
    tenantId: string,
    dto: CreateSupportGrantDto,
    actor: PlatformActorContext,
    correlationId: string,
  ): Promise<SupportGrantResponseDto> {
    const tenant = await this.tenantRepo.findById(tenantId);
    if (!tenant) {
      throw new AppException({
        code: ERROR_CODES.TENANT_NOT_FOUND,
        message: 'Tenant not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    const starts = new Date(dto.startsAt);
    const ends = new Date(dto.endsAt);
    const durationHours = (ends.getTime() - starts.getTime()) / (1000 * 60 * 60);

    if (durationHours > MAX_GRANT_HOURS) {
      throw new AppException({
        code: ERROR_CODES.VALIDATION_FAILED,
        message: `Support grant duration cannot exceed ${MAX_GRANT_HOURS} hours.`,
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      });
    }

    if (ends <= starts) {
      throw new AppException({
        code: ERROR_CODES.VALIDATION_FAILED,
        message: 'endsAt must be after startsAt.',
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      });
    }

    const grant = await this.prisma.withTransaction(async (tx) => {
      const g = await this.grantRepo.createWithTx(tx, {
        tenant: { connect: { id: tenantId } },
        supportUserId: dto.supportUserId,
        requestedByUserId: actor.actorId,
        scope: dto.scope,
        reason: dto.reason,
        startsAt: starts,
        endsAt: ends,
        status: SupportGrantStatus.ACTIVE,
      });

      await this.audit.logWithTx(tx, actor, {
        module: 'platform',
        action: 'support_grant.created',
        resourceType: 'support_grant',
        resourceId: g.id,
        tenantId,
        after: { id: g.id, supportUserId: g.supportUserId, scope: g.scope, endsAt: g.endsAt },
        correlationId,
        severity: AuditEventSeverity.CRITICAL,
      });

      await tx.outboxEvent.create({
        data: {
          tenantId,
          eventId: randomUUID(),
          eventType: 'SupportGrantCreated.v1',
          payload: {
            grantId: g.id,
            tenantId,
            supportUserId: g.supportUserId,
            scope: g.scope,
            endsAt: g.endsAt,
            actorId: actor.actorId,
            correlationId,
          },
        },
      });

      return g;
    });

    return this.toResponseDto(grant);
  }

  async revoke(
    grantId: string,
    dto: RevokeSupportGrantDto,
    actor: PlatformActorContext,
    correlationId: string,
  ): Promise<SupportGrantResponseDto> {
    const grant = await this.grantRepo.findById(grantId);

    if (!grant) {
      throw new AppException({
        code: ERROR_CODES.SUPPORT_GRANT_NOT_FOUND,
        message: 'Support grant not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    if (grant.status === SupportGrantStatus.REVOKED) {
      throw new AppException({
        code: ERROR_CODES.SUPPORT_GRANT_ALREADY_REVOKED,
        message: 'This support grant has already been revoked.',
        statusCode: HttpStatus.CONFLICT,
      });
    }

    if (grant.status === SupportGrantStatus.EXPIRED) {
      throw new AppException({
        code: ERROR_CODES.SUPPORT_GRANT_EXPIRED,
        message: 'This support grant has already expired.',
        statusCode: HttpStatus.CONFLICT,
      });
    }

    const revoked = await this.prisma.withTransaction(async (tx) => {
      const r = await this.grantRepo.revokeWithTx(tx, grantId, actor.actorId, dto.reason);

      await this.audit.logWithTx(tx, actor, {
        module: 'platform',
        action: 'support_grant.revoked',
        resourceType: 'support_grant',
        resourceId: grantId,
        tenantId: grant.tenantId,
        before: { status: grant.status },
        after: { status: 'REVOKED', revokedReason: dto.reason },
        correlationId,
        severity: AuditEventSeverity.CRITICAL,
      });

      await tx.outboxEvent.create({
        data: {
          tenantId: grant.tenantId,
          eventId: randomUUID(),
          eventType: 'SupportGrantRevoked.v1',
          payload: {
            grantId,
            tenantId: grant.tenantId,
            reason: dto.reason,
            actorId: actor.actorId,
            correlationId,
          },
        },
      });

      return r;
    });

    return this.toResponseDto(revoked);
  }

  async findByTenantId(tenantId: string): Promise<SupportGrantResponseDto[]> {
    const grants = await this.grantRepo.findByTenantId(tenantId);
    return grants.map((g) => this.toResponseDto(g));
  }

  private toResponseDto(grant: Awaited<ReturnType<SupportGrantRepository['findById']>> & {}): SupportGrantResponseDto {
    return {
      id: grant!.id,
      tenantId: grant!.tenantId,
      supportUserId: grant!.supportUserId,
      requestedByUserId: grant!.requestedByUserId,
      approvedByUserId: grant!.approvedByUserId ?? undefined,
      scope: (grant!.scope as string[]),
      reason: grant!.reason,
      startsAt: grant!.startsAt.toISOString(),
      endsAt: grant!.endsAt.toISOString(),
      revokedAt: grant!.revokedAt?.toISOString(),
      status: grant!.status,
      createdAt: grant!.createdAt.toISOString(),
      createdBy: grant!.createdBy ?? undefined,
      updatedAt: grant!.updatedAt.toISOString(),
      updatedBy: grant!.updatedBy ?? undefined,
      rowVersion: grant!.rowVersion.toString(),
    };
  }
}
