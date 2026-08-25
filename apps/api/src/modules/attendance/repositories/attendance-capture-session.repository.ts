import { Injectable } from '@nestjs/common';
import { type Prisma, type AttendanceCaptureSession } from '@prisma/client';
import { BaseRepository } from '../../../database/base/base.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { toPrismaSkipTake } from '../../../common/utils/pagination.helper';

export interface FindManySessionsQuery {
  page?: number;
  pageSize?: number;
  status?: string;
  deviceId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class AttendanceCaptureSessionRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string, tenantId: string): Promise<AttendanceCaptureSession | null> {
    return this.prisma.attendanceCaptureSession.findFirst({
      where: { id, tenantId },
    });
  }

  async findByDeviceId(deviceId: string, tenantId: string): Promise<AttendanceCaptureSession[]> {
    return this.prisma.attendanceCaptureSession.findMany({
      where: { deviceId, tenantId },
      orderBy: { startedAt: 'desc' },
    });
  }

  async findActiveSessions(tenantId: string): Promise<AttendanceCaptureSession[]> {
    return this.prisma.attendanceCaptureSession.findMany({
      where: {
        tenantId,
        endedAt: null,
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  async create(
    tenantId: string,
    data: Omit<Prisma.AttendanceCaptureSessionCreateInput, 'tenant'>,
  ): Promise<AttendanceCaptureSession> {
    return this.prisma.attendanceCaptureSession.create({
      data: {
        ...data,
        tenant: { connect: { id: tenantId } },
      },
    });
  }

  async update(id: string, tenantId: string, data: Prisma.AttendanceCaptureSessionUpdateInput): Promise<AttendanceCaptureSession> {
    return this.prisma.attendanceCaptureSession.update({
      where: { id },
      data,
    });
  }

  async endSession(id: string, tenantId: string): Promise<AttendanceCaptureSession> {
    return this.prisma.attendanceCaptureSession.update({
      where: { id },
      data: { endedAt: new Date() },
    });
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.prisma.attendanceCaptureSession.delete({
      where: { id },
    });
  }

  async findMany(
    tenantId: string,
    query: FindManySessionsQuery,
  ): Promise<{ data: AttendanceCaptureSession[]; total: number }> {
    const { skip, take } = toPrismaSkipTake({
      page: query.page,
      pageSize: query.pageSize,
    });

    const where: Prisma.AttendanceCaptureSessionWhereInput = {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.deviceId ? { deviceId: query.deviceId } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            startedAt: {
              ...(query.dateFrom ? { gte: query.dateFrom } : {}),
              ...(query.dateTo ? { lte: query.dateTo } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.attendanceCaptureSession.findMany({
        where,
        skip,
        take,
        orderBy: { startedAt: query.sortOrder ?? 'desc' },
      }),
      this.prisma.attendanceCaptureSession.count({ where }),
    ]);

    return { data, total };
  }

  async countByTenant(tenantId: string): Promise<number> {
    return this.prisma.attendanceCaptureSession.count({ where: { tenantId } });
  }

  async existsById(id: string, tenantId: string): Promise<boolean> {
    const count = await this.prisma.attendanceCaptureSession.count({
      where: { id, tenantId },
    });
    return count > 0;
  }
}
