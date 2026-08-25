import { Injectable } from '@nestjs/common';
import type { Prisma, ShiftAssignment } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import type {
  ListShiftAssignmentsDto,
  ShiftAssignmentWithRelations,
} from '../dto/shift-assignment.dto';
import { toDateOnly } from '../constants/shift-assignment.constants';

const ASSIGNMENT_INCLUDE = {
  employee: { select: { displayName: true } },
  shift: { select: { name: true, code: true } },
  branch: { select: { name: true } },
} as const;

@Injectable()
export class ShiftAssignmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    tenantId: string,
    query: ListShiftAssignmentsDto,
  ): Promise<{ data: ShiftAssignmentWithRelations[]; total: number }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.buildWhere(tenantId, query);

    const [data, total] = await Promise.all([
      this.prisma.shiftAssignment.findMany({
        where,
        include: ASSIGNMENT_INCLUDE,
        orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.shiftAssignment.count({ where }),
    ]);
    return { data, total };
  }

  async findById(
    tenantId: string,
    id: string,
  ): Promise<ShiftAssignmentWithRelations | null> {
    return this.prisma.shiftAssignment.findFirst({
      where: { id, tenantId },
      include: ASSIGNMENT_INCLUDE,
    });
  }

  async findEffectiveForEmployee(
    tenantId: string,
    employeeId: string,
    asOf: Date,
  ): Promise<ShiftAssignment | null> {
    const rows = await this.prisma.shiftAssignment.findMany({
      where: {
        tenantId,
        employeeId,
        effectiveFrom: { lte: asOf },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: asOf } }],
      },
      orderBy: { effectiveFrom: 'desc' },
      take: 20,
    });
    // Prefer non-empty ranges (effectiveTo null or > effectiveFrom)
    return (
      rows.find(
        (r) => r.effectiveTo === null || r.effectiveTo > r.effectiveFrom,
      ) ?? null
    );
  }

  /**
   * Candidate overlaps for an employee in [from, to).
   * Service applies precise exclusive-end overlap math.
   * Includes open-ended and bounded neighbors; empty ranges (to <= from) excluded in SQL via filter.
   */
  async findOverlapCandidates(
    tenantId: string,
    employeeId: string,
    effectiveFrom: Date,
    effectiveTo: Date | null,
    excludeId?: string,
  ): Promise<ShiftAssignment[]> {
    // Broad fetch: any row that could overlap. Narrow in service with rangesOverlap.
    const or: Prisma.ShiftAssignmentWhereInput[] = [
      { effectiveTo: null },
      { effectiveTo: { gt: effectiveFrom } },
    ];
    if (effectiveTo) {
      or.push({ effectiveFrom: { lt: effectiveTo } });
    }

    return this.prisma.shiftAssignment.findMany({
      where: {
        tenantId,
        employeeId,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        OR: or,
      },
      orderBy: { effectiveFrom: 'asc' },
    });
  }

  async create(
    data: Prisma.ShiftAssignmentUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<ShiftAssignment> {
    const client = tx ?? this.prisma;
    return client.shiftAssignment.create({ data });
  }

  async createMany(
    data: Prisma.ShiftAssignmentUncheckedCreateInput[],
    tx?: Prisma.TransactionClient,
  ): Promise<ShiftAssignment[]> {
    const client = tx ?? this.prisma;
    const created: ShiftAssignment[] = [];
    for (const row of data) {
      created.push(await client.shiftAssignment.create({ data: row }));
    }
    return created;
  }

  async updateWithVersion(
    tenantId: string,
    id: string,
    expectedRowVersion: bigint,
    data: Prisma.ShiftAssignmentUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<ShiftAssignment> {
    const client = tx ?? this.prisma;
    return client.shiftAssignment.update({
      where: {
        id,
        tenantId,
        rowVersion: expectedRowVersion,
      } as Prisma.ShiftAssignmentWhereUniqueInput,
      data: {
        ...data,
        rowVersion: { increment: 1 },
      },
    });
  }

  async countActiveByShiftIds(
    tenantId: string,
    shiftIds: string[],
    asOf: Date,
  ): Promise<Map<string, number>> {
    if (shiftIds.length === 0) return new Map();
    const rows = await this.prisma.shiftAssignment.groupBy({
      by: ['shiftId'],
      where: {
        tenantId,
        shiftId: { in: shiftIds },
        effectiveFrom: { lte: asOf },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: asOf } }],
      },
      _count: { _all: true },
    });
    return new Map(rows.map((r) => [r.shiftId, r._count._all]));
  }

  private buildWhere(
    tenantId: string,
    query: ListShiftAssignmentsDto,
  ): Prisma.ShiftAssignmentWhereInput {
    const where: Prisma.ShiftAssignmentWhereInput = { tenantId };
    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.shiftId) where.shiftId = query.shiftId;
    if (query.departmentId) {
      where.assignmentSource = 'DEPARTMENT';
      where.sourceReferenceId = query.departmentId;
    }
    if (query.asOf) {
      const asOf = toDateOnly(query.asOf);
      where.effectiveFrom = { lte: asOf };
      where.OR = [{ effectiveTo: null }, { effectiveTo: { gt: asOf } }];
    }
    return where;
  }
}
