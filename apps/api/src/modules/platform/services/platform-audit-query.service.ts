import { HttpStatus, Injectable } from '@nestjs/common';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AuditEventRepository } from '../repositories/audit-event.repository';
import { TenantRepository } from '../repositories/tenant.repository';
import { createPaginatedResponse } from '../../../common/utils/response.helper';
import type { ApiSuccessResponse } from '../../../common/interfaces/api-response.interface';
import type { AuditEventResponseDto } from '../dto/audit-event-response.dto';
import type { ListAuditEventsDto } from '../dto/audit-event-response.dto';
import type { PlatformActorContext } from '../../../common/interfaces/platform-actor.interface';

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'secret',
  'apiKey',
  'authToken',
  'smtpPassword',
]);

@Injectable()
export class PlatformAuditQueryService {
  constructor(
    private readonly auditRepo: AuditEventRepository,
    private readonly tenantRepo: TenantRepository,
    private readonly prisma: PrismaService,
  ) {}

  async findMany(
    query: ListAuditEventsDto,
  ): Promise<ApiSuccessResponse<AuditEventResponseDto[]>> {
    const { data, total } = await this.auditRepo.findMany({
      tenantId: query.tenantId,
      actorId: query.actorId,
      module: query.module,
      resourceType: query.resourceType,
      action: query.action,
      severity: query.severity,
      fromDate: query.fromDate ? new Date(`${query.fromDate}T00:00:00.000Z`) : undefined,
      toDate: query.toDate ? new Date(`${query.toDate}T23:59:59.999Z`) : undefined,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });

    const tenantIds = [...new Set(data.map((e) => e.tenantId).filter((id): id is string => !!id))];
    const names = await this.tenantRepo.findDisplayNamesByIds(tenantIds);

    const events: AuditEventResponseDto[] = data.map((e) => ({
      id: e.id,
      tenantId: e.tenantId ?? undefined,
      tenantDisplayName: e.tenantId ? names.get(e.tenantId) : undefined,
      actorId: e.actorId,
      actorType: e.actorType,
      actorEmail: e.actorEmail ?? undefined,
      module: e.module,
      action: e.action,
      resourceType: e.resourceType,
      resourceId: e.resourceId ?? undefined,
      correlationId: e.correlationId,
      severity: e.severity,
      occurredAt: e.occurredAt.toISOString(),
    }));

    return createPaginatedResponse(events, total, query.page ?? 1, query.pageSize ?? 20);
  }

  async findById(id: string) {
    const event = await this.auditRepo.findById(id);
    if (!event) {
      throw new AppException({
        code: ERROR_CODES.AUDIT_EVENT_NOT_FOUND,
        message: 'Audit event not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    const related = await this.auditRepo.findByCorrelationId(event.correlationId);
    const tenantName = event.tenantId
      ? (await this.tenantRepo.findDisplayNamesByIds([event.tenantId])).get(event.tenantId)
      : undefined;

    return {
      id: event.id,
      tenantId: event.tenantId ?? undefined,
      tenantDisplayName: tenantName,
      actorId: event.actorId,
      actorType: event.actorType,
      actorEmail: event.actorEmail ?? undefined,
      module: event.module,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId ?? undefined,
      before: this.redact(event.before),
      after: this.redact(event.after),
      metadata: this.redact(event.metadata),
      ipAddress: event.ipAddress ?? undefined,
      userAgent: event.userAgent ?? undefined,
      correlationId: event.correlationId,
      severity: event.severity,
      occurredAt: event.occurredAt.toISOString(),
      relatedEvents: related
        .filter((r) => r.id !== event.id)
        .map((r) => ({
          id: r.id,
          action: r.action,
          module: r.module,
          occurredAt: r.occurredAt.toISOString(),
          severity: r.severity,
        })),
    };
  }

  async summarize(fromDate?: string, toDate?: string) {
    const summary = await this.auditRepo.summarize(
      fromDate ? new Date(`${fromDate}T00:00:00.000Z`) : undefined,
      toDate ? new Date(`${toDate}T23:59:59.999Z`) : undefined,
    );

    return {
      totalEvents: summary.total,
      bySeverity: summary.bySeverity.map((r) => ({
        severity: r.severity,
        count: r._count._all,
      })),
      byModule: summary.byModule.map((r) => ({
        module: r.module,
        count: r._count._all,
      })),
      recent: summary.recent.map((e) => ({
        id: e.id,
        action: e.action,
        module: e.module,
        severity: e.severity,
        actorEmail: e.actorEmail ?? undefined,
        occurredAt: e.occurredAt.toISOString(),
        tenantId: e.tenantId ?? undefined,
      })),
    };
  }

  async requestExport(
    actor: PlatformActorContext,
    filters: Record<string, unknown>,
    reason?: string,
  ) {
    const job = await this.prisma.auditExportJob.create({
      data: {
        requestedBy: actor.actorId,
        status: 'PENDING',
        format: 'CSV',
        filtersJson: filters as object,
        reason,
      },
    });

    try {
      const { data } = await this.auditRepo.findMany({
        tenantId: typeof filters.tenantId === 'string' ? filters.tenantId : undefined,
        module: typeof filters.module === 'string' ? filters.module : undefined,
        action: typeof filters.action === 'string' ? filters.action : undefined,
        page: 1,
        pageSize: 5000,
      });

      const header =
        'id,occurredAt,module,action,actorEmail,severity,tenantId,resourceType,resourceId\n';
      const lines = data.map((e) =>
        [
          e.id,
          e.occurredAt.toISOString(),
          e.module,
          e.action,
          e.actorEmail ?? '',
          e.severity,
          e.tenantId ?? '',
          e.resourceType,
          e.resourceId ?? '',
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(','),
      );
      const dir = join(tmpdir(), 'wcos-audit-exports');
      await mkdir(dir, { recursive: true });
      const filePath = join(dir, `${job.id}.csv`);
      await writeFile(filePath, header + lines.join('\n'), 'utf8');

      const completed = await this.prisma.auditExportJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          filePath,
          rowCount: data.length,
          completedAt: new Date(),
        },
      });

      return {
        id: completed.id,
        status: completed.status,
        rowCount: completed.rowCount,
        downloadPath: `/platform/audit-events/exports/${completed.id}/download`,
        createdAt: completed.createdAt.toISOString(),
      };
    } catch (err) {
      await this.prisma.auditExportJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          errorMessage: err instanceof Error ? err.message : 'Export failed',
          completedAt: new Date(),
        },
      });
      throw err;
    }
  }

  async listExports(userId: string) {
    const jobs = await this.prisma.auditExportJob.findMany({
      where: { requestedBy: userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return jobs.map((j) => ({
      id: j.id,
      status: j.status,
      format: j.format,
      rowCount: j.rowCount ?? undefined,
      reason: j.reason ?? undefined,
      errorMessage: j.errorMessage ?? undefined,
      createdAt: j.createdAt.toISOString(),
      completedAt: j.completedAt?.toISOString(),
      downloadPath:
        j.status === 'COMPLETED' ? `/platform/audit-events/exports/${j.id}/download` : undefined,
    }));
  }

  async getExportFile(id: string, userId: string) {
    const job = await this.prisma.auditExportJob.findFirst({
      where: { id, requestedBy: userId },
    });
    if (!job || job.status !== 'COMPLETED' || !job.filePath) {
      throw new AppException({
        code: ERROR_CODES.NOT_FOUND,
        message: 'Export not found or not ready.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    return job.filePath;
  }

  private redact(value: unknown): unknown {
    if (value == null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map((v) => this.redact(v));
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEYS.has(k) ? '••••' : this.redact(v);
    }
    return out;
  }
}
