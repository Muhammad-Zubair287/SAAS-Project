import { Injectable } from '@nestjs/common';
import { type Prisma, type AttendanceGeofence, GeofenceShape } from '@prisma/client';
import { BaseRepository } from '../../../database/base/base.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { toPrismaSkipTake } from '../../../common/utils/pagination.helper';

export interface FindManyGeofencesQuery {
  page?: number;
  pageSize?: number;
  legalEntityId?: string;
  branchId?: string;
  search?: string;
  sortBy?: 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class AttendanceGeofenceRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string, tenantId: string): Promise<AttendanceGeofence | null> {
    return this.prisma.attendanceGeofence.findFirst({
      where: { id, tenantId },
    });
  }

  async findByBranchId(branchId: string, tenantId: string): Promise<AttendanceGeofence[]> {
    return this.prisma.attendanceGeofence.findMany({
      where: { branchId, tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async findByLegalEntityId(legalEntityId: string, tenantId: string): Promise<AttendanceGeofence[]> {
    return this.prisma.attendanceGeofence.findMany({
      where: { legalEntityId, tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async create(
    tenantId: string,
    data: Omit<Prisma.AttendanceGeofenceCreateInput, 'tenant'>,
  ): Promise<AttendanceGeofence> {
    return this.prisma.attendanceGeofence.create({
      data: {
        ...data,
        tenant: { connect: { id: tenantId } },
      },
    });
  }

  async update(
    id: string,
    tenantId: string,
    data: Prisma.AttendanceGeofenceUpdateInput,
    expectedVersion?: bigint,
  ): Promise<AttendanceGeofence> {
    return this.prisma.attendanceGeofence.update({
      where: {
        id,
        tenantId,
        ...(expectedVersion !== undefined ? { rowVersion: expectedVersion } : {}),
      },
      data: {
        ...data,
        ...(expectedVersion !== undefined ? { rowVersion: { increment: 1 } } : {}),
      },
    });
  }

  async delete(id: string, tenantId: string, expectedVersion?: bigint): Promise<void> {
    await this.prisma.attendanceGeofence.delete({
      where: {
        id,
        tenantId,
        ...(expectedVersion !== undefined ? { rowVersion: expectedVersion } : {}),
      },
    });
  }

  async findMany(
    tenantId: string,
    query: FindManyGeofencesQuery,
  ): Promise<{ data: AttendanceGeofence[]; total: number }> {
    const { skip, take } = toPrismaSkipTake({
      page: query.page,
      pageSize: query.pageSize,
    });

    const where: Prisma.AttendanceGeofenceWhereInput = {
      tenantId,
      ...(query.legalEntityId !== undefined ? { legalEntityId: query.legalEntityId } : {}),
      ...(query.branchId !== undefined ? { branchId: query.branchId } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.attendanceGeofence.findMany({
        where,
        skip,
        take,
        orderBy: { [query.sortBy ?? 'name']: query.sortOrder ?? 'asc' },
      }),
      this.prisma.attendanceGeofence.count({ where }),
    ]);

    return { data, total };
  }

  async countByTenant(tenantId: string): Promise<number> {
    return this.prisma.attendanceGeofence.count({ where: { tenantId } });
  }

  async countByBranch(branchId: string, tenantId: string): Promise<number> {
    return this.prisma.attendanceGeofence.count({
      where: { branchId, tenantId },
    });
  }

  async existsById(id: string, tenantId: string): Promise<boolean> {
    const count = await this.prisma.attendanceGeofence.count({
      where: { id, tenantId },
    });
    return count > 0;
  }

  async findActiveGeofences(date: Date = new Date()): Promise<AttendanceGeofence[]> {
    return this.prisma.attendanceGeofence.findMany({
      where: {
        AND: [
          { OR: [{ activeFrom: null }, { activeFrom: { lte: date } }] },
          { OR: [{ activeTo: null }, { activeTo: { gte: date } }] },
        ],
      },
      orderBy: { name: 'asc' },
    });
  }
}
