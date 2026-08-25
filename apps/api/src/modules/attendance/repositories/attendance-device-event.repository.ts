import { Injectable } from '@nestjs/common';
import { type Prisma, type AttendanceDeviceEvent, ValidationStatus, CaptureSource } from '@prisma/client';
import { BaseRepository } from '../../../database/base/base.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { toPrismaSkipTake } from '../../../common/utils/pagination.helper';

export interface FindManyEventsQuery {
  page?: number;
  pageSize?: number;
  source?: CaptureSource;
  validationStatus?: ValidationStatus;
  sortBy?: 'receivedAt' | 'occurredAt';
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class AttendanceDeviceEventRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string, tenantId: string): Promise<AttendanceDeviceEvent | null> {
    return this.prisma.attendanceDeviceEvent.findFirst({
      where: { id, tenantId },
    });
  }

  async findByIdempotencyKey(key: string, tenantId: string): Promise<AttendanceDeviceEvent | null> {
    return this.prisma.attendanceDeviceEvent.findFirst({
      where: { idempotencyKey: key, tenantId },
    });
  }

  async findBySourceEventId(sourceEventId: string, tenantId: string): Promise<AttendanceDeviceEvent | null> {
    return this.prisma.attendanceDeviceEvent.findFirst({
      where: { sourceEventId, tenantId },
    });
  }

  async findByEmployeeId(employeeId: string, tenantId: string): Promise<AttendanceDeviceEvent[]> {
    return this.prisma.attendanceDeviceEvent.findMany({
      where: { employeeId, tenantId },
      orderBy: { occurredAt: 'desc' },
    });
  }

  async create(
    tenantId: string,
    data: Omit<Prisma.AttendanceDeviceEventCreateInput, 'tenant'>,
  ): Promise<AttendanceDeviceEvent> {
    return this.prisma.attendanceDeviceEvent.create({
      data: {
        ...data,
        tenant: { connect: { id: tenantId } },
      },
    });
  }

  async update(id: string, tenantId: string, data: Prisma.AttendanceDeviceEventUpdateInput): Promise<AttendanceDeviceEvent> {
    return this.prisma.attendanceDeviceEvent.update({
      where: { id },
      data,
    });
  }

  async updateValidationStatus(
    id: string,
    tenantId: string,
    status: ValidationStatus,
    reason?: string,
  ): Promise<AttendanceDeviceEvent> {
    return this.prisma.attendanceDeviceEvent.update({
      where: { id },
      data: {
        validationStatus: status,
        validationReason: reason,
      },
    });
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.prisma.attendanceDeviceEvent.delete({
      where: { id },
    });
  }

  async findMany(
    tenantId: string,
    query: FindManyEventsQuery,
  ): Promise<{ data: AttendanceDeviceEvent[]; total: number }> {
    const { skip, take } = toPrismaSkipTake({
      page: query.page,
      pageSize: query.pageSize,
    });

    const where: Prisma.AttendanceDeviceEventWhereInput = {
      tenantId,
      ...(query.source ? { source: query.source } : {}),
      ...(query.validationStatus ? { validationStatus: query.validationStatus } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.attendanceDeviceEvent.findMany({
        where,
        skip,
        take,
        orderBy: { [query.sortBy ?? 'receivedAt']: query.sortOrder ?? 'desc' },
      }),
      this.prisma.attendanceDeviceEvent.count({ where }),
    ]);

    return { data, total };
  }

  async countByTenant(tenantId: string): Promise<number> {
    return this.prisma.attendanceDeviceEvent.count({ where: { tenantId } });
  }

  async countByValidationStatus(tenantId: string, status: ValidationStatus): Promise<number> {
    return this.prisma.attendanceDeviceEvent.count({
      where: { tenantId, validationStatus: status },
    });
  }

  async countBySource(tenantId: string, source: CaptureSource): Promise<number> {
    return this.prisma.attendanceDeviceEvent.count({
      where: { tenantId, source },
    });
  }

  async existsById(id: string, tenantId: string): Promise<boolean> {
    const count = await this.prisma.attendanceDeviceEvent.count({
      where: { id, tenantId },
    });
    return count > 0;
  }

  async findInDateRange(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    validationStatus?: ValidationStatus,
  ): Promise<AttendanceDeviceEvent[]> {
    return this.prisma.attendanceDeviceEvent.findMany({
      where: {
        tenantId,
        occurredAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(validationStatus ? { validationStatus } : {}),
      },
      orderBy: { occurredAt: 'asc' },
    });
  }

  async findPendingValidation(tenantId: string, limit: number = 100): Promise<AttendanceDeviceEvent[]> {
    return this.prisma.attendanceDeviceEvent.findMany({
      where: {
        tenantId,
        validationStatus: 'PENDING',
      },
      orderBy: { receivedAt: 'asc' },
      take: limit,
    });
  }
}
