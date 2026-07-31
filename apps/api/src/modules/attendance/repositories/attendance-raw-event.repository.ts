import { Injectable } from '@nestjs/common';
import { type Prisma, type AttendanceRawEvent } from '@prisma/client';
import { BaseRepository } from '../../../database/base/base.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { toPrismaSkipTake } from '../../../common/utils/pagination.helper';
import type { ListAttendanceDto } from '../dto/list-attendance.dto';

@Injectable()
export class AttendanceRawEventRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string, tenantId: string): Promise<AttendanceRawEvent | null> {
    return this.prisma.attendanceRawEvent.findFirst({ where: { id, tenantId } });
  }

  async findByIdempotencyKey(key: string): Promise<AttendanceRawEvent | null> {
    return this.prisma.attendanceRawEvent.findFirst({ where: { idempotencyKey: key } });
  }

  async findByEmployeeAndDate(
    employeeId: string,
    date: Date,
    tenantId: string,
  ): Promise<AttendanceRawEvent[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.attendanceRawEvent.findMany({
      where: {
        tenantId,
        employeeId,
        eventTime: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { eventTime: 'asc' },
    });
  }

  async create(data: Prisma.AttendanceRawEventCreateInput): Promise<AttendanceRawEvent> {
    return this.prisma.attendanceRawEvent.create({ data });
  }

  async markProcessed(id: string, tenantId: string): Promise<void> {
    await this.prisma.attendanceRawEvent.updateMany({
      where: { id, tenantId },
      data: { status: 'PROCESSED', processedAt: new Date() },
    });
  }

  async markError(id: string, tenantId: string, errorDetail: string): Promise<void> {
    await this.prisma.attendanceRawEvent.updateMany({
      where: { id, tenantId },
      data: { status: 'ERROR', errorDetail, processedAt: new Date() },
    });
  }

  async findMany(
    query: ListAttendanceDto,
    tenantId: string,
  ): Promise<{ data: AttendanceRawEvent[]; total: number }> {
    const { skip, take } = toPrismaSkipTake(query);

    const where: Prisma.AttendanceRawEventWhereInput = {
      tenantId,
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            eventTime: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.attendanceRawEvent.findMany({
        where,
        skip,
        take,
        orderBy: { eventTime: query.sortOrder ?? 'desc' },
      }),
      this.prisma.attendanceRawEvent.count({ where }),
    ]);

    return { data, total };
  }
}
