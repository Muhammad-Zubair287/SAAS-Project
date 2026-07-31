import { Injectable } from '@nestjs/common';
import { type Prisma, type Branch } from '@prisma/client';
import { BaseRepository } from '../../../database/base/base.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { toPrismaSkipTake } from '../../../common/utils/pagination.helper';
import type { ListBranchesDto } from '../dto/list-branches.dto';

@Injectable()
export class BranchRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string, tenantId: string): Promise<Branch | null> {
    return this.prisma.branch.findFirst({ where: { id, tenantId } });
  }

  async findByName(name: string, tenantId: string, legalEntityId: string): Promise<Branch | null> {
    return this.prisma.branch.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, tenantId, legalEntityId },
    });
  }

  async findByCode(code: string, tenantId: string): Promise<Branch | null> {
    return this.prisma.branch.findFirst({
      where: { code: { equals: code, mode: 'insensitive' }, tenantId },
    });
  }

  async findMany(
    query: ListBranchesDto,
    tenantId: string,
  ): Promise<{ data: Branch[]; total: number }> {
    const { skip, take } = toPrismaSkipTake(query);

    const statusFilter = query.status !== undefined ? query.status : 'ACTIVE';

    const where: Prisma.BranchWhereInput = {
      tenantId,
      status: statusFilter,
      ...(query.legalEntityId ? { legalEntityId: query.legalEntityId } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const orderBy: Prisma.BranchOrderByWithRelationInput =
      query.sortBy === 'name'
        ? { name: query.sortOrder ?? 'asc' }
        : { createdAt: query.sortOrder ?? 'desc' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.branch.findMany({ where, skip, take, orderBy }),
      this.prisma.branch.count({ where }),
    ]);

    return { data, total };
  }

  async create(data: Prisma.BranchCreateInput): Promise<Branch> {
    return this.prisma.branch.create({ data });
  }

  async update(
    id: string,
    tenantId: string,
    data: Prisma.BranchUpdateInput,
    expectedVersion?: bigint,
  ): Promise<Branch> {
    return this.prisma.branch.update({
      where: {
        id,
        tenantId,
        ...(expectedVersion !== undefined ? { rowVersion: expectedVersion } : {}),
      },
      data: { ...data, rowVersion: { increment: 1 } },
    });
  }
}
