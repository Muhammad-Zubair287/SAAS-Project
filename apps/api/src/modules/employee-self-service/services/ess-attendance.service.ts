import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { createPaginatedResponse } from '../../../common/utils/response.helper';
import { AttendanceEventService } from '../../attendance/services/attendance-event.service';
import { ATTENDANCE_EVENT_TYPE, ATTENDANCE_SOURCE } from '../../attendance/constants/attendance.constants';
import { EssContextService } from './ess-context.service';

@Injectable()
export class EssAttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: EssContextService,
    private readonly attendanceEvents: AttendanceEventService,
  ) {}

  async listRecords(
    tenantId: string,
    userId: string,
    from?: string,
    to?: string,
    page = 1,
    pageSize = 20,
  ) {
    const employee = await this.context.requireSelfEmployee(tenantId, userId);
    const where = {
      tenantId,
      employeeId: employee.id,
      ...(from || to
        ? {
            attendanceDate: {
              ...(from ? { gte: this.dateOnly(from) } : {}),
              ...(to ? { lte: this.dateOnly(to) } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.attendanceRecord.findMany({
        where,
        orderBy: { attendanceDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.attendanceRecord.count({ where }),
    ]);

    return createPaginatedResponse(data.map((record) => this.toRecordDto(record)), total, page, pageSize);
  }

  async getToday(tenantId: string, userId: string) {
    const employee = await this.context.requireSelfEmployee(tenantId, userId);
    const record = await this.findTodayRecord(tenantId, employee.id);
    return {
      record: record ? this.toRecordDto(record) : null,
      suggestedAction: this.suggestedAction(record),
    };
  }

  async checkIn(
    tenantId: string,
    userId: string,
    userEmail: string,
    correlationId: string,
    ipAddress?: string,
  ) {
    return this.createSelfEvent(
      tenantId,
      userId,
      userEmail,
      ATTENDANCE_EVENT_TYPE.CHECK_IN,
      correlationId,
      ipAddress,
    );
  }

  async checkOut(
    tenantId: string,
    userId: string,
    userEmail: string,
    correlationId: string,
    ipAddress?: string,
  ) {
    return this.createSelfEvent(
      tenantId,
      userId,
      userEmail,
      ATTENDANCE_EVENT_TYPE.CHECK_OUT,
      correlationId,
      ipAddress,
    );
  }

  async listEvents(tenantId: string, userId: string, page = 1, pageSize = 20) {
    const employee = await this.context.requireSelfEmployee(tenantId, userId);
    const where = { tenantId, employeeId: employee.id };
    const [data, total] = await Promise.all([
      this.prisma.attendanceRawEvent.findMany({
        where,
        orderBy: { eventTime: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.attendanceRawEvent.count({ where }),
    ]);
    return createPaginatedResponse(data.map((event) => ({
      id: event.id,
      employeeId: event.employeeId,
      eventType: event.eventType,
      source: event.source,
      eventTime: event.eventTime.toISOString(),
      recordedAt: event.recordedAt.toISOString(),
      status: event.status,
      createdAt: event.createdAt.toISOString(),
    })), total, page, pageSize);
  }

  async findTodayRecord(tenantId: string, employeeId: string) {
    return this.prisma.attendanceRecord.findFirst({
      where: {
        tenantId,
        employeeId,
        attendanceDate: this.todayDate(),
      },
    });
  }

  suggestedAction(record: { firstCheckIn: Date | null; lastCheckOut: Date | null } | null) {
    if (!record?.firstCheckIn) return 'CHECK_IN';
    if (!record.lastCheckOut) return 'CHECK_OUT';
    return 'NONE';
  }

  private async createSelfEvent(
    tenantId: string,
    userId: string,
    userEmail: string,
    eventType: string,
    correlationId: string,
    ipAddress?: string,
  ) {
    const employee = await this.context.requireSelfEmployee(tenantId, userId);
    return this.attendanceEvents.ingest(
      {
        employeeId: employee.id,
        eventType,
        eventTime: new Date().toISOString(),
        source: ATTENDANCE_SOURCE.WEB,
        idempotencyKey: randomUUID(),
        metadata: { channel: 'ESS' },
      },
      userId,
      userEmail,
      tenantId,
      correlationId,
      ipAddress,
    );
  }

  private todayDate(): Date {
    return this.dateOnly(new Date().toISOString());
  }

  private dateOnly(value: string): Date {
    return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  }

  private toRecordDto(record: {
    id: string;
    tenantId: string;
    employeeId: string;
    attendanceDate: Date;
    firstCheckIn: Date | null;
    lastCheckOut: Date | null;
    totalWorkedMinutes: number;
    regularMinutes: number;
    overtimeMinutes: number;
    lateMinutes: number;
    earlyDepartureMinutes: number;
    status: string;
    isManual: boolean;
    isLeave: boolean;
    isHoliday: boolean;
    isWeekend: boolean;
    manualNote: string | null;
    periodLocked: boolean;
    calculatedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    rowVersion: bigint;
  }) {
    return {
      id: record.id,
      tenantId: record.tenantId,
      employeeId: record.employeeId,
      attendanceDate: record.attendanceDate.toISOString().split('T')[0],
      firstCheckIn: record.firstCheckIn?.toISOString() ?? null,
      lastCheckOut: record.lastCheckOut?.toISOString() ?? null,
      totalWorkedMinutes: record.totalWorkedMinutes,
      regularMinutes: record.regularMinutes,
      overtimeMinutes: record.overtimeMinutes,
      lateMinutes: record.lateMinutes,
      earlyDepartureMinutes: record.earlyDepartureMinutes,
      status: record.status,
      isManual: record.isManual,
      isLeave: record.isLeave,
      isHoliday: record.isHoliday,
      isWeekend: record.isWeekend,
      manualNote: record.manualNote,
      periodLocked: record.periodLocked,
      calculatedAt: record.calculatedAt?.toISOString() ?? null,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      rowVersion: record.rowVersion.toString(),
    };
  }
}
