import { Injectable } from '@nestjs/common';
import { PrismaClient, type AuditEvent, type Prisma } from '@prisma/client';
import { BaseRepository } from '../../../database/base/base.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';

export type PrismaTx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export interface CreateAuditEventInput {
  tenantId?: string;
  actorId: string;
  actorType: string;
  actorEmail?: string;
  module: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
  ipAddress?: string;
  userAgent?: string;
  correlationId: string;
  severity: string;
}

@Injectable()
export class AuditEventRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async create(input: CreateAuditEventInput): Promise<AuditEvent> {
    return this._create(this.prisma, input);
  }

  async createWithTx(tx: PrismaTx, input: CreateAuditEventInput): Promise<AuditEvent> {
    return this._create(tx, input);
  }

  private async _create(
    client: PrismaTx,
    input: CreateAuditEventInput,
  ): Promise<AuditEvent> {
    const data: Prisma.AuditEventCreateInput = {
      tenantId: input.tenantId,
      actorId: input.actorId,
      actorType: input.actorType,
      actorEmail: input.actorEmail,
      module: input.module,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      before: input.before !== undefined ? (input.before as Prisma.InputJsonValue) : undefined,
      after: input.after !== undefined ? (input.after as Prisma.InputJsonValue) : undefined,
      metadata: input.metadata !== undefined ? (input.metadata as Prisma.InputJsonValue) : undefined,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      correlationId: input.correlationId,
      severity: input.severity,
    };
    return client.auditEvent.create({ data });
  }

  async findMany(filters: {
    tenantId?: string;
    actorId?: string;
    module?: string;
    action?: string;
    resourceType?: string;
    resourceId?: string;
    severity?: string;
    fromDate?: Date;
    toDate?: Date;
    page: number;
    pageSize: number;
  }): Promise<{ data: AuditEvent[]; total: number }> {
    const where: Prisma.AuditEventWhereInput = {
      ...(filters.tenantId !== undefined ? { tenantId: filters.tenantId } : {}),
      ...(filters.actorId ? { actorId: filters.actorId } : {}),
      ...(filters.module ? { module: filters.module } : {}),
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.resourceType ? { resourceType: filters.resourceType } : {}),
      ...(filters.resourceId ? { resourceId: filters.resourceId } : {}),
      ...(filters.severity ? { severity: filters.severity } : {}),
      ...(filters.fromDate || filters.toDate
        ? {
            occurredAt: {
              ...(filters.fromDate ? { gte: filters.fromDate } : {}),
              ...(filters.toDate ? { lte: filters.toDate } : {}),
            },
          }
        : {}),
    };

    const skip = (filters.page - 1) * filters.pageSize;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditEvent.findMany({
        where,
        skip,
        take: filters.pageSize,
        orderBy: { occurredAt: 'desc' },
      }),
      this.prisma.auditEvent.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string): Promise<AuditEvent | null> {
    return this.prisma.auditEvent.findUnique({ where: { id } });
  }

  async findByCorrelationId(correlationId: string): Promise<AuditEvent[]> {
    return this.prisma.auditEvent.findMany({
      where: { correlationId },
      orderBy: { occurredAt: 'asc' },
      take: 50,
    });
  }

  async summarize(fromDate?: Date, toDate?: Date) {
    const where: Prisma.AuditEventWhereInput = {
      ...(fromDate || toDate
        ? {
            occurredAt: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : {}),
    };

    const [total, bySeverity, byModule, recent] = await Promise.all([
      this.prisma.auditEvent.count({ where }),
      this.prisma.auditEvent.groupBy({
        by: ['severity'],
        where,
        _count: { _all: true },
      }),
      this.prisma.auditEvent.groupBy({
        by: ['module'],
        where,
        _count: { _all: true },
        orderBy: { _count: { module: 'desc' } },
        take: 10,
      }),
      this.prisma.auditEvent.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        take: 20,
      }),
    ]);

    return { total, bySeverity, byModule, recent };
  }
}
