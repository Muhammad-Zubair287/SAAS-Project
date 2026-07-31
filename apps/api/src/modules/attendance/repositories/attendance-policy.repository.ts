import { Injectable } from '@nestjs/common';
import { type Prisma, type AttendancePolicy } from '@prisma/client';
import { BaseRepository } from '../../../database/base/base.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';
import type { ListAttendancePoliciesDto } from '../dto/list-attendance-policies.dto';
import { toPrismaSkipTake } from '../../../common/utils/pagination.helper';

@Injectable()
export class AttendancePolicyRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string, tenantId: string): Promise<AttendancePolicy | null> {
    return this.prisma.attendancePolicy.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
  }

  async findMany(
    query: ListAttendancePoliciesDto,
    tenantId: string,
  ): Promise<{ data: AttendancePolicy[]; total: number }> {
    const { skip, take } = toPrismaSkipTake({
      page: query.page,
      pageSize: query.limit,
    });

    const where: Prisma.AttendancePolicyWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.legalEntityId !== undefined ? { legalEntityId: query.legalEntityId } : {}),
      ...(query.branchId !== undefined ? { branchId: query.branchId } : {}),
      ...(query.isCurrentOnly ? { isCurrent: true } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.attendancePolicy.findMany({
        where,
        skip,
        take,
        orderBy: { effectiveFrom: query.sortOrder ?? 'desc' },
      }),
      this.prisma.attendancePolicy.count({ where }),
    ]);

    return { data, total };
  }

  // Resolve: find the most-specific current policy effective on a given date
  async resolveForContext(
    tenantId: string,
    date: Date,
    branchId: string | null,
    legalEntityId: string | null,
  ): Promise<AttendancePolicy | null> {
    const dateOnly = new Date(date.toISOString().split('T')[0]!);

    const effectiveWhere = (extra: Prisma.AttendancePolicyWhereInput): Prisma.AttendancePolicyWhereInput => ({
      tenantId,
      isCurrent: true,
      deletedAt: null,
      effectiveFrom: { lte: dateOnly },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: dateOnly } }],
      ...extra,
    });

    // 1. Branch scope (most specific)
    if (branchId) {
      const branchPolicy = await this.prisma.attendancePolicy.findFirst({
        where: effectiveWhere({ branchId }),
        orderBy: { effectiveFrom: 'desc' },
      });
      if (branchPolicy) return branchPolicy;
    }

    // 2. Legal entity scope
    if (legalEntityId) {
      const entityPolicy = await this.prisma.attendancePolicy.findFirst({
        where: effectiveWhere({ legalEntityId, branchId: null }),
        orderBy: { effectiveFrom: 'desc' },
      });
      if (entityPolicy) return entityPolicy;
    }

    // 3. Tenant scope (least specific)
    return this.prisma.attendancePolicy.findFirst({
      where: effectiveWhere({ legalEntityId: null, branchId: null }),
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  // Check for overlapping policies in the same scope
  async findOverlapping(
    tenantId: string,
    effectiveFrom: Date,
    effectiveTo: Date | null,
    branchId: string | null,
    legalEntityId: string | null,
    excludeId?: string,
  ): Promise<AttendancePolicy[]> {
    return this.prisma.attendancePolicy.findMany({
      where: {
        tenantId,
        branchId: branchId ?? null,
        legalEntityId: legalEntityId ?? null,
        isCurrent: true,
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        AND: [
          { effectiveFrom: { lte: effectiveTo ?? new Date('9999-12-31') } },
          {
            OR: [
              { effectiveTo: null },
              { effectiveTo: { gte: effectiveFrom } },
            ],
          },
        ],
      },
    });
  }

  async create(data: Prisma.AttendancePolicyUncheckedCreateInput): Promise<AttendancePolicy> {
    return this.prisma.attendancePolicy.create({ data });
  }

  async update(
    id: string,
    tenantId: string,
    data: Prisma.AttendancePolicyUncheckedUpdateInput,
    expectedVersion?: bigint,
  ): Promise<AttendancePolicy> {
    return this.prisma.attendancePolicy.update({
      where: {
        id,
        tenantId,
        ...(expectedVersion !== undefined ? { rowVersion: expectedVersion } : {}),
      },
      data: { ...data, rowVersion: { increment: 1 }, updatedAt: new Date() },
    });
  }

  async softDelete(id: string, tenantId: string): Promise<AttendancePolicy> {
    return this.prisma.attendancePolicy.update({
      where: { id, tenantId },
      data: {
        deletedAt: new Date(),
        isCurrent: false,
        rowVersion: { increment: 1 },
        updatedAt: new Date(),
      },
    });
  }

  // Mark previous version as not current before creating a new version
  async archiveCurrentVersion(
    tenantId: string,
    branchId: string | null,
    legalEntityId: string | null,
    excludeId: string,
  ): Promise<void> {
    await this.prisma.attendancePolicy.updateMany({
      where: {
        tenantId,
        branchId: branchId ?? null,
        legalEntityId: legalEntityId ?? null,
        isCurrent: true,
        deletedAt: null,
        id: { not: excludeId },
      },
      data: { isCurrent: false, updatedAt: new Date() },
    });
  }
}
