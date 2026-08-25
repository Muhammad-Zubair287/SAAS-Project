import { Injectable } from '@nestjs/common';
import { type Prisma, type AttendanceDeviceHeartbeat } from '@prisma/client';
import { BaseRepository } from '../../../database/base/base.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { toPrismaSkipTake } from '../../../common/utils/pagination.helper';

export interface FindManyHeartbeatsQuery {
  page?: number;
  pageSize?: number;
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class AttendanceDeviceHeartbeatRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string, tenantId: string): Promise<AttendanceDeviceHeartbeat | null> {
    return this.prisma.attendanceDeviceHeartbeat.findFirst({
      where: { id, tenantId },
    });
  }

  async findByDeviceId(deviceId: string, tenantId: string, limit: number = 100): Promise<AttendanceDeviceHeartbeat[]> {
    return this.prisma.attendanceDeviceHeartbeat.findMany({
      where: { deviceId, tenantId },
      orderBy: { occurredAt: 'desc' },
      take: limit,
    });
  }

  async findLatestForDevice(deviceId: string, tenantId: string): Promise<AttendanceDeviceHeartbeat | null> {
    return this.prisma.attendanceDeviceHeartbeat.findFirst({
      where: { deviceId, tenantId },
      orderBy: { occurredAt: 'desc' },
    });
  }

  async create(
    tenantId: string,
    data: Omit<Prisma.AttendanceDeviceHeartbeatCreateInput, 'tenant' | 'device'> & {
      deviceId: string;
    },
  ): Promise<AttendanceDeviceHeartbeat> {
    return this.prisma.attendanceDeviceHeartbeat.create({
      data: {
        occurredAt: data.occurredAt,
        ipAddress: data.ipAddress,
        cpu: data.cpu,
        memory: data.memory,
        disk: data.disk,
        queueLength: data.queueLength,
        firmwareVersion: data.firmwareVersion,
        clockOffsetMs: data.clockOffsetMs,
        lastSyncAt: data.lastSyncAt,
        metrics: data.metrics,
        device: { connect: { id: data.deviceId } },
        tenant: { connect: { id: tenantId } },
      },
    });
  }

  async findMany(
    tenantId: string,
    query: FindManyHeartbeatsQuery,
  ): Promise<{ data: AttendanceDeviceHeartbeat[]; total: number }> {
    const { skip, take } = toPrismaSkipTake({
      page: query.page,
      pageSize: query.pageSize,
    });

    const where: Prisma.AttendanceDeviceHeartbeatWhereInput = { tenantId };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.attendanceDeviceHeartbeat.findMany({
        where,
        skip,
        take,
        orderBy: { occurredAt: query.sortOrder ?? 'desc' },
      }),
      this.prisma.attendanceDeviceHeartbeat.count({ where }),
    ]);

    return { data, total };
  }

  async countByDevice(deviceId: string, tenantId: string): Promise<number> {
    return this.prisma.attendanceDeviceHeartbeat.count({
      where: { deviceId, tenantId },
    });
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.prisma.attendanceDeviceHeartbeat.delete({
      where: { id },
    });
  }

  async deleteOldHeartbeats(tenantId: string, beforeDate: Date): Promise<number> {
    const result = await this.prisma.attendanceDeviceHeartbeat.deleteMany({
      where: {
        tenantId,
        occurredAt: { lt: beforeDate },
      },
    });
    return result.count;
  }

  async findInDateRange(
    tenantId: string,
    deviceId: string | null,
    startDate: Date,
    endDate: Date,
  ): Promise<AttendanceDeviceHeartbeat[]> {
    return this.prisma.attendanceDeviceHeartbeat.findMany({
      where: {
        tenantId,
        ...(deviceId ? { deviceId } : {}),
        occurredAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { occurredAt: 'asc' },
    });
  }
}
