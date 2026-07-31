import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import type { AttendancePolicy } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { createPaginatedResponse } from '../../../common/utils/response.helper';
import type { ApiSuccessResponse } from '../../../common/interfaces/api-response.interface';
import { AttendancePolicyRepository } from '../repositories/attendance-policy.repository';
import type { CreateAttendancePolicyDto } from '../dto/create-attendance-policy.dto';
import type { UpdateAttendancePolicyDto } from '../dto/update-attendance-policy.dto';
import type { ListAttendancePoliciesDto } from '../dto/list-attendance-policies.dto';
import type { ShiftWorkSchedule } from '../interfaces/shift-check-adapter.interface';

@Injectable()
export class AttendancePolicyService {
  private readonly logger = new Logger(AttendancePolicyService.name);

  constructor(
    private readonly policyRepo: AttendancePolicyRepository,
    private readonly prisma: PrismaService,
  ) {}

  // --- PUBLIC: resolvePolicy ---
  // Called by AttendanceCalculatorService. Returns the effective policy as a ShiftWorkSchedule.
  // Throws ATTENDANCE_POLICY_NO_ACTIVE if no policy found — no fallback defaults.
  async resolvePolicy(
    tenantId: string,
    date: Date,
    branchId: string | null,
    legalEntityId: string | null,
  ): Promise<AttendancePolicy> {
    const policy = await this.policyRepo.resolveForContext(tenantId, date, branchId, legalEntityId);
    if (!policy) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_POLICY_NO_ACTIVE,
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: `No active attendance policy found for tenant ${tenantId} on ${date.toISOString().split('T')[0]}`,
      });
    }
    return policy;
  }

  // Convert a resolved policy to the ShiftWorkSchedule interface used by the calculator
  policyToSchedule(policy: AttendancePolicy): ShiftWorkSchedule {
    const weekendDays = Array.isArray(policy.weekendDefinition)
      ? (policy.weekendDefinition as number[])
      : ((policy.weekendDefinition as { days: number[] }).days ?? [0, 6]);

    return {
      workStartTime: policy.workStartTime,
      workEndTime: policy.workEndTime,
      workMinutesRequired: policy.workingMinutesPerDay,
      gracePeriodMinutes: policy.graceMinutes,
      lateToleranceMinutes: policy.lateToleranceMinutes,
      earlyDepartureMinutes: policy.earlyDepartureToleranceMinutes,
      overtimeThresholdMinutes: policy.overtimeThresholdMinutes,
      halfDayThresholdMinutes: policy.halfDayMinutes,
      weekendDays,
      timezone: policy.timezone,
    };
  }

  // --- CRUD ---

  async findMany(
    query: ListAttendancePoliciesDto,
    tenantId: string,
  ): Promise<ApiSuccessResponse<AttendancePolicy[]>> {
    const { data, total } = await this.policyRepo.findMany(query, tenantId);
    const page = query.page ?? 1;
    const pageSize = query.limit ?? 20;
    return createPaginatedResponse(data, total, page, pageSize);
  }

  async findById(id: string, tenantId: string): Promise<AttendancePolicy> {
    const policy = await this.policyRepo.findById(id, tenantId);
    if (!policy) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_POLICY_NOT_FOUND,
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Attendance policy not found',
      });
    }
    return policy;
  }

  async create(
    dto: CreateAttendancePolicyDto,
    actorId: string,
    actorEmail: string,
    tenantId: string,
    correlationId: string,
  ): Promise<AttendancePolicy> {
    const effectiveFrom = new Date(dto.effectiveFrom);
    const effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;

    // Validate date range
    if (effectiveTo && effectiveTo <= effectiveFrom) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_POLICY_INVALID_DATES,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'effectiveTo must be after effectiveFrom',
      });
    }

    // Validate minutes
    this.validateMinutes(dto);

    // Check for overlapping policies in the same scope
    const overlapping = await this.policyRepo.findOverlapping(
      tenantId,
      effectiveFrom,
      effectiveTo,
      dto.branchId ?? null,
      dto.legalEntityId ?? null,
    );
    if (overlapping.length > 0) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_POLICY_CONFLICT,
        statusCode: HttpStatus.CONFLICT,
        message: 'An active attendance policy already exists for this scope and date range',
      });
    }

    const policy = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      const created = await tx.attendancePolicy.create({
        data: {
          tenantId,
          legalEntityId: dto.legalEntityId ?? null,
          branchId: dto.branchId ?? null,
          name: dto.name,
          description: dto.description ?? null,
          effectiveFrom,
          effectiveTo,
          version: 1,
          isCurrent: true,
          workingMinutesPerDay: dto.workingMinutesPerDay,
          workStartTime: dto.workStartTime,
          workEndTime: dto.workEndTime,
          graceMinutes: dto.graceMinutes,
          lateToleranceMinutes: dto.lateToleranceMinutes,
          earlyDepartureToleranceMinutes: dto.earlyDepartureToleranceMinutes,
          halfDayMinutes: dto.halfDayMinutes,
          minimumWorkingMinutes: dto.minimumWorkingMinutes,
          overtimeThresholdMinutes: dto.overtimeThresholdMinutes,
          roundingStrategy: dto.roundingStrategy ?? 'NONE',
          weekendDefinition: dto.weekendDefinition,
          timezone: dto.timezone ?? 'UTC',
          allowManualAttendance: dto.allowManualAttendance ?? true,
          allowEarlyCheckIn: dto.allowEarlyCheckIn ?? true,
          allowLateCheckOut: dto.allowLateCheckOut ?? true,
          allowOvertime: dto.allowOvertime ?? false,
          allowedIpRanges: dto.allowedIpRanges ?? Prisma.JsonNull,
          createdBy: actorId,
        },
      });

      // Outbox: AttendancePolicyCreated.v1
      await tx.outboxEvent.create({
        data: {
          tenantId,
          eventId: randomUUID(),
          eventType: 'AttendancePolicyCreated.v1',
          payload: {
            policyId: created.id,
            tenantId,
            scope: this.scopeLabel(created),
            effectiveFrom: created.effectiveFrom.toISOString(),
            correlationId,
          },
        },
      });

      // Audit
      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId,
          actorType: 'user',
          actorEmail,
          module: 'ATTENDANCE',
          action: 'AttendancePolicyCreated',
          resourceType: 'attendance_policy',
          resourceId: created.id,
          after: created as unknown as Prisma.InputJsonValue,
          correlationId,
          severity: 'INFO',
          occurredAt: new Date(),
        },
      });

      return created;
    });

    return policy;
  }

  async update(
    id: string,
    dto: UpdateAttendancePolicyDto,
    actorId: string,
    actorEmail: string,
    tenantId: string,
    correlationId: string,
    expectedVersion?: bigint,
  ): Promise<AttendancePolicy> {
    const existing = await this.findById(id, tenantId);

    if (dto.workingMinutesPerDay !== undefined || dto.halfDayMinutes !== undefined || dto.minimumWorkingMinutes !== undefined) {
      this.validateMinutes({
        workingMinutesPerDay: dto.workingMinutesPerDay ?? existing.workingMinutesPerDay,
        halfDayMinutes: dto.halfDayMinutes ?? existing.halfDayMinutes,
        minimumWorkingMinutes: dto.minimumWorkingMinutes ?? existing.minimumWorkingMinutes,
        overtimeThresholdMinutes: dto.overtimeThresholdMinutes ?? existing.overtimeThresholdMinutes,
        graceMinutes: dto.graceMinutes ?? existing.graceMinutes,
        lateToleranceMinutes: dto.lateToleranceMinutes ?? existing.lateToleranceMinutes,
        earlyDepartureToleranceMinutes: dto.earlyDepartureToleranceMinutes ?? existing.earlyDepartureToleranceMinutes,
      } as CreateAttendancePolicyDto);
    }

    const policy = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      const before = { ...existing };

      // For date-range changes: create a NEW version instead of overwriting
      const isVersionBump =
        dto.effectiveFrom !== undefined &&
        dto.effectiveFrom !== existing.effectiveFrom.toISOString().split('T')[0];

      let updated: AttendancePolicy;

      if (isVersionBump) {
        // Archive current version
        await tx.attendancePolicy.update({
          where: { id, tenantId },
          data: { isCurrent: false, updatedAt: new Date(), rowVersion: { increment: 1 } },
        });

        const newEffectiveFrom = new Date(dto.effectiveFrom!);
        const newEffectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;

        // Create new version
        updated = await tx.attendancePolicy.create({
          data: {
            tenantId,
            legalEntityId: existing.legalEntityId,
            branchId: existing.branchId,
            name: dto.name ?? existing.name,
            description: dto.description ?? existing.description,
            effectiveFrom: newEffectiveFrom,
            effectiveTo: newEffectiveTo,
            version: existing.version + 1,
            isCurrent: true,
            workingMinutesPerDay: dto.workingMinutesPerDay ?? existing.workingMinutesPerDay,
            workStartTime: dto.workStartTime ?? existing.workStartTime,
            workEndTime: dto.workEndTime ?? existing.workEndTime,
            graceMinutes: dto.graceMinutes ?? existing.graceMinutes,
            lateToleranceMinutes: dto.lateToleranceMinutes ?? existing.lateToleranceMinutes,
            earlyDepartureToleranceMinutes: dto.earlyDepartureToleranceMinutes ?? existing.earlyDepartureToleranceMinutes,
            halfDayMinutes: dto.halfDayMinutes ?? existing.halfDayMinutes,
            minimumWorkingMinutes: dto.minimumWorkingMinutes ?? existing.minimumWorkingMinutes,
            overtimeThresholdMinutes: dto.overtimeThresholdMinutes ?? existing.overtimeThresholdMinutes,
            roundingStrategy: dto.roundingStrategy ?? existing.roundingStrategy,
            weekendDefinition: (dto.weekendDefinition ?? existing.weekendDefinition) as number[],
            timezone: dto.timezone ?? existing.timezone,
            allowManualAttendance: dto.allowManualAttendance ?? existing.allowManualAttendance,
            allowEarlyCheckIn: dto.allowEarlyCheckIn ?? existing.allowEarlyCheckIn,
            allowLateCheckOut: dto.allowLateCheckOut ?? existing.allowLateCheckOut,
            allowOvertime: dto.allowOvertime ?? existing.allowOvertime,
            allowedIpRanges: dto.allowedIpRanges !== undefined
              ? (dto.allowedIpRanges ?? Prisma.JsonNull)
              : (existing.allowedIpRanges ?? Prisma.JsonNull),
            createdBy: actorId,
          },
        });
      } else {
        // In-place update (no date change — safe to overwrite non-historical fields)
        updated = await tx.attendancePolicy.update({
          where: {
            id,
            tenantId,
            ...(expectedVersion !== undefined ? { rowVersion: expectedVersion } : {}),
          },
          data: {
            ...(dto.name !== undefined ? { name: dto.name } : {}),
            ...(dto.description !== undefined ? { description: dto.description } : {}),
            ...(dto.effectiveTo !== undefined ? { effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null } : {}),
            ...(dto.workingMinutesPerDay !== undefined ? { workingMinutesPerDay: dto.workingMinutesPerDay } : {}),
            ...(dto.workStartTime !== undefined ? { workStartTime: dto.workStartTime } : {}),
            ...(dto.workEndTime !== undefined ? { workEndTime: dto.workEndTime } : {}),
            ...(dto.graceMinutes !== undefined ? { graceMinutes: dto.graceMinutes } : {}),
            ...(dto.lateToleranceMinutes !== undefined ? { lateToleranceMinutes: dto.lateToleranceMinutes } : {}),
            ...(dto.earlyDepartureToleranceMinutes !== undefined ? { earlyDepartureToleranceMinutes: dto.earlyDepartureToleranceMinutes } : {}),
            ...(dto.halfDayMinutes !== undefined ? { halfDayMinutes: dto.halfDayMinutes } : {}),
            ...(dto.minimumWorkingMinutes !== undefined ? { minimumWorkingMinutes: dto.minimumWorkingMinutes } : {}),
            ...(dto.overtimeThresholdMinutes !== undefined ? { overtimeThresholdMinutes: dto.overtimeThresholdMinutes } : {}),
            ...(dto.roundingStrategy !== undefined ? { roundingStrategy: dto.roundingStrategy } : {}),
            ...(dto.weekendDefinition !== undefined ? { weekendDefinition: dto.weekendDefinition } : {}),
            ...(dto.timezone !== undefined ? { timezone: dto.timezone } : {}),
            ...(dto.allowManualAttendance !== undefined ? { allowManualAttendance: dto.allowManualAttendance } : {}),
            ...(dto.allowEarlyCheckIn !== undefined ? { allowEarlyCheckIn: dto.allowEarlyCheckIn } : {}),
            ...(dto.allowLateCheckOut !== undefined ? { allowLateCheckOut: dto.allowLateCheckOut } : {}),
            ...(dto.allowOvertime !== undefined ? { allowOvertime: dto.allowOvertime } : {}),
            ...(dto.allowedIpRanges !== undefined ? { allowedIpRanges: dto.allowedIpRanges } : {}),
            updatedBy: actorId,
            rowVersion: { increment: 1 },
            updatedAt: new Date(),
          },
        });
      }

      await tx.outboxEvent.create({
        data: {
          tenantId,
          eventId: randomUUID(),
          eventType: 'AttendancePolicyUpdated.v1',
          payload: { policyId: updated.id, tenantId, correlationId },
        },
      });

      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId,
          actorType: 'user',
          actorEmail,
          module: 'ATTENDANCE',
          action: isVersionBump ? 'AttendancePolicyActivated' : 'AttendancePolicyUpdated',
          resourceType: 'attendance_policy',
          resourceId: updated.id,
          before: before as unknown as Prisma.InputJsonValue,
          after: updated as unknown as Prisma.InputJsonValue,
          correlationId,
          severity: 'INFO',
          occurredAt: new Date(),
        },
      });

      return updated;
    });

    return policy;
  }

  async delete(
    id: string,
    actorId: string,
    actorEmail: string,
    tenantId: string,
    correlationId: string,
  ): Promise<void> {
    const existing = await this.findById(id, tenantId);

    await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      await tx.attendancePolicy.update({
        where: { id, tenantId },
        data: {
          deletedAt: new Date(),
          isCurrent: false,
          updatedBy: actorId,
          rowVersion: { increment: 1 },
          updatedAt: new Date(),
        },
      });

      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId,
          actorType: 'user',
          actorEmail,
          module: 'ATTENDANCE',
          action: 'AttendancePolicyArchived',
          resourceType: 'attendance_policy',
          resourceId: id,
          before: existing as unknown as Prisma.InputJsonValue,
          correlationId,
          severity: 'WARNING',
          occurredAt: new Date(),
        },
      });
    });
  }

  private validateMinutes(dto: {
    workingMinutesPerDay: number;
    halfDayMinutes: number;
    minimumWorkingMinutes: number;
    overtimeThresholdMinutes: number;
    graceMinutes: number;
    lateToleranceMinutes: number;
    earlyDepartureToleranceMinutes: number;
  }): void {
    if (dto.halfDayMinutes >= dto.workingMinutesPerDay) {
      throw new AppException({
        code: ERROR_CODES.VALIDATION_FAILED,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'halfDayMinutes must be less than workingMinutesPerDay',
      });
    }
    if (dto.minimumWorkingMinutes > dto.workingMinutesPerDay) {
      throw new AppException({
        code: ERROR_CODES.VALIDATION_FAILED,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'minimumWorkingMinutes cannot exceed workingMinutesPerDay',
      });
    }
  }

  private scopeLabel(policy: AttendancePolicy): string {
    if (policy.branchId) return `branch:${policy.branchId}`;
    if (policy.legalEntityId) return `entity:${policy.legalEntityId}`;
    return `tenant:${policy.tenantId}`;
  }
}
