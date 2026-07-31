import { Injectable } from '@nestjs/common';
import { type Prisma, type Tenant, TenantStatus } from '@prisma/client';
import { BaseRepository } from '../../../database/base/base.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';
import type { ListTenantsDto } from '../dto/list-tenants.dto';
import { toPrismaSkipTake } from '../../../common/utils/pagination.helper';

// Batch 1: Plan and DeploymentRegion renamed displayName → name.
// Batch 2: plan is nullable (planId is optional FK); region is always present.
export interface TenantWithRelations extends Tenant {
  plan?: { name: string } | null;
  region?: { name: string };
}

@Injectable()
export class TenantRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string): Promise<TenantWithRelations | null> {
    return this.prisma.tenant.findUnique({
      where: { id },
      include: { plan: { select: { name: true } }, region: { select: { name: true } } },
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

  async findMany(
    query: ListTenantsDto,
  ): Promise<{ data: TenantWithRelations[]; total: number }> {
    const { page, pageSize, status, countryCode, planKey, search, sortOrder, sortBy } = query;
    const { skip, take } = toPrismaSkipTake({ page, pageSize });

    const where: Prisma.TenantWhereInput = {
      ...(status ? { status } : {}),
      ...(countryCode ? { countryCode } : {}),
      ...(planKey ? { planKey } : {}),
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
        include: { plan: { select: { name: true } }, region: { select: { name: true } } },
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
}
