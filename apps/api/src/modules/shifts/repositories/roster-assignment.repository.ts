import { Injectable } from '@nestjs/common';
import type { Prisma, RosterAssignment } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { toDateOnly } from '../constants/shift-assignment.constants';
import type {
  ListRosterDto,
  RosterAssignmentWithRelations,
} from '../dto/roster.dto';

const ROSTER_INCLUDE = {
  employee: { select: { displayName: true } },
  shift: {
    select: {
      name: true,
      code: true,
      startLocalTime: true,
      endLocalTime: true,
      crossesMidnight: true,
    },
  },
  branch: { select: { name: true } },
} as const;

@Injectable()
export class RosterAssignmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    tenantId: string,
    query: ListRosterDto,
  ): Promise<{ data: RosterAssignmentWithRelations[]; total: number }> {
    const page     = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where    = this.buildListWhere(tenantId, query);

    const [data, total] = await Promise.all([
      this.prisma.rosterAssignment.findMany({
        where,
        include: ROSTER_INCLUDE,
        orderBy: [{ workDate: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.rosterAssignment.count({ where }),
    ]);
    return { data, total };
  }

  async findById(
    tenantId: string,
    id: string,
  ): Promise<RosterAssignmentWithRelations | null> {
    return this.prisma.rosterAssignment.findFirst({
      where: { id, tenantId },
      include: ROSTER_INCLUDE,
    });
  }

  /** Current DRAFT tip for (tenant, employee, workDate). */
  async findDraftTip(
    tenantId: string,
    employeeId: string,
    workDate: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<RosterAssignment | null> {
    const client = tx ?? this.prisma;
    return client.rosterAssignment.findFirst({
      where: { tenantId, employeeId, workDate, isDraftTip: true },
    });
  }

  /** Current effective-published row for (tenant, employee, workDate). */
  async findEffectivePublished(
    tenantId: string,
    employeeId: string,
    workDate: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<RosterAssignment | null> {
    const client = tx ?? this.prisma;
    return client.rosterAssignment.findFirst({
      where: { tenantId, employeeId, workDate, isEffectivePublished: true },
    });
  }

  /**
   * Fetch all isDraftTip DRAFT rows in [dateFrom, dateTo] for publish scoping.
   * Optional employeeId/branchId filters narrow the scope.
   */
  async findDraftTipsForPublish(
    tenantId: string,
    dateFrom: Date,
    dateTo: Date,
    opts: {
      employeeIds?: string[];
      branchId?: string;
    } = {},
    tx?: Prisma.TransactionClient,
  ): Promise<RosterAssignment[]> {
    const client = tx ?? this.prisma;
    const where: Prisma.RosterAssignmentWhereInput = {
      tenantId,
      isDraftTip: true,
      rosterStatus: 'DRAFT',
      workDate: { gte: dateFrom, lte: dateTo },
    };
    if (opts.employeeIds?.length) where.employeeId = { in: opts.employeeIds };
    if (opts.branchId)            where.branchId   = opts.branchId;

    return client.rosterAssignment.findMany({ where });
  }

  async create(
    data: Prisma.RosterAssignmentUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<RosterAssignment> {
    const client = tx ?? this.prisma;
    return client.rosterAssignment.create({ data });
  }

  async updateWithVersion(
    tenantId: string,
    id: string,
    expectedRowVersion: bigint,
    data: Prisma.RosterAssignmentUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<RosterAssignment> {
    const client = tx ?? this.prisma;
    return client.rosterAssignment.update({
      where: { id, tenantId, rowVersion: expectedRowVersion } as Prisma.RosterAssignmentWhereUniqueInput,
      data: { ...data, rowVersion: { increment: 1 } },
    });
  }

  private buildListWhere(
    tenantId: string,
    query: ListRosterDto,
  ): Prisma.RosterAssignmentWhereInput {
    const dateFrom = toDateOnly(query.dateFrom);
    const dateTo   = toDateOnly(query.dateTo);

    const where: Prisma.RosterAssignmentWhereInput = {
      tenantId,
      workDate: { gte: dateFrom, lte: dateTo },
    };

    if (!query.includeHistory) {
      where.OR = [{ isDraftTip: true }, { isEffectivePublished: true }];
    }

    if (query.employeeIds?.length) {
      where.employeeId = { in: query.employeeIds };
    } else if (query.employeeId) {
      where.employeeId = query.employeeId;
    }

    if (query.rosterStatus) where.rosterStatus = query.rosterStatus;

    // Calendar filters use CURRENT employee membership (not assignment sourceReferenceId).
    const employeeFilter: Prisma.EmployeeWhereInput = {};
    if (query.departmentId) employeeFilter.departmentId = query.departmentId;
    if (query.branchId) employeeFilter.branchId = query.branchId;
    if (Object.keys(employeeFilter).length > 0) {
      where.employee = employeeFilter;
    }

    return where;
  }
}
