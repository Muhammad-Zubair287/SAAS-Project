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
    resourceType?: string;
    resourceId?: string;
    fromDate?: Date;
    toDate?: Date;
    page: number;
    pageSize: number;
  }): Promise<{ data: AuditEvent[]; total: number }> {
    const where: Prisma.AuditEventWhereInput = {
      ...(filters.tenantId !== undefined ? { tenantId: filters.tenantId } : {}),
      ...(filters.actorId ? { actorId: filters.actorId } : {}),
      ...(filters.module ? { module: filters.module } : {}),
      ...(filters.resourceType ? { resourceType: filters.resourceType } : {}),
      ...(filters.resourceId ? { resourceId: filters.resourceId } : {}),
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
}
