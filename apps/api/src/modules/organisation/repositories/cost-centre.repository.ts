import { Injectable } from '@nestjs/common';
import { type Prisma, type CostCentre } from '@prisma/client';
import { BaseRepository } from '../../../database/base/base.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { toPrismaSkipTake } from '../../../common/utils/pagination.helper';
import type { ListCostCentresDto } from '../dto/list-cost-centres.dto';

@Injectable()
export class CostCentreRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string, tenantId: string): Promise<CostCentre | null> {
    return this.prisma.costCentre.findFirst({ where: { id, tenantId } });
  }

  async findByCode(code: string, tenantId: string): Promise<CostCentre | null> {
    return this.prisma.costCentre.findFirst({
      where: { code: { equals: code, mode: 'insensitive' }, tenantId },
    });
  }

  async findByName(name: string, tenantId: string, legalEntityId: string): Promise<CostCentre | null> {
    return this.prisma.costCentre.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, tenantId, legalEntityId },
    });
  }

  async findMany(
    query: ListCostCentresDto,
    tenantId: string,
  ): Promise<{ data: CostCentre[]; total: number }> {
    const { skip, take } = toPrismaSkipTake(query);

    const statusFilter = query.status !== undefined ? query.status : 'ACTIVE';

    const where: Prisma.CostCentreWhereInput = {
      tenantId,
      status: statusFilter,
      ...(query.legalEntityId ? { legalEntityId: query.legalEntityId } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const orderBy: Prisma.CostCentreOrderByWithRelationInput =
      query.sortBy === 'name'
        ? { name: query.sortOrder ?? 'asc' }
        : { createdAt: query.sortOrder ?? 'desc' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.costCentre.findMany({ where, skip, take, orderBy }),
      this.prisma.costCentre.count({ where }),
    ]);

    return { data, total };
  }

  async create(data: Prisma.CostCentreCreateInput): Promise<CostCentre> {
    return this.prisma.costCentre.create({ data });
  }

  async update(
    id: string,
    tenantId: string,
    data: Prisma.CostCentreUpdateInput,
    expectedVersion?: bigint,
  ): Promise<CostCentre> {
    return this.prisma.costCentre.update({
      where: {
        id,
        tenantId,
        ...(expectedVersion !== undefined ? { rowVersion: expectedVersion } : {}),
      },
      data: { ...data, rowVersion: { increment: 1 } },
    });
  }
}
