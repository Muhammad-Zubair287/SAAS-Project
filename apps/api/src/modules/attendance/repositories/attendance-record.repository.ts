import { Injectable } from '@nestjs/common';
import { type Prisma, type AttendanceRecord } from '@prisma/client';
import { BaseRepository } from '../../../database/base/base.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { toPrismaSkipTake } from '../../../common/utils/pagination.helper';
import type { ListAttendanceDto } from '../dto/list-attendance.dto';

@Injectable()
export class AttendanceRecordRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string, tenantId: string): Promise<AttendanceRecord | null> {
    return this.prisma.attendanceRecord.findFirst({ where: { id, tenantId } });
  }

  async findByEmployeeAndDate(
    employeeId: string,
    date: Date,
    tenantId: string,
  ): Promise<AttendanceRecord | null> {
    return this.prisma.attendanceRecord.findFirst({
      where: { tenantId, employeeId, attendanceDate: date },
    });
  }

  async upsert(
    tenantId: string,
    employeeId: string,
    date: Date,
    data: Omit<Prisma.AttendanceRecordCreateInput, 'tenant' | 'employee'> & {
      tenantId?: string;
      employeeId?: string;
      attendanceDate?: Date;
    },
  ): Promise<AttendanceRecord> {
    return this.prisma.attendanceRecord.upsert({
      where: {
        tenantId_employeeId_attendanceDate: {
          tenantId,
          employeeId,
          attendanceDate: date,
        },
      },
      create: {
        ...(data as Prisma.AttendanceRecordUncheckedCreateInput),
        tenantId,
        employeeId,
        attendanceDate: date,
      },
      update: {
        ...(data as Prisma.AttendanceRecordUncheckedUpdateInput),
        rowVersion: { increment: 1 },
        updatedAt: new Date(),
      },
    });
  }

  async create(data: Prisma.AttendanceRecordUncheckedCreateInput): Promise<AttendanceRecord> {
    return this.prisma.attendanceRecord.create({ data });
  }

  async update(
    id: string,
    tenantId: string,
    data: Prisma.AttendanceRecordUncheckedUpdateInput,
    expectedVersion?: bigint,
  ): Promise<AttendanceRecord> {
    return this.prisma.attendanceRecord.update({
      where: {
        id,
        tenantId,
        ...(expectedVersion !== undefined ? { rowVersion: expectedVersion } : {}),
      },
      data: { ...data, rowVersion: { increment: 1 }, updatedAt: new Date() },
    });
  }

  async findMany(
    query: ListAttendanceDto,
    tenantId: string,
  ): Promise<{ data: AttendanceRecord[]; total: number }> {
    const { skip, take } = toPrismaSkipTake(query);

    const where: Prisma.AttendanceRecordWhereInput = {
      tenantId,
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            attendanceDate: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.attendanceRecord.findMany({
        where,
        skip,
        take,
        orderBy: { attendanceDate: query.sortOrder ?? 'desc' },
      }),
      this.prisma.attendanceRecord.count({ where }),
    ]);

    return { data, total };
  }
}
