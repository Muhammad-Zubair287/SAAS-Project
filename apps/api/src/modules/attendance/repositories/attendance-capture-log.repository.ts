import { Injectable } from '@nestjs/common';
import { type Prisma, type AttendanceCaptureLog } from '@prisma/client';
import { BaseRepository } from '../../../database/base/base.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { toPrismaSkipTake } from '../../../common/utils/pagination.helper';

export interface FindManyLogsQuery {
  page?: number;
  pageSize?: number;
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class AttendanceCaptureLogRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string, tenantId: string): Promise<AttendanceCaptureLog | null> {
    return this.prisma.attendanceCaptureLog.findFirst({
      where: { id, tenantId },
    });
  }

  async findByDeviceEventId(deviceEventId: string, tenantId: string): Promise<AttendanceCaptureLog[]> {
    return this.prisma.attendanceCaptureLog.findMany({
      where: { deviceEventId, tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    tenantId: string,
    data: Omit<Prisma.AttendanceCaptureLogCreateInput, 'tenant'>,
  ): Promise<AttendanceCaptureLog> {
    return this.prisma.attendanceCaptureLog.create({
      data: {
        ...data,
        tenant: { connect: { id: tenantId } },
      },
    });
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.prisma.attendanceCaptureLog.delete({
      where: { id },
    });
  }

  async findMany(
    tenantId: string,
    query: FindManyLogsQuery,
  ): Promise<{ data: AttendanceCaptureLog[]; total: number }> {
    const { skip, take } = toPrismaSkipTake({
      page: query.page,
      pageSize: query.pageSize,
    });

    const where: Prisma.AttendanceCaptureLogWhereInput = { tenantId };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.attendanceCaptureLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: query.sortOrder ?? 'desc' },
      }),
      this.prisma.attendanceCaptureLog.count({ where }),
    ]);

    return { data, total };
  }

  async countByTenant(tenantId: string): Promise<number> {
    return this.prisma.attendanceCaptureLog.count({ where: { tenantId } });
  }

  async countByDeviceEvent(deviceEventId: string, tenantId: string): Promise<number> {
    return this.prisma.attendanceCaptureLog.count({
      where: { deviceEventId, tenantId },
    });
  }

  async existsById(id: string, tenantId: string): Promise<boolean> {
    const count = await this.prisma.attendanceCaptureLog.count({
      where: { id, tenantId },
    });
    return count > 0;
  }

  async findInDateRange(tenantId: string, startDate: Date, endDate: Date): Promise<AttendanceCaptureLog[]> {
    return this.prisma.attendanceCaptureLog.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async deleteOldLogs(tenantId: string, beforeDate: Date): Promise<number> {
    const result = await this.prisma.attendanceCaptureLog.deleteMany({
      where: {
        tenantId,
        createdAt: { lt: beforeDate },
      },
    });
    return result.count;
  }
}
