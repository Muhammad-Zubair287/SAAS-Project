import { Injectable } from '@nestjs/common';
import { type Prisma, type Tenant, SupportGrantStatus, TenantStatus } from '@prisma/client';
import { BaseRepository } from '../../../database/base/base.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';
import type { ListTenantsDto } from '../dto/list-tenants.dto';
import { toPrismaSkipTake } from '../../../common/utils/pagination.helper';

export function parseNumericEntitlement(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// Batch 1: Plan and DeploymentRegion renamed displayName → name.
// Batch 2: plan is nullable (planId is optional FK); region is always present.
export interface TenantSubscriptionSummary {
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  status: string;
  billingCycle: string;
}

export interface TenantUsageSummary {
  activeEmployees: number;
}

export interface TenantWithRelations extends Tenant {
  plan?: { name: string; code: string } | null;
  region?: { name: string; code: string };
  subscriptions?: TenantSubscriptionSummary[];
  usageSnapshots?: TenantUsageSummary[];
}

@Injectable()
export class TenantRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private readonly tenantInclude = {
    plan: { select: { name: true, code: true } },
    region: { select: { name: true, code: true } },
    subscriptions: {
      orderBy: { createdAt: 'desc' as const },
      take: 1,
      select: {
        trialEndsAt: true,
        currentPeriodEnd: true,
        status: true,
        billingCycle: true,
      },
    },
    usageSnapshots: {
      orderBy: { snapshotDate: 'desc' as const },
      take: 1,
      select: { activeEmployees: true },
    },
  };

  async findById(id: string): Promise<TenantWithRelations | null> {
    return this.prisma.tenant.findUnique({
      where: { id },
      include: this.tenantInclude,
    });
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.prisma.tenant.findUnique({ where: { slug } });
  }

  async findByDisplayName(displayName: string): Promise<Tenant | null> {
    return this.prisma.tenant.findFirst({
      where: { displayName: { equals: displayName, mode: 'insensitive' } },
    });
  }

  async findTenantIdsByMinSeatUtilisation(minPct: number): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT t.id
      FROM tenant t
      LEFT JOIN LATERAL (
        SELECT s."activeEmployees"
        FROM tenant_usage_snapshot s
        WHERE s."tenantId" = t.id
        ORDER BY s."snapshotDate" DESC
        LIMIT 1
      ) latest ON true
      WHERE t."seatLimit" IS NOT NULL
        AND t."seatLimit" > 0
        AND (COALESCE(latest."activeEmployees", 0)::numeric * 100) >= (${minPct}::numeric * t."seatLimit")
    `;
    return rows.map((r) => r.id);
  }

  async resolveStorageLimitGb(tenantId: string, planId: string | null): Promise<number | null> {
    const override = await this.prisma.tenantEntitlement.findUnique({
      where: { tenantId_entitlementKey: { tenantId, entitlementKey: 'storage_limit_gb' } },
      select: { valueJson: true, value: true },
    });
    const fromOverride = parseNumericEntitlement(override?.valueJson ?? override?.value);
    if (fromOverride != null) return fromOverride;
    if (!planId) return null;
    const planEnt = await this.prisma.planEntitlement.findFirst({
      where: { planId, entitlement: { code: 'storage_limit_gb' } },
      select: { defaultValue: true },
    });
    return parseNumericEntitlement(planEnt?.defaultValue);
  }

  async findMany(
    query: ListTenantsDto,
  ): Promise<{ data: TenantWithRelations[]; total: number }> {
    const { page, pageSize, status, countryCode, planKey, search, sortOrder, sortBy, createdFrom, createdTo, trialEndingBefore, minSeatUtilisationPct } = query;
    const { skip, take } = toPrismaSkipTake({ page, pageSize });

    const createdAtFilter: Prisma.DateTimeFilter | undefined =
      createdFrom || createdTo
        ? {
            ...(createdFrom ? { gte: new Date(`${createdFrom}T00:00:00.000Z`) } : {}),
            ...(createdTo ? { lte: new Date(`${createdTo}T23:59:59.999Z`) } : {}),
          }
        : undefined;

    const utilisationIds =
      minSeatUtilisationPct != null
        ? await this.findTenantIdsByMinSeatUtilisation(minSeatUtilisationPct)
        : null;

    if (utilisationIds && utilisationIds.length === 0) {
      return { data: [], total: 0 };
    }

    const where: Prisma.TenantWhereInput = {
      ...(status ? { status } : {}),
      ...(countryCode ? { countryCode } : {}),
      ...(planKey ? { planKey } : {}),
      ...(utilisationIds ? { id: { in: utilisationIds } } : {}),
      ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
      ...(trialEndingBefore
        ? {
            subscriptions: {
              some: {
                trialEndsAt: {
                  not: null,
                  lte: new Date(`${trialEndingBefore}T23:59:59.999Z`),
                },
              },
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { displayName: { contains: search, mode: 'insensitive' } },
              { legalName: { contains: search, mode: 'insensitive' } },
              { slug: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const allowedSortFields: Record<string, Prisma.TenantOrderByWithRelationInput> = {
      displayName: { displayName: sortOrder ?? 'asc' },
      createdAt: { createdAt: sortOrder ?? 'desc' },
      status: { status: sortOrder ?? 'asc' },
      seatLimit: { seatLimit: sortOrder ?? 'desc' },
    };

    const orderBy: Prisma.TenantOrderByWithRelationInput =
      allowedSortFields[sortBy ?? 'createdAt'] ?? { createdAt: 'desc' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.tenant.findMany({
        where,
        skip,
        take,
        orderBy,
        include: this.tenantInclude,
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return { data, total };
  }

  async create(data: Prisma.TenantCreateInput): Promise<Tenant> {
    return this.prisma.tenant.create({ data });
  }

  async update(
    id: string,
    data: Prisma.TenantUpdateInput,
    expectedVersion?: bigint,
  ): Promise<Tenant> {
    return this.prisma.tenant.update({
      where: {
        id,
        ...(expectedVersion !== undefined ? { rowVersion: expectedVersion } : {}),
      },
      data: { ...data, rowVersion: { increment: 1 } },
    });
  }

  async activate(id: string, actorId: string): Promise<Tenant> {
    return this.prisma.tenant.update({
      where: { id },
      data: {
        status: TenantStatus.ACTIVE,
        activatedAt: new Date(),
        updatedBy: actorId,
        rowVersion: { increment: 1 },
      },
    });
  }

  async suspend(
    id: string,
    reason: string,
    actorId: string,
  ): Promise<Tenant> {
    return this.prisma.tenant.update({
      where: { id },
      data: {
        status: TenantStatus.SUSPENDED,
        suspendedAt: new Date(),
        suspendedReason: reason,
        suspendedBy: actorId,
        updatedBy: actorId,
        rowVersion: { increment: 1 },
      },
    });
  }

  async restore(id: string, actorId: string): Promise<Tenant> {
    return this.prisma.tenant.update({
      where: { id },
      data: {
        status: TenantStatus.ACTIVE,
        suspendedAt: null,
        suspendedReason: null,
        suspendedBy: null,
        updatedBy: actorId,
        rowVersion: { increment: 1 },
      },
    });
  }

  async countByStatus(): Promise<Record<string, number>> {
    const counts = await this.prisma.tenant.groupBy({
      by: ['status'],
      _count: { id: true },
    });
    return Object.fromEntries(counts.map((c) => [c.status, c._count.id]));
  }

  async getPlatformUsageSummary(): Promise<{
    totalSeatLimit: number;
    totalActiveEmployees: number;
    tenantsWithUsageData: number;
  }> {
    const [seatRow] = await this.prisma.$queryRaw<Array<{ total: bigint | null }>>`
      SELECT COALESCE(SUM("seatLimit"), 0)::bigint AS total
      FROM tenant
      WHERE status NOT IN ('CLOSED', 'ARCHIVED')
    `;

    const [usageRow] = await this.prisma.$queryRaw<
      Array<{ total_active: bigint | null; tenant_count: bigint | null }>
    >`
      SELECT COALESCE(SUM(s."activeEmployees"), 0)::bigint AS total_active,
             COUNT(*)::bigint AS tenant_count
      FROM tenant_usage_snapshot s
      INNER JOIN (
        SELECT "tenantId", MAX("snapshotDate") AS max_date
        FROM tenant_usage_snapshot
        GROUP BY "tenantId"
      ) latest ON s."tenantId" = latest."tenantId" AND s."snapshotDate" = latest.max_date
    `;

    return {
      totalSeatLimit: Number(seatRow?.total ?? 0n),
      totalActiveEmployees: Number(usageRow?.total_active ?? 0n),
      tenantsWithUsageData: Number(usageRow?.tenant_count ?? 0n),
    };
  }

  async countTrialsEndingSoon(withinDays: number): Promise<number> {
    const until = new Date();
    until.setUTCDate(until.getUTCDate() + withinDays);
    return this.prisma.tenantSubscription.count({
      where: {
        trialEndsAt: { not: null, lte: until, gte: new Date() },
        tenant: { status: { in: [TenantStatus.TRIAL, TenantStatus.ACTIVE, TenantStatus.DRAFT] } },
      },
    });
  }

  async countActiveSupportGrants(): Promise<number> {
    return this.prisma.supportGrant.count({
      where: { status: SupportGrantStatus.ACTIVE, endsAt: { gt: new Date() }, revokedAt: null },
    });
  }

  async findDisplayNamesByIds(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const rows = await this.prisma.tenant.findMany({
      where: { id: { in: ids } },
      select: { id: true, displayName: true },
    });
    return new Map(rows.map((r) => [r.id, r.displayName]));
  }
}
