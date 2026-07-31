import { Injectable } from '@nestjs/common';
import { type Prisma, type LegalEntity } from '@prisma/client';
import { BaseRepository } from '../../../database/base/base.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { toPrismaSkipTake } from '../../../common/utils/pagination.helper';
import type { ListLegalEntitiesDto } from '../dto/list-legal-entities.dto';

@Injectable()
export class LegalEntityRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string, tenantId: string): Promise<LegalEntity | null> {
    return this.prisma.legalEntity.findFirst({ where: { id, tenantId } });
  }

  async findByName(name: string, tenantId: string): Promise<LegalEntity | null> {
    return this.prisma.legalEntity.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, tenantId },
    });
  }

  async findMany(
    query: ListLegalEntitiesDto,
    tenantId: string,
  ): Promise<{ data: LegalEntity[]; total: number }> {
    const { skip, take } = toPrismaSkipTake(query);

    const statusFilter = query.status !== undefined ? query.status : 'ACTIVE';

    const where: Prisma.LegalEntityWhereInput = {
      tenantId,
      status: statusFilter,
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const orderBy: Prisma.LegalEntityOrderByWithRelationInput =
      query.sortBy === 'name'
        ? { name: query.sortOrder ?? 'asc' }
        : { createdAt: query.sortOrder ?? 'desc' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.legalEntity.findMany({ where, skip, take, orderBy }),
      this.prisma.legalEntity.count({ where }),
    ]);

    return { data, total };
  }

  async create(data: Prisma.LegalEntityCreateInput): Promise<LegalEntity> {
    return this.prisma.legalEntity.create({ data });
  }

  async update(
    id: string,
    tenantId: string,
    data: Prisma.LegalEntityUpdateInput,
    expectedVersion?: bigint,
  ): Promise<LegalEntity> {
    return this.prisma.legalEntity.update({
      where: {
        id,
        tenantId,
        ...(expectedVersion !== undefined ? { rowVersion: expectedVersion } : {}),
      },
      data: { ...data, rowVersion: { increment: 1 } },
    });
  }
}
