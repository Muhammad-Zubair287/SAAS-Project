import { Injectable } from '@nestjs/common';
import { type Prisma, type AttendanceMobileDevice } from '@prisma/client';
import { BaseRepository } from '../../../database/base/base.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { toPrismaSkipTake } from '../../../common/utils/pagination.helper';

export interface FindManyMobileDevicesQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: 'deviceIdentifier' | 'createdAt' | 'lastSeenAt';
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class AttendanceMobileDeviceRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string, tenantId: string): Promise<AttendanceMobileDevice | null> {
    return this.prisma.attendanceMobileDevice.findFirst({
      where: { id, tenantId },
    });
  }

  async findByDeviceIdentifier(deviceIdentifier: string, tenantId: string): Promise<AttendanceMobileDevice | null> {
    return this.prisma.attendanceMobileDevice.findFirst({
      where: { deviceIdentifier, tenantId },
    });
  }

  async findByUserId(userId: string, tenantId: string): Promise<AttendanceMobileDevice[]> {
    return this.prisma.attendanceMobileDevice.findMany({
      where: { userId, tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    tenantId: string,
    data: Omit<Prisma.AttendanceMobileDeviceCreateInput, 'tenant'>,
  ): Promise<AttendanceMobileDevice> {
    return this.prisma.attendanceMobileDevice.create({
      data: {
        ...data,
        tenant: { connect: { id: tenantId } },
      },
    });
  }

  async update(id: string, tenantId: string, data: Prisma.AttendanceMobileDeviceUpdateInput): Promise<AttendanceMobileDevice> {
    return this.prisma.attendanceMobileDevice.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.prisma.attendanceMobileDevice.delete({
      where: { id },
    });
  }

  async updateLastSeen(id: string, tenantId: string): Promise<AttendanceMobileDevice> {
    return this.prisma.attendanceMobileDevice.update({
      where: { id },
      data: { lastSeenAt: new Date() },
    });
  }

  async findMany(
    tenantId: string,
    query: FindManyMobileDevicesQuery,
  ): Promise<{ data: AttendanceMobileDevice[]; total: number }> {
    const { skip, take } = toPrismaSkipTake({
      page: query.page,
      pageSize: query.pageSize,
    });

    const where: Prisma.AttendanceMobileDeviceWhereInput = {
      tenantId,
      ...(query.search
        ? {
            OR: [{ deviceIdentifier: { contains: query.search, mode: 'insensitive' } }],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.attendanceMobileDevice.findMany({
        where,
        skip,
        take,
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc' },
      }),
      this.prisma.attendanceMobileDevice.count({ where }),
    ]);

    return { data, total };
  }

  async countByTenant(tenantId: string): Promise<number> {
    return this.prisma.attendanceMobileDevice.count({ where: { tenantId } });
  }

  async countByUser(userId: string, tenantId: string): Promise<number> {
    return this.prisma.attendanceMobileDevice.count({
      where: { userId, tenantId },
    });
  }

  async existsById(id: string, tenantId: string): Promise<boolean> {
    const count = await this.prisma.attendanceMobileDevice.count({
      where: { id, tenantId },
    });
    return count > 0;
  }
}
