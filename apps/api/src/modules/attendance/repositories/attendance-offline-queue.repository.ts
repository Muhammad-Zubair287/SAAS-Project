import { Injectable } from '@nestjs/common';
import { type Prisma, type AttendanceOfflineQueue } from '@prisma/client';
import { BaseRepository } from '../../../database/base/base.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { toPrismaSkipTake } from '../../../common/utils/pagination.helper';

export interface FindManyQueueQuery {
  page?: number;
  pageSize?: number;
  status?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class AttendanceOfflineQueueRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string, tenantId: string): Promise<AttendanceOfflineQueue | null> {
    return this.prisma.attendanceOfflineQueue.findFirst({
      where: { id, tenantId },
    });
  }

  async findBySessionId(sessionId: string, tenantId: string): Promise<AttendanceOfflineQueue[]> {
    return this.prisma.attendanceOfflineQueue.findMany({
      where: { sessionId, tenantId },
      orderBy: { sequenceNumber: 'asc' },
    });
  }

  async create(
    tenantId: string,
    data: Omit<Prisma.AttendanceOfflineQueueCreateInput, 'tenant'>,
  ): Promise<AttendanceOfflineQueue> {
    return this.prisma.attendanceOfflineQueue.create({
      data: {
        ...data,
        tenant: { connect: { id: tenantId } },
      },
    });
  }

  async update(id: string, tenantId: string, data: Prisma.AttendanceOfflineQueueUpdateInput): Promise<AttendanceOfflineQueue> {
    return this.prisma.attendanceOfflineQueue.update({
      where: { id },
      data,
    });
  }

  async markReplayed(id: string, tenantId: string): Promise<AttendanceOfflineQueue> {
    return this.prisma.attendanceOfflineQueue.update({
      where: { id },
      data: {
        status: 'replayed',
        replayedAt: new Date(),
      },
    });
  }

  async incrementAttempts(id: string, tenantId: string): Promise<AttendanceOfflineQueue> {
    return this.prisma.attendanceOfflineQueue.update({
      where: { id },
      data: {
        attempts: { increment: 1 },
      },
    });
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.prisma.attendanceOfflineQueue.delete({
      where: { id },
    });
  }

  async findMany(
    tenantId: string,
    query: FindManyQueueQuery,
  ): Promise<{ data: AttendanceOfflineQueue[]; total: number }> {
    const { skip, take } = toPrismaSkipTake({
      page: query.page,
      pageSize: query.pageSize,
    });

    const where: Prisma.AttendanceOfflineQueueWhereInput = {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.attendanceOfflineQueue.findMany({
        where,
        skip,
        take,
        orderBy: { uploadedAt: query.sortOrder ?? 'asc' },
      }),
      this.prisma.attendanceOfflineQueue.count({ where }),
    ]);

    return { data, total };
  }

  async findPending(tenantId: string, limit: number = 100): Promise<AttendanceOfflineQueue[]> {
    return this.prisma.attendanceOfflineQueue.findMany({
      where: {
        tenantId,
        status: 'pending',
      },
      orderBy: { uploadedAt: 'asc' },
      take: limit,
    });
  }

  async countByStatus(tenantId: string, status: string): Promise<number> {
    return this.prisma.attendanceOfflineQueue.count({
      where: { tenantId, status },
    });
  }

  async countByTenant(tenantId: string): Promise<number> {
    return this.prisma.attendanceOfflineQueue.count({ where: { tenantId } });
  }

  async existsById(id: string, tenantId: string): Promise<boolean> {
    const count = await this.prisma.attendanceOfflineQueue.count({
      where: { id, tenantId },
    });
    return count > 0;
  }

  async deleteReplayed(tenantId: string, beforeDate: Date): Promise<number> {
    const result = await this.prisma.attendanceOfflineQueue.deleteMany({
      where: {
        tenantId,
        status: 'replayed',
        replayedAt: { lt: beforeDate },
      },
    });
    return result.count;
  }
}
