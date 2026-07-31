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
import type { CreateAttendanceEventDto } from '../dto/create-attendance-event.dto';
import type { ListAttendanceDto } from '../dto/list-attendance.dto';
import type { AttendanceEventResponseDto } from '../dto/attendance-event-response.dto';

type RawEventRow = {
  id: string;
  tenantId: string;
  employeeId: string;
  eventType: string;
  source: string;
  eventTime: Date;
  recordedAt: Date;
  deviceId: string | null;
  idempotencyKey: string;
  isCorrection: boolean;
  correctsEventId: string | null;
  status: string;
  createdAt: Date;
};

@Injectable()
export class AttendanceEventService {
  private readonly logger = new Logger(AttendanceEventService.name);
  private readonly leaveAdapter: LeaveCheckAdapter;
  private readonly shiftAdapter: ShiftCheckAdapter;

  constructor(
    private readonly rawEventRepo: AttendanceRawEventRepository,
    private readonly recordRepo: AttendanceRecordRepository,
    private readonly exceptionRepo: AttendanceExceptionRepository,
    private readonly calculator: AttendanceCalculatorService,
    private readonly policyService: AttendancePolicyService,
    private readonly prisma: PrismaService,
    private readonly employeeRepo: EmployeeRepository,
  ) {
    this.leaveAdapter = new NullLeaveCheckAdapter();
    this.shiftAdapter = new NullShiftCheckAdapter();
  }

  async ingest(
    dto: CreateAttendanceEventDto,
    actorId: string,
    actorEmail: string,
    tenantId: string,
    correlationId: string,
    ipAddress?: string,
  ): Promise<AttendanceEventResponseDto> {
    // 1. Validate employee belongs to tenant
    const employee = await this.employeeRepo.findById(dto.employeeId, tenantId);
    if (!employee) {
      throw new AppException({
        code: ERROR_CODES.EMPLOYEE_NOT_FOUND,
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Employee not found',
      });
    }

    // 2. Generate idempotency key if not provided
    const idempotencyKey = dto.idempotencyKey ?? randomUUID();

    // 3. Idempotency check
    const existing = await this.rawEventRepo.findByIdempotencyKey(idempotencyKey);
    if (existing) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_EVENT_DUPLICATE,
        statusCode: HttpStatus.CONFLICT,
        message: 'Duplicate attendance event',
      });
    }

    // 4. Parse event time
    const eventTime = new Date(dto.eventTime);

    // 5. Create raw event + audit + outbox in transaction
    const rawEvent = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      const event = await tx.attendanceRawEvent.create({
        data: {
          tenantId,
          employeeId: dto.employeeId,
          eventType: dto.eventType,
          source: dto.source,
          eventTime,
          deviceId: dto.deviceId ?? null,
          idempotencyKey,
          ipAddress: ipAddress ?? null,
          metadata: (dto.metadata as object) ?? {},
          status: 'PENDING',
          createdBy: actorId,
        },
      });

      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId,
          actorType: 'user',
          actorEmail,
          module: 'attendance',
          action: 'attendance.event.ingested',
          resourceType: 'attendance_raw_event',
          resourceId: event.id,
          after: {
            eventType: event.eventType,
            source: event.source,
            eventTime: event.eventTime,
          },
          correlationId,
          severity: 'INFO',
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId,
          eventId: randomUUID(),
          eventType: 'AttendanceEventIngested.v1',
          payload: {
            rawEventId: event.id,
            employeeId: dto.employeeId,
            eventType: dto.eventType,
            source: dto.source,
            eventTime: eventTime.toISOString(),
            tenantId,
            actorId,
            correlationId,
          },
          status: 'PENDING',
        },
      });

      return event;
    });

    // 6. Trigger calculation (synchronous in MVP)
    await this.triggerCalculation(
      tenantId,
      dto.employeeId,
      employee.legalEntityId,
      employee.branchId ?? null,
      eventTime,
      actorId,
      correlationId,
    );

    // 7. Mark event as processed
    await this.rawEventRepo.markProcessed(rawEvent.id, tenantId);

    return this.toEventDto(rawEvent);
  }

  private async triggerCalculation(
    tenantId: string,
    employeeId: string,
    legalEntityId: string,
    branchId: string | null,
    eventTime: Date,
    actorId: string,
    correlationId: string,
  ): Promise<void> {
    try {
      // Get work date (date portion of eventTime)
      const workDate = new Date(eventTime);
      workDate.setHours(0, 0, 0, 0);

      // Resolve attendance policy for this employee's context
      const policy = await this.policyService.resolvePolicy(
        tenantId,
        workDate,
        branchId,
        legalEntityId,
      );
      const policySchedule = this.policyService.policyToSchedule(policy);

      // Load all events for this employee on this date
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

      // Calculate
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

      // Upsert attendance record + exceptions in transaction
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

        // Delete old exceptions for this record, create new ones
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

        // Outbox: AttendanceRecordCalculated.v1
        await tx.outboxEvent.create({
          data: {
            tenantId,
            eventId: randomUUID(),
            eventType: 'AttendanceRecordCalculated.v1',
            payload: {
              recordId: record.id,
              employeeId,
              workDate: workDate.toISOString(),
              status: result.status,
              tenantId,
              correlationId,
            },
            status: 'PENDING',
          },
        });

        // Outbox: AttendanceExceptionRaised.v1 for each exception
        for (const ex of result.exceptions) {
          await tx.outboxEvent.create({
            data: {
              tenantId,
              eventId: randomUUID(),
              eventType: 'AttendanceExceptionRaised.v1',
              payload: {
                employeeId,
                exceptionType: ex.exceptionType,
                exceptionDate: workDate.toISOString(),
                tenantId,
                correlationId,
              },
              status: 'PENDING',
            },
          });
        }

        // Audit
        await tx.auditEvent.create({
          data: {
            tenantId,
            actorId,
            actorType: 'system',
            actorEmail: 'system',
            module: 'attendance',
            action: 'attendance.record.calculated',
            resourceType: 'attendance_record',
            resourceId: record.id,
            after: {
              status: result.status,
              totalWorkedMinutes: result.totalWorkedMinutes,
            },
            correlationId,
            severity: 'INFO',
          },
        });
      });
    } catch (err) {
      // Log but don't throw — event was already saved
      this.logger.error('[AttendanceCalculator] Calculation failed:', err);
    }
  }

  async findMany(
    query: ListAttendanceDto,
    tenantId: string,
  ): Promise<ApiSuccessResponse<AttendanceEventResponseDto[]>> {
    const { data, total } = await this.rawEventRepo.findMany(query, tenantId);
    return createPaginatedResponse(
      data.map((e) => this.toEventDto(e)),
      total,
      query.page ?? 1,
      query.pageSize ?? 20,
    );
  }

  async findById(id: string, tenantId: string): Promise<AttendanceEventResponseDto> {
    const event = await this.rawEventRepo.findById(id, tenantId);
    if (!event) {
      throw new AppException({
        code: ERROR_CODES.NOT_FOUND,
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Attendance event not found',
      });
    }
    return this.toEventDto(event);
  }

  private toEventDto(e: RawEventRow): AttendanceEventResponseDto {
    return {
      id: e.id,
      tenantId: e.tenantId,
      employeeId: e.employeeId,
      eventType: e.eventType,
      source: e.source,
      eventTime: e.eventTime instanceof Date ? e.eventTime.toISOString() : String(e.eventTime),
      recordedAt: e.recordedAt instanceof Date ? e.recordedAt.toISOString() : String(e.recordedAt),
      deviceId: e.deviceId ?? null,
      idempotencyKey: e.idempotencyKey,
      isCorrection: e.isCorrection,
      correctsEventId: e.correctsEventId ?? null,
      status: e.status,
      createdAt: e.createdAt instanceof Date ? e.createdAt.toISOString() : String(e.createdAt),
    };
  }
}
