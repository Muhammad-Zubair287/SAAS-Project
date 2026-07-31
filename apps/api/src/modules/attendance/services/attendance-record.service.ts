import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { createPaginatedResponse } from '../../../common/utils/response.helper';
import type { ApiSuccessResponse } from '../../../common/interfaces/api-response.interface';
import { EmployeeRepository } from '../../employee/repositories/employee.repository';
import { AttendanceRawEventRepository } from '../repositories/attendance-raw-event.repository';
import { AttendanceRecordRepository } from '../repositories/attendance-record.repository';
import { AttendanceExceptionRepository } from '../repositories/attendance-exception.repository';
import { AttendanceCalculatorService } from './attendance-calculator.service';
import { AttendancePolicyService } from './attendance-policy.service';
import { NullLeaveCheckAdapter } from '../interfaces/leave-check-adapter.interface';
import { NullShiftCheckAdapter } from '../interfaces/shift-check-adapter.interface';
import type { LeaveCheckAdapter } from '../interfaces/leave-check-adapter.interface';
import type { ShiftCheckAdapter } from '../interfaces/shift-check-adapter.interface';
import type { ListAttendanceDto } from '../dto/list-attendance.dto';
import type { CreateManualAttendanceRecordDto } from '../dto/create-manual-record.dto';
import type { AttendanceRecordResponseDto } from '../dto/attendance-record-response.dto';

type RecordRow = {
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
  calculationVersion: number;
  calculatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  rowVersion: bigint;
};

@Injectable()
export class AttendanceRecordService {
  private readonly logger = new Logger(AttendanceRecordService.name);
  private readonly leaveAdapter: LeaveCheckAdapter;
  private readonly shiftAdapter: ShiftCheckAdapter;

  constructor(
    private readonly recordRepo: AttendanceRecordRepository,
    private readonly exceptionRepo: AttendanceExceptionRepository,
    private readonly rawEventRepo: AttendanceRawEventRepository,
    private readonly calculator: AttendanceCalculatorService,
    private readonly policyService: AttendancePolicyService,
    private readonly prisma: PrismaService,
    private readonly employeeRepo: EmployeeRepository,
  ) {
    this.leaveAdapter = new NullLeaveCheckAdapter();
    this.shiftAdapter = new NullShiftCheckAdapter();
  }

  async findMany(
    query: ListAttendanceDto,
    tenantId: string,
  ): Promise<ApiSuccessResponse<AttendanceRecordResponseDto[]>> {
    const { data, total } = await this.recordRepo.findMany(query, tenantId);
    return createPaginatedResponse(
      data.map((r) => this.toRecordDto(r)),
      total,
      query.page ?? 1,
      query.pageSize ?? 20,
    );
  }

  async findById(id: string, tenantId: string): Promise<AttendanceRecordResponseDto> {
    const record = await this.recordRepo.findById(id, tenantId);
    if (!record) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_RECORD_NOT_FOUND,
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Attendance record not found',
      });
    }
    return this.toRecordDto(record);
  }

  async findByEmployee(
    employeeId: string,
    query: ListAttendanceDto,
    tenantId: string,
  ): Promise<ApiSuccessResponse<AttendanceRecordResponseDto[]>> {
    const merged = { ...query, employeeId };
    return this.findMany(merged, tenantId);
  }

  async createManual(
    dto: CreateManualAttendanceRecordDto,
    actorId: string,
    actorEmail: string,
    tenantId: string,
    correlationId: string,
  ): Promise<AttendanceRecordResponseDto> {
    // Validate employee
    const employee = await this.employeeRepo.findById(dto.employeeId, tenantId);
    if (!employee) {
      throw new AppException({
        code: ERROR_CODES.EMPLOYEE_NOT_FOUND,
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Employee not found',
      });
    }

    const attendanceDate = new Date(dto.attendanceDate);
    attendanceDate.setHours(0, 0, 0, 0);

    // Check for existing record
    const existing = await this.recordRepo.findByEmployeeAndDate(
      dto.employeeId,
      attendanceDate,
      tenantId,
    );

    if (existing && existing.periodLocked) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_RECORD_PERIOD_LOCKED,
        statusCode: HttpStatus.CONFLICT,
        message: 'Attendance period is locked and cannot be modified',
      });
    }

    if (existing && !existing.isManual) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_MANUAL_RECORD_CONFLICT,
        statusCode: HttpStatus.CONFLICT,
        message: 'A calculated attendance record already exists for this date. Use recalculate to update.',
      });
    }

    const record = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      const created = await tx.attendanceRecord.upsert({
        where: {
          tenantId_employeeId_attendanceDate: {
            tenantId,
            employeeId: dto.employeeId,
            attendanceDate,
          },
        },
        create: {
          tenantId,
          employeeId: dto.employeeId,
          attendanceDate,
          status: dto.status,
          isManual: true,
          manualNote: dto.manualNote ?? null,
          createdBy: actorId,
          updatedBy: actorId,
        },
        update: {
          status: dto.status,
          isManual: true,
          manualNote: dto.manualNote ?? null,
          updatedBy: actorId,
          rowVersion: { increment: 1 },
        },
      });

      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId,
          actorType: 'user',
          actorEmail,
          module: 'attendance',
          action: 'attendance.record.manual_created',
          resourceType: 'attendance_record',
          resourceId: created.id,
          after: { status: created.status, isManual: true },
          correlationId,
          severity: 'INFO',
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId,
          eventId: randomUUID(),
          eventType: 'AttendanceRecordManualCreated.v1',
          payload: {
            recordId: created.id,
            employeeId: dto.employeeId,
            attendanceDate: attendanceDate.toISOString(),
            status: dto.status,
            tenantId,
            actorId,
            correlationId,
          },
          status: 'PENDING',
        },
      });

      return created;
    });

    return this.toRecordDto(record);
  }

  async recalculate(
    employeeId: string,
    dateFrom: string,
    dateTo: string,
    tenantId: string,
    actorId: string,
    correlationId: string,
  ): Promise<void> {
    const employee = await this.employeeRepo.findById(employeeId, tenantId);
    if (!employee) {
      throw new AppException({
        code: ERROR_CODES.EMPLOYEE_NOT_FOUND,
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Employee not found',
      });
    }

    const from = new Date(dateFrom);
    from.setHours(0, 0, 0, 0);
    const to = new Date(dateTo);
    to.setHours(0, 0, 0, 0);

    const current = new Date(from);
    while (current <= to) {
      await this.recalculateDate(
        tenantId,
        employeeId,
        employee.legalEntityId,
        employee.branchId ?? null,
        new Date(current),
        actorId,
        correlationId,
      );
      current.setDate(current.getDate() + 1);
    }
  }

  private async recalculateDate(
    tenantId: string,
    employeeId: string,
    legalEntityId: string,
    branchId: string | null,
    workDate: Date,
    actorId: string,
    correlationId: string,
  ): Promise<void> {
    try {
      // Resolve attendance policy for this employee's context
      const policy = await this.policyService.resolvePolicy(
        tenantId,
        workDate,
        branchId,
        legalEntityId,
      );
      const policySchedule = this.policyService.policyToSchedule(policy);

      const events = await this.rawEventRepo.findByEmployeeAndDate(
        employeeId,
        workDate,
        tenantId,
      );

      const rawEventInputs = events
        .filter((e) => e.status !== 'ERROR')
        .map((e) => ({
          id: e.id,
          eventType: e.eventType,
          eventTime: new Date(e.eventTime),
        }));

      const result = await this.calculator.calculate({
        tenantId,
        employeeId,
        legalEntityId,
        workDate,
        rawEvents: rawEventInputs,
        leaveAdapter: this.leaveAdapter,
        shiftAdapter: this.shiftAdapter,
        policySchedule,
      });

      await this.prisma.withTenantTransaction(tenantId, async (tx) => {
        const record = await tx.attendanceRecord.upsert({
          where: {
            tenantId_employeeId_attendanceDate: {
              tenantId,
              employeeId,
              attendanceDate: workDate,
            },
          },
          create: {
            tenantId,
            employeeId,
            attendanceDate: workDate,
            firstCheckIn: result.firstCheckIn,
            lastCheckOut: result.lastCheckOut,
            totalWorkedMinutes: result.totalWorkedMinutes,
            regularMinutes: result.regularMinutes,
            overtimeMinutes: result.overtimeMinutes,
            lateMinutes: result.lateMinutes,
            earlyDepartureMinutes: result.earlyDepartureMinutes,
            status: result.status,
            isLeave: result.isLeave,
            isHoliday: result.isHoliday,
            isWeekend: result.isWeekend,
            calculatedAt: new Date(),
            createdBy: actorId,
            updatedBy: actorId,
          },
          update: {
            firstCheckIn: result.firstCheckIn,
            lastCheckOut: result.lastCheckOut,
            totalWorkedMinutes: result.totalWorkedMinutes,
            regularMinutes: result.regularMinutes,
            overtimeMinutes: result.overtimeMinutes,
            lateMinutes: result.lateMinutes,
            earlyDepartureMinutes: result.earlyDepartureMinutes,
            status: result.status,
            isLeave: result.isLeave,
            isHoliday: result.isHoliday,
            isWeekend: result.isWeekend,
            calculatedAt: new Date(),
            updatedBy: actorId,
            rowVersion: { increment: 1 },
            calculationVersion: { increment: 1 },
          },
        });

        await tx.attendanceException.deleteMany({
          where: { tenantId, attendanceRecordId: record.id },
        });

        if (result.exceptions.length > 0) {
          await tx.attendanceException.createMany({
            data: result.exceptions.map((ex) => ({
              tenantId,
              attendanceRecordId: record.id,
              employeeId,
              exceptionType: ex.exceptionType,
              exceptionDate: workDate,
              description: ex.description,
              severity: ex.severity,
            })),
          });
        }

        await tx.auditEvent.create({
          data: {
            tenantId,
            actorId,
            actorType: 'user',
            actorEmail: 'system',
            module: 'attendance',
            action: 'attendance.record.recalculated',
            resourceType: 'attendance_record',
            resourceId: record.id,
            after: { status: result.status, totalWorkedMinutes: result.totalWorkedMinutes },
            correlationId,
            severity: 'INFO',
          },
        });
      });
    } catch (err) {
      this.logger.error(`[AttendanceRecalculate] Failed for ${employeeId} on ${workDate.toISOString()}:`, err);
    }
  }

  private toRecordDto(r: RecordRow): AttendanceRecordResponseDto {
    return {
      id: r.id,
      tenantId: r.tenantId,
      employeeId: r.employeeId,
      attendanceDate: r.attendanceDate instanceof Date
        ? (r.attendanceDate.toISOString().split('T')[0] ?? '')
        : String(r.attendanceDate),
      firstCheckIn: r.firstCheckIn instanceof Date ? r.firstCheckIn.toISOString() : null,
      lastCheckOut: r.lastCheckOut instanceof Date ? r.lastCheckOut.toISOString() : null,
      totalWorkedMinutes: r.totalWorkedMinutes,
      regularMinutes: r.regularMinutes,
      overtimeMinutes: r.overtimeMinutes,
      lateMinutes: r.lateMinutes,
      earlyDepartureMinutes: r.earlyDepartureMinutes,
      status: r.status,
      isManual: r.isManual,
      isLeave: r.isLeave,
      isHoliday: r.isHoliday,
      isWeekend: r.isWeekend,
      manualNote: r.manualNote,
      periodLocked: r.periodLocked,
      calculationVersion: r.calculationVersion,
      calculatedAt: r.calculatedAt instanceof Date ? r.calculatedAt.toISOString() : null,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt),
      rowVersion: r.rowVersion.toString(),
    };
  }
}
