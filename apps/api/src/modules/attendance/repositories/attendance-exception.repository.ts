import { Injectable } from '@nestjs/common';
import { type Prisma, type AttendanceException } from '@prisma/client';
import { BaseRepository } from '../../../database/base/base.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { toPrismaSkipTake } from '../../../common/utils/pagination.helper';
import type { ListAttendanceDto } from '../dto/list-attendance.dto';

@Injectable()
export class AttendanceExceptionRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string, tenantId: string): Promise<AttendanceException | null> {
    return this.prisma.attendanceException.findFirst({ where: { id, tenantId } });
  }

  async findByRecordId(
    recordId: string,
    tenantId: string,
  ): Promise<AttendanceException[]> {
    return this.prisma.attendanceException.findMany({
      where: { tenantId, attendanceRecordId: recordId },
    });
  }

  async create(
    data: Prisma.AttendanceExceptionUncheckedCreateInput,
  ): Promise<AttendanceException> {
    return this.prisma.attendanceException.create({ data });
  }

  async createMany(
    data: Prisma.AttendanceExceptionCreateManyInput[],
  ): Promise<Prisma.BatchPayload> {
    return this.prisma.attendanceException.createMany({ data });
  }

  async deleteByRecordId(recordId: string, tenantId: string): Promise<void> {
    await this.prisma.attendanceException.deleteMany({
      where: { tenantId, attendanceRecordId: recordId },
    });
  }

  async update(
    id: string,
    tenantId: string,
    data: Prisma.AttendanceExceptionUncheckedUpdateInput,
  ): Promise<void> {
    await this.prisma.attendanceException.updateMany({
      where: { id, tenantId },
      data,
    });
  }

  async findMany(
    query: ListAttendanceDto,
    tenantId: string,
  ): Promise<{ data: AttendanceException[]; total: number }> {
    const { skip, take } = toPrismaSkipTake(query);

    const where: Prisma.AttendanceExceptionWhereInput = {
      tenantId,
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.isResolved !== undefined ? { isResolved: query.isResolved } : {}),
      ...(query.status ? { exceptionType: query.status } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            exceptionDate: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.attendanceException.findMany({
        where,
        skip,
        take,
        orderBy: { exceptionDate: query.sortOrder ?? 'desc' },
      }),
      this.prisma.attendanceException.count({ where }),
    ]);

    return { data, total };
  }
}
