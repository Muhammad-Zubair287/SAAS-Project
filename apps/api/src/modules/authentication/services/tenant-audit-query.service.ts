import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { createPaginatedResponse } from '../../../common/utils/response.helper';
import { toPrismaSkipTake } from '../../../common/utils/pagination.helper';

export interface ListAuditQuery {
  page?: number;
  pageSize?: number;
  module?: string;
  action?: string;
  fromDate?: string;
  toDate?: string;
}

@Injectable()
export class TenantAuditQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, query: ListAuditQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { skip, take } = toPrismaSkipTake({ page, pageSize });

    const where: Prisma.AuditEventWhereInput = {
      tenantId,
      ...(query.module ? { module: query.module } : {}),
      ...(query.action ? { action: { contains: query.action, mode: 'insensitive' } } : {}),
      ...(query.fromDate || query.toDate
        ? {
            occurredAt: {
              ...(query.fromDate ? { gte: new Date(`${query.fromDate}T00:00:00.000Z`) } : {}),
              ...(query.toDate ? { lte: new Date(`${query.toDate}T23:59:59.999Z`) } : {}),
            },
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.auditEvent.count({ where }),
      this.prisma.auditEvent.findMany({
        where,
        skip,
        take,
        orderBy: { occurredAt: 'desc' },
        select: {
          id: true,
          actorId: true,
          actorEmail: true,
          module: true,
          action: true,
          resourceType: true,
          resourceId: true,
          severity: true,
          occurredAt: true,
          correlationId: true,
        },
      }),
    ]);

    return createPaginatedResponse(
      rows.map((r) => ({
        ...r,
        occurredAt: r.occurredAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    );
  }

  async getById(tenantId: string, id: string) {
    const row = await this.prisma.auditEvent.findFirst({
      where: { id, tenantId },
    });
    if (!row) {
      throw new AppException({
        code: ERROR_CODES.AUDIT_EVENT_NOT_FOUND,
        message: 'Audit event not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    return {
      id: row.id,
      actorId: row.actorId,
      actorType: row.actorType,
      actorEmail: row.actorEmail,
      module: row.module,
      action: row.action,
      resourceType: row.resourceType,
      resourceId: row.resourceId,
      // Never expose raw before/after secrets; return sanitized metadata only.
      metadata: row.metadata,
      after: row.after,
      severity: row.severity,
      occurredAt: row.occurredAt.toISOString(),
      correlationId: row.correlationId,
    };
  }
}
