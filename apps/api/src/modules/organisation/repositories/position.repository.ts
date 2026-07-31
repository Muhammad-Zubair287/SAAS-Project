import { Injectable } from '@nestjs/common';
import { type Prisma, type Position } from '@prisma/client';
import { BaseRepository } from '../../../database/base/base.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { toPrismaSkipTake } from '../../../common/utils/pagination.helper';
import type { ListPositionsDto } from '../dto/list-positions.dto';

@Injectable()
export class PositionRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string, tenantId: string): Promise<Position | null> {
    return this.prisma.position.findFirst({ where: { id, tenantId } });
  }

  async findByCode(code: string, tenantId: string): Promise<Position | null> {
    return this.prisma.position.findFirst({
      where: { code: { equals: code, mode: 'insensitive' }, tenantId },
    });
  }

  async findByTitle(title: string, tenantId: string, legalEntityId: string): Promise<Position | null> {
    return this.prisma.position.findFirst({
      where: { title: { equals: title, mode: 'insensitive' }, tenantId, legalEntityId },
    });
  }

  async findMany(
    query: ListPositionsDto,
    tenantId: string,
  ): Promise<{ data: Position[]; total: number }> {
    const { skip, take } = toPrismaSkipTake(query);

    const statusFilter = query.status !== undefined ? query.status : 'ACTIVE';

    const where: Prisma.PositionWhereInput = {
      tenantId,
      status: statusFilter,
      ...(query.legalEntityId ? { legalEntityId: query.legalEntityId } : {}),
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.search ? { title: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const orderBy: Prisma.PositionOrderByWithRelationInput =
      query.sortBy === 'title'
        ? { title: query.sortOrder ?? 'asc' }
        : { createdAt: query.sortOrder ?? 'desc' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.position.findMany({ where, skip, take, orderBy }),
      this.prisma.position.count({ where }),
    ]);

    return { data, total };
  }

  async create(data: Prisma.PositionCreateInput): Promise<Position> {
    return this.prisma.position.create({ data });
  }

  async update(
    id: string,
    tenantId: string,
    data: Prisma.PositionUpdateInput,
    expectedVersion?: bigint,
  ): Promise<Position> {
    return this.prisma.position.update({
      where: {
        id,
        tenantId,
        ...(expectedVersion !== undefined ? { rowVersion: expectedVersion } : {}),
      },
      data: { ...data, rowVersion: { increment: 1 } },
    });
  }
}
