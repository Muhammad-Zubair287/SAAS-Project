import { Injectable } from '@nestjs/common';
import { type Prisma, type AttendanceDevice, DeviceStatus } from '@prisma/client';
import { BaseRepository } from '../../../database/base/base.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { toPrismaSkipTake } from '../../../common/utils/pagination.helper';

export interface FindManyDevicesQuery {
  page?: number;
  pageSize?: number;
  status?: DeviceStatus;
  search?: string;
  sortBy?: 'name' | 'createdAt' | 'lastSeenAt';
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class AttendanceDeviceRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string, tenantId: string): Promise<AttendanceDevice | null> {
    return this.prisma.attendanceDevice.findFirst({
      where: { id, tenantId },
    });
  }

  async findBySerialNumber(serialNumber: string, tenantId: string): Promise<AttendanceDevice | null> {
    return this.prisma.attendanceDevice.findFirst({
      where: { serialNumber, tenantId },
    });
  }

  async create(
    tenantId: string,
    data: Omit<Prisma.AttendanceDeviceCreateInput, 'tenant'>,
  ): Promise<AttendanceDevice> {
    return this.prisma.attendanceDevice.create({
      data: {
        ...data,
        tenant: { connect: { id: tenantId } },
      },
    });
  }

  async update(id: string, tenantId: string, data: Prisma.AttendanceDeviceUpdateInput): Promise<AttendanceDevice> {
    return this.prisma.attendanceDevice.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.prisma.attendanceDevice.delete({
      where: { id },
    });
  }

  async findMany(
    tenantId: string,
    query: FindManyDevicesQuery,
  ): Promise<{ data: AttendanceDevice[]; total: number }> {
    const { skip, take } = toPrismaSkipTake({
      page: query.page,
      pageSize: query.pageSize,
    });

    const where: Prisma.AttendanceDeviceWhereInput = {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { vendor: { contains: query.search, mode: 'insensitive' } },
              { model: { contains: query.search, mode: 'insensitive' } },
              { serialNumber: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.attendanceDevice.findMany({
        where,
        skip,
        take,
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc' },
      }),
      this.prisma.attendanceDevice.count({ where }),
    ]);

    return { data, total };
  }

  async countByTenant(tenantId: string): Promise<number> {
    return this.prisma.attendanceDevice.count({ where: { tenantId } });
  }

  async existsById(id: string, tenantId: string): Promise<boolean> {
    const count = await this.prisma.attendanceDevice.count({
      where: { id, tenantId },
    });
    return count > 0;
  }

  async updateLastSeen(id: string, tenantId: string): Promise<void> {
    // Persistence only — do not mutate lifecycle status here.
    await this.prisma.attendanceDevice.update({
      where: { id, tenantId },
      data: { lastSeenAt: new Date() },
    });
  }

  async bulkUpdateStatus(ids: string[], tenantId: string, status: DeviceStatus): Promise<number> {
    const result = await this.prisma.attendanceDevice.updateMany({
      where: { id: { in: ids }, tenantId },
      data: { status },
    });
    return result.count;
  }
}
