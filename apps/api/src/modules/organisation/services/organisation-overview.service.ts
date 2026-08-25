import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { createPaginatedResponse } from '../../../common/utils/response.helper';
import { toPrismaSkipTake } from '../../../common/utils/pagination.helper';
import type { PaginationDto } from '../../../common/dto/pagination.dto';

export type DepartmentTreeNode = {
  id: string;
  name: string;
  code: string;
  status: string;
  parentId: string | null;
  legalEntityId: string;
  children: DepartmentTreeNode[];
};

@Injectable()
export class OrganisationOverviewService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(tenantId: string) {
    const [
      legalEntities,
      branches,
      departments,
      positions,
      grades,
      activeEmployees,
      unassignedEmployees,
    ] = await Promise.all([
      this.prisma.legalEntity.count({ where: { tenantId, status: 'ACTIVE' } }),
      this.prisma.branch.count({ where: { tenantId, status: 'ACTIVE' } }),
      this.prisma.department.count({ where: { tenantId, status: 'ACTIVE' } }),
      this.prisma.position.count({ where: { tenantId, status: 'ACTIVE' } }),
      this.prisma.grade.count({ where: { tenantId, status: 'ACTIVE' } }),
      this.prisma.employee.count({
        where: { tenantId, status: { in: ['ACTIVE', 'PROBATION', 'ON_LEAVE'] } },
      }),
      this.prisma.employee.count({
        where: {
          tenantId,
          status: { in: ['ACTIVE', 'PROBATION'] },
          OR: [{ departmentId: null }, { positionId: null }, { managerId: null }],
        },
      }),
    ]);

    const incomplete =
      legalEntities === 0 || departments === 0 || positions === 0;

    return {
      counts: {
        legalEntities,
        branches,
        departments,
        positions,
        grades,
        activeEmployees,
        unassignedEmployees,
      },
      incompleteStructure: incomplete,
      generatedAt: new Date().toISOString(),
    };
  }

  async getHistory(tenantId: string, query: PaginationDto) {
    const { skip, take } = toPrismaSkipTake(query);
    const where = { tenantId };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.organisationChangeEvent.findMany({
        where,
        skip,
        take,
        orderBy: { effectiveDate: 'desc' },
      }),
      this.prisma.organisationChangeEvent.count({ where }),
    ]);
    return createPaginatedResponse(
      data.map((e) => ({
        id: e.id,
        entityType: e.entityType,
        entityId: e.entityId,
        changeType: e.changeType,
        previousValue: e.previousValue,
        newValue: e.newValue,
        effectiveDate: e.effectiveDate.toISOString().split('T')[0],
        changedBy: e.changedBy,
        createdAt: e.createdAt.toISOString(),
      })),
      total,
      query.page ?? 1,
      query.pageSize ?? 20,
    );
  }

  async getDepartmentTree(tenantId: string, legalEntityId?: string): Promise<DepartmentTreeNode[]> {
    const departments = await this.prisma.department.findMany({
      where: {
        tenantId,
        ...(legalEntityId ? { legalEntityId } : {}),
      },
      orderBy: { name: 'asc' },
    });

    const map = new Map<string, DepartmentTreeNode>();
    for (const d of departments) {
      map.set(d.id, {
        id: d.id,
        name: d.name,
        code: d.code,
        status: d.status,
        parentId: d.parentId,
        legalEntityId: d.legalEntityId,
        children: [],
      });
    }
    const roots: DepartmentTreeNode[] = [];
    for (const node of map.values()) {
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }
}
