import { Injectable } from '@nestjs/common';
import { type Prisma, type Department } from '@prisma/client';
import { BaseRepository } from '../../../database/base/base.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { toPrismaSkipTake } from '../../../common/utils/pagination.helper';
import type { ListDepartmentsDto } from '../dto/list-departments.dto';

@Injectable()
export class DepartmentRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string, tenantId: string): Promise<Department | null> {
    return this.prisma.department.findFirst({ where: { id, tenantId } });
  }

  async findByCode(code: string, tenantId: string): Promise<Department | null> {
    return this.prisma.department.findFirst({
      where: { code: { equals: code, mode: 'insensitive' }, tenantId },
    });
  }

  async findByName(name: string, tenantId: string, legalEntityId: string): Promise<Department | null> {
    return this.prisma.department.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, tenantId, legalEntityId },
    });
  }

  /**
   * Walk up the hierarchy from departmentId and collect all ancestor IDs.
   * Used for cycle detection before setting a new parentId.
   */
  async findAncestorIds(departmentId: string, tenantId: string): Promise<string[]> {
    const ancestors: string[] = [];
    let currentId: string | null = departmentId;
    while (currentId) {
      const dept: { parentId: string | null } | null = await this.prisma.department.findFirst({
        where: { id: currentId, tenantId },
        select: { parentId: true },
      });
      if (!dept?.parentId) break;
      if (ancestors.includes(dept.parentId)) break; // safety: existing cycle
      ancestors.push(dept.parentId);
      currentId = dept.parentId;
    }
    return ancestors;
  }

  async findMany(
    query: ListDepartmentsDto,
    tenantId: string,
  ): Promise<{ data: Department[]; total: number }> {
    const { skip, take } = toPrismaSkipTake(query);

    const statusFilter = query.status !== undefined ? query.status : 'ACTIVE';

    const where: Prisma.DepartmentWhereInput = {
      tenantId,
      status: statusFilter,
      ...(query.legalEntityId ? { legalEntityId: query.legalEntityId } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.parentId !== undefined ? { parentId: query.parentId } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const orderBy: Prisma.DepartmentOrderByWithRelationInput =
      query.sortBy === 'name'
        ? { name: query.sortOrder ?? 'asc' }
        : { createdAt: query.sortOrder ?? 'desc' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.department.findMany({ where, skip, take, orderBy }),
      this.prisma.department.count({ where }),
    ]);

    return { data, total };
  }

  async create(data: Prisma.DepartmentCreateInput): Promise<Department> {
    return this.prisma.department.create({ data });
  }

  async update(
    id: string,
    tenantId: string,
    data: Prisma.DepartmentUpdateInput,
    expectedVersion?: bigint,
  ): Promise<Department> {
    return this.prisma.department.update({
      where: {
        id,
        tenantId,
        ...(expectedVersion !== undefined ? { rowVersion: expectedVersion } : {}),
      },
      data: { ...data, rowVersion: { increment: 1 } },
    });
  }
}
