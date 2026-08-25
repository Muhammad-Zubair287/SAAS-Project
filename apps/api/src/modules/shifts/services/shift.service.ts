import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma, type Shift } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import {
  AuditActorType,
  AuditEventSeverity,
} from '../../../common/enums/platform.enum';
import { createPaginatedResponse } from '../../../common/utils/response.helper';
import { ShiftRepository } from '../repositories/shift.repository';
import { ShiftAssignmentRepository } from '../repositories/shift-assignment.repository';
import {
  SHIFT_EVENTS,
  SHIFT_MATERIAL_FIELDS,
  SHIFT_STATUS,
  SHIFT_TIME_PATTERN,
} from '../constants/shift.constants';
import {
  toShiftResponse,
  type CreateShiftDto,
  type ListShiftsDto,
  type ShiftResponseDto,
  type UpdateShiftDto,
} from '../dto';

function parseExpectedRowVersion(ifMatch: string | undefined): bigint {
  if (ifMatch === undefined || !ifMatch.trim()) {
    throw new AppException({
      code: ERROR_CODES.BAD_REQUEST,
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'If-Match header with the current rowVersion is required.',
    });
  }
  const raw = ifMatch.trim();
  if (raw === '*') {
    throw new AppException({
      code: ERROR_CODES.BAD_REQUEST,
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Wildcard If-Match (*) is not allowed for shift mutations.',
    });
  }
  const unquoted =
    raw.startsWith('"') && raw.endsWith('"') && raw.length >= 2
      ? raw.slice(1, -1)
      : raw;
  try {
    return BigInt(unquoted);
  } catch {
    throw new AppException({
      code: ERROR_CODES.BAD_REQUEST,
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'If-Match must be a numeric rowVersion.',
    });
  }
}

function versionConflict(): never {
  throw new AppException({
    code: ERROR_CODES.VERSION_CONFLICT,
    message: 'Concurrent modification detected. Reload and try again.',
    statusCode: HttpStatus.PRECONDITION_FAILED,
  });
}

function toDateOnly(isoDate: string): Date {
  return new Date(`${isoDate.slice(0, 10)}T00:00:00.000Z`);
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

@Injectable()
export class ShiftService {
  private readonly logger = new Logger(ShiftService.name);

  constructor(
    private readonly shiftRepo: ShiftRepository,
    private readonly assignmentRepo: ShiftAssignmentRepository,
    private readonly prisma: PrismaService,
  ) {}

  async list(tenantId: string, query: ListShiftsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { data, total } = await this.shiftRepo.findMany(tenantId, query);
    const today = new Date();
    const asOf = new Date(
      `${today.toISOString().slice(0, 10)}T00:00:00.000Z`,
    );
    const counts = await this.assignmentRepo.countActiveByShiftIds(
      tenantId,
      data.map((s) => s.id),
      asOf,
    );
    return createPaginatedResponse(
      data.map((row) =>
        toShiftResponse(row, {
          activeAssignmentCount: counts.get(row.id) ?? 0,
        }),
      ),
      total,
      page,
      pageSize,
    );
  }

  async getById(tenantId: string, shiftId: string): Promise<ShiftResponseDto> {
    const shift = await this.requireShift(tenantId, shiftId);
    return toShiftResponse(shift);
  }

  async create(
    tenantId: string,
    dto: CreateShiftDto,
    actorId: string,
    actorEmail: string,
    correlationId: string,
  ): Promise<ShiftResponseDto> {
    const code = normalizeCode(dto.code);
    this.validateSchedule({
      startLocalTime: dto.startLocalTime,
      endLocalTime: dto.endLocalTime,
      crossesMidnight: dto.crossesMidnight ?? false,
      requiredMinutes: dto.requiredMinutes,
      breakMinutes: dto.breakMinutes ?? 0,
      checkInWindowBeforeMinutes: dto.checkInWindowBeforeMinutes ?? 0,
      checkInWindowAfterMinutes: dto.checkInWindowAfterMinutes ?? 0,
      checkOutWindowAfterMinutes: dto.checkOutWindowAfterMinutes ?? 0,
      effectiveFrom: dto.effectiveFrom,
      effectiveTo: dto.effectiveTo,
    });
    await this.requireUsablePolicy(tenantId, dto.attendancePolicyId);

    const existing = await this.shiftRepo.findLatestByCode(tenantId, code);
    if (existing) {
      throw new AppException({
        code: ERROR_CODES.SHIFT_CODE_CONFLICT,
        statusCode: HttpStatus.CONFLICT,
        message: `Shift code "${code}" already exists. Create a new version via PATCH on an existing shift.`,
      });
    }

    const created = await this.prisma.withTenantTransaction(
      tenantId,
      async (tx) => {
        const row = await tx.shift.create({
          data: {
            tenantId,
            code,
            name: dto.name.trim(),
            version: 1,
            status: SHIFT_STATUS.ACTIVE,
            startLocalTime: dto.startLocalTime,
            endLocalTime: dto.endLocalTime,
            crossesMidnight: dto.crossesMidnight ?? false,
            requiredMinutes: dto.requiredMinutes,
            breakMinutes: dto.breakMinutes ?? 0,
            breakPaid: dto.breakPaid ?? false,
            checkInWindowBeforeMinutes: dto.checkInWindowBeforeMinutes ?? 0,
            checkInWindowAfterMinutes: dto.checkInWindowAfterMinutes ?? 0,
            checkOutWindowAfterMinutes: dto.checkOutWindowAfterMinutes ?? 0,
            attendancePolicyId: dto.attendancePolicyId,
            effectiveFrom: toDateOnly(dto.effectiveFrom),
            effectiveTo: dto.effectiveTo ? toDateOnly(dto.effectiveTo) : null,
            createdBy: actorId,
            updatedBy: actorId,
          },
        });

        await tx.auditEvent.create({
          data: {
            tenantId,
            actorId,
            actorType: AuditActorType.USER,
            actorEmail,
            module: 'SHIFT',
            action: 'ShiftCreated',
            resourceType: 'shift',
            resourceId: row.id,
            after: this.auditSnapshot(row) as Prisma.InputJsonValue,
            correlationId,
            severity: AuditEventSeverity.INFO,
            occurredAt: new Date(),
          },
        });

        const eventPayload = {
          tenantId,
          shiftId: row.id,
          code: row.code,
          version: row.version,
          effectiveFrom: row.effectiveFrom.toISOString().slice(0, 10),
          correlationId,
        };

        await tx.outboxEvent.create({
          data: {
            tenantId,
            eventId: randomUUID(),
            eventType: SHIFT_EVENTS.CREATED,
            payload: eventPayload,
          },
        });
        await tx.outboxEvent.create({
          data: {
            tenantId,
            eventId: randomUUID(),
            eventType: SHIFT_EVENTS.VERSION_PUBLISHED,
            payload: eventPayload,
          },
        });

        return row;
      },
    );

    this.logger.log(`Shift created ${created.id} code=${created.code} v1`);
    return toShiftResponse(created);
  }

  async update(
    tenantId: string,
    shiftId: string,
    dto: UpdateShiftDto,
    ifMatch: string | undefined,
    actorId: string,
    actorEmail: string,
    correlationId: string,
  ): Promise<ShiftResponseDto> {
    const expected = parseExpectedRowVersion(ifMatch);
    const current = await this.requireShift(tenantId, shiftId);

    if (current.rowVersion !== expected) {
      versionConflict();
    }

    // Deactivate (or reactivate) — same-row status change
    if (dto.status !== undefined && this.isOnlyStatusChange(dto)) {
      return this.updateStatus(
        tenantId,
        current,
        expected,
        dto.status,
        actorId,
        actorEmail,
        correlationId,
      );
    }

    const merged = this.mergeUpdate(current, dto);
    this.validateSchedule(merged);

    if (dto.attendancePolicyId) {
      await this.requireUsablePolicy(tenantId, dto.attendancePolicyId);
    }

    const material = this.hasMaterialChanges(current, merged);
    const nameOnly =
      !material &&
      dto.name !== undefined &&
      dto.name.trim() !== current.name &&
      Object.keys(dto).every((k) => k === 'name' || dto[k as keyof UpdateShiftDto] === undefined);

    // Phase 1 rule: ACTIVE + any material schedule change → new business version.
    if (
      current.status === SHIFT_STATUS.ACTIVE &&
      material
    ) {
      return this.createNewVersion(
        tenantId,
        current,
        expected,
        merged,
        actorId,
        actorEmail,
        correlationId,
      );
    }

    // Non-material (name) or inactive-row metadata: same-row update
    try {
      const updated = await this.prisma.withTenantTransaction(
        tenantId,
        async (tx) => {
          const row = await tx.shift.update({
            where: {
              id: current.id,
              tenantId,
              rowVersion: expected,
            } as Prisma.ShiftWhereUniqueInput,
            data: {
              name: merged.name,
              ...(nameOnly
                ? {}
                : {
                    startLocalTime: merged.startLocalTime,
                    endLocalTime: merged.endLocalTime,
                    crossesMidnight: merged.crossesMidnight,
                    requiredMinutes: merged.requiredMinutes,
                    breakMinutes: merged.breakMinutes,
                    breakPaid: merged.breakPaid,
                    checkInWindowBeforeMinutes: merged.checkInWindowBeforeMinutes,
                    checkInWindowAfterMinutes: merged.checkInWindowAfterMinutes,
                    checkOutWindowAfterMinutes: merged.checkOutWindowAfterMinutes,
                    attendancePolicyId: merged.attendancePolicyId,
                    effectiveFrom: merged.effectiveFrom,
                    effectiveTo: merged.effectiveTo,
                  }),
              ...(dto.status ? { status: dto.status } : {}),
              updatedBy: actorId,
              rowVersion: { increment: 1 },
            },
          });

          await tx.auditEvent.create({
            data: {
              tenantId,
              actorId,
              actorType: AuditActorType.USER,
              actorEmail,
              module: 'SHIFT',
              action: 'ShiftMetadataUpdated',
              resourceType: 'shift',
              resourceId: row.id,
              before: this.auditSnapshot(current) as Prisma.InputJsonValue,
              after: this.auditSnapshot(row) as Prisma.InputJsonValue,
              correlationId,
              severity: AuditEventSeverity.INFO,
              occurredAt: new Date(),
            },
          });

          return row;
        },
      );
      return toShiftResponse(updated);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        versionConflict();
      }
      throw err;
    }
  }

  private async updateStatus(
    tenantId: string,
    current: Shift,
    expected: bigint,
    status: string,
    actorId: string,
    actorEmail: string,
    correlationId: string,
  ): Promise<ShiftResponseDto> {
    try {
      const updated = await this.prisma.withTenantTransaction(
        tenantId,
        async (tx) => {
          const row = await tx.shift.update({
            where: {
              id: current.id,
              tenantId,
              rowVersion: expected,
            } as Prisma.ShiftWhereUniqueInput,
            data: {
              status,
              updatedBy: actorId,
              rowVersion: { increment: 1 },
            },
          });

          await tx.auditEvent.create({
            data: {
              tenantId,
              actorId,
              actorType: AuditActorType.USER,
              actorEmail,
              module: 'SHIFT',
              action:
                status === SHIFT_STATUS.INACTIVE
                  ? 'ShiftDeactivated'
                  : 'ShiftReactivated',
              resourceType: 'shift',
              resourceId: row.id,
              before: { status: current.status } as Prisma.InputJsonValue,
              after: { status: row.status } as Prisma.InputJsonValue,
              correlationId,
              severity: AuditEventSeverity.INFO,
              occurredAt: new Date(),
            },
          });

          return row;
        },
      );
      return toShiftResponse(updated);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        versionConflict();
      }
      throw err;
    }
  }

  private async createNewVersion(
    tenantId: string,
    current: Shift,
    expected: bigint,
    merged: MergedShift,
    actorId: string,
    actorEmail: string,
    correlationId: string,
  ): Promise<ShiftResponseDto> {
    const newVersion = current.version + 1;
    // Close previous version effectiveTo at new version's effectiveFrom when open-ended
    const previousEffectiveTo =
      current.effectiveTo ?? merged.effectiveFrom;

    try {
      const created = await this.prisma.withTenantTransaction(
        tenantId,
        async (tx) => {
          // Touch current rowVersion to consume If-Match / detect concurrent edits
          await tx.shift.update({
            where: {
              id: current.id,
              tenantId,
              rowVersion: expected,
            } as Prisma.ShiftWhereUniqueInput,
            data: {
              effectiveTo: previousEffectiveTo,
              updatedBy: actorId,
              rowVersion: { increment: 1 },
            },
          });

          const row = await tx.shift.create({
            data: {
              tenantId,
              code: current.code,
              name: merged.name,
              version: newVersion,
              status: SHIFT_STATUS.ACTIVE,
              startLocalTime: merged.startLocalTime,
              endLocalTime: merged.endLocalTime,
              crossesMidnight: merged.crossesMidnight,
              requiredMinutes: merged.requiredMinutes,
              breakMinutes: merged.breakMinutes,
              breakPaid: merged.breakPaid,
              checkInWindowBeforeMinutes: merged.checkInWindowBeforeMinutes,
              checkInWindowAfterMinutes: merged.checkInWindowAfterMinutes,
              checkOutWindowAfterMinutes: merged.checkOutWindowAfterMinutes,
              attendancePolicyId: merged.attendancePolicyId,
              effectiveFrom: merged.effectiveFrom,
              effectiveTo: merged.effectiveTo,
              createdBy: actorId,
              updatedBy: actorId,
            },
          });

          await tx.auditEvent.create({
            data: {
              tenantId,
              actorId,
              actorType: AuditActorType.USER,
              actorEmail,
              module: 'SHIFT',
              action: 'ShiftVersionPublished',
              resourceType: 'shift',
              resourceId: row.id,
              before: this.auditSnapshot(current) as Prisma.InputJsonValue,
              after: this.auditSnapshot(row) as Prisma.InputJsonValue,
              correlationId,
              severity: AuditEventSeverity.INFO,
              occurredAt: new Date(),
            },
          });

          await tx.outboxEvent.create({
            data: {
              tenantId,
              eventId: randomUUID(),
              eventType: SHIFT_EVENTS.VERSION_PUBLISHED,
              payload: {
                tenantId,
                shiftId: row.id,
                previousShiftId: current.id,
                code: row.code,
                version: row.version,
                effectiveFrom: row.effectiveFrom.toISOString().slice(0, 10),
                correlationId,
              },
            },
          });

          return row;
        },
      );

      return toShiftResponse(created);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        versionConflict();
      }
      throw err;
    }
  }

  private async requireShift(tenantId: string, shiftId: string): Promise<Shift> {
    const shift = await this.shiftRepo.findById(shiftId, tenantId);
    if (!shift) {
      throw new AppException({
        code: ERROR_CODES.SHIFT_NOT_FOUND,
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Shift not found.',
      });
    }
    return shift;
  }

  private async requireUsablePolicy(
    tenantId: string,
    policyId: string,
  ): Promise<void> {
    const policy = await this.prisma.attendancePolicy.findFirst({
      where: { id: policyId, tenantId, deletedAt: null },
    });
    if (!policy) {
      throw new AppException({
        code: ERROR_CODES.SHIFT_POLICY_NOT_FOUND,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Attendance policy not found for this organisation.',
      });
    }
    if (!policy.isCurrent) {
      throw new AppException({
        code: ERROR_CODES.SHIFT_POLICY_INACTIVE,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Attendance policy is not current and cannot be linked to a shift.',
      });
    }
  }

  private validateSchedule(input: {
    startLocalTime: string;
    endLocalTime: string;
    crossesMidnight: boolean;
    requiredMinutes: number;
    breakMinutes: number;
    checkInWindowBeforeMinutes: number;
    checkInWindowAfterMinutes: number;
    checkOutWindowAfterMinutes: number;
    effectiveFrom: Date | string;
    effectiveTo?: Date | string | null;
  }): void {
    if (!SHIFT_TIME_PATTERN.test(input.startLocalTime)) {
      throw new AppException({
        code: ERROR_CODES.SHIFT_INVALID_TIMES,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'startLocalTime must be HH:MM.',
      });
    }
    if (!SHIFT_TIME_PATTERN.test(input.endLocalTime)) {
      throw new AppException({
        code: ERROR_CODES.SHIFT_INVALID_TIMES,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'endLocalTime must be HH:MM.',
      });
    }

    const startMins = this.toMinutes(input.startLocalTime);
    const endMins = this.toMinutes(input.endLocalTime);
    const crosses = input.crossesMidnight;

    if (!crosses && endMins <= startMins) {
      throw new AppException({
        code: ERROR_CODES.SHIFT_INVALID_TIMES,
        statusCode: HttpStatus.BAD_REQUEST,
        message:
          'For day shifts, end time must be after start time. Set overnight for shifts that cross midnight.',
      });
    }
    if (crosses && endMins >= startMins) {
      throw new AppException({
        code: ERROR_CODES.SHIFT_INVALID_TIMES,
        statusCode: HttpStatus.BAD_REQUEST,
        message:
          'Overnight shifts must end on the following calendar day (end time earlier than start time).',
      });
    }

    if (input.requiredMinutes < 1) {
      throw new AppException({
        code: ERROR_CODES.BAD_REQUEST,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'requiredMinutes must be greater than 0.',
      });
    }
    if (input.breakMinutes < 0) {
      throw new AppException({
        code: ERROR_CODES.BAD_REQUEST,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'breakMinutes cannot be negative.',
      });
    }
    for (const [label, value] of [
      ['checkInWindowBeforeMinutes', input.checkInWindowBeforeMinutes],
      ['checkInWindowAfterMinutes', input.checkInWindowAfterMinutes],
      ['checkOutWindowAfterMinutes', input.checkOutWindowAfterMinutes],
    ] as const) {
      if (value < 0) {
        throw new AppException({
          code: ERROR_CODES.BAD_REQUEST,
          statusCode: HttpStatus.BAD_REQUEST,
          message: `${label} cannot be negative.`,
        });
      }
    }

    const from =
      typeof input.effectiveFrom === 'string'
        ? toDateOnly(input.effectiveFrom)
        : input.effectiveFrom;
    const to =
      input.effectiveTo == null
        ? null
        : typeof input.effectiveTo === 'string'
          ? toDateOnly(input.effectiveTo)
          : input.effectiveTo;

    if (to && to <= from) {
      throw new AppException({
        code: ERROR_CODES.SHIFT_INVALID_DATES,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'effectiveTo must be after effectiveFrom.',
      });
    }
  }

  private toMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  }

  private isOnlyStatusChange(dto: UpdateShiftDto): boolean {
    const keys = Object.keys(dto).filter(
      (k) => dto[k as keyof UpdateShiftDto] !== undefined,
    );
    return keys.length === 1 && keys[0] === 'status';
  }

  private mergeUpdate(current: Shift, dto: UpdateShiftDto): MergedShift {
    return {
      name: dto.name?.trim() ?? current.name,
      startLocalTime: dto.startLocalTime ?? current.startLocalTime,
      endLocalTime: dto.endLocalTime ?? current.endLocalTime,
      crossesMidnight: dto.crossesMidnight ?? current.crossesMidnight,
      requiredMinutes: dto.requiredMinutes ?? current.requiredMinutes,
      breakMinutes: dto.breakMinutes ?? current.breakMinutes,
      breakPaid: dto.breakPaid ?? current.breakPaid,
      checkInWindowBeforeMinutes:
        dto.checkInWindowBeforeMinutes ?? current.checkInWindowBeforeMinutes,
      checkInWindowAfterMinutes:
        dto.checkInWindowAfterMinutes ?? current.checkInWindowAfterMinutes,
      checkOutWindowAfterMinutes:
        dto.checkOutWindowAfterMinutes ?? current.checkOutWindowAfterMinutes,
      attendancePolicyId: dto.attendancePolicyId ?? current.attendancePolicyId,
      effectiveFrom: dto.effectiveFrom
        ? toDateOnly(dto.effectiveFrom)
        : current.effectiveFrom,
      effectiveTo:
        dto.effectiveTo === undefined
          ? current.effectiveTo
          : dto.effectiveTo
            ? toDateOnly(dto.effectiveTo)
            : null,
    };
  }

  private hasMaterialChanges(current: Shift, merged: MergedShift): boolean {
    const currentMap: Record<string, unknown> = {
      startLocalTime: current.startLocalTime,
      endLocalTime: current.endLocalTime,
      crossesMidnight: current.crossesMidnight,
      requiredMinutes: current.requiredMinutes,
      breakMinutes: current.breakMinutes,
      breakPaid: current.breakPaid,
      checkInWindowBeforeMinutes: current.checkInWindowBeforeMinutes,
      checkInWindowAfterMinutes: current.checkInWindowAfterMinutes,
      checkOutWindowAfterMinutes: current.checkOutWindowAfterMinutes,
      attendancePolicyId: current.attendancePolicyId,
      effectiveFrom: current.effectiveFrom.toISOString().slice(0, 10),
      effectiveTo: current.effectiveTo
        ? current.effectiveTo.toISOString().slice(0, 10)
        : null,
    };
    const mergedMap: Record<string, unknown> = {
      startLocalTime: merged.startLocalTime,
      endLocalTime: merged.endLocalTime,
      crossesMidnight: merged.crossesMidnight,
      requiredMinutes: merged.requiredMinutes,
      breakMinutes: merged.breakMinutes,
      breakPaid: merged.breakPaid,
      checkInWindowBeforeMinutes: merged.checkInWindowBeforeMinutes,
      checkInWindowAfterMinutes: merged.checkInWindowAfterMinutes,
      checkOutWindowAfterMinutes: merged.checkOutWindowAfterMinutes,
      attendancePolicyId: merged.attendancePolicyId,
      effectiveFrom: merged.effectiveFrom.toISOString().slice(0, 10),
      effectiveTo: merged.effectiveTo
        ? merged.effectiveTo.toISOString().slice(0, 10)
        : null,
    };

    return SHIFT_MATERIAL_FIELDS.some(
      (field) => currentMap[field] !== mergedMap[field],
    );
  }

  private auditSnapshot(row: Shift) {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      version: row.version,
      status: row.status,
      startLocalTime: row.startLocalTime,
      endLocalTime: row.endLocalTime,
      crossesMidnight: row.crossesMidnight,
      requiredMinutes: row.requiredMinutes,
      breakMinutes: row.breakMinutes,
      breakPaid: row.breakPaid,
      attendancePolicyId: row.attendancePolicyId,
      effectiveFrom: row.effectiveFrom.toISOString().slice(0, 10),
      effectiveTo: row.effectiveTo
        ? row.effectiveTo.toISOString().slice(0, 10)
        : null,
      rowVersion: row.rowVersion.toString(),
    };
  }
}

interface MergedShift {
  name: string;
  startLocalTime: string;
  endLocalTime: string;
  crossesMidnight: boolean;
  requiredMinutes: number;
  breakMinutes: number;
  breakPaid: boolean;
  checkInWindowBeforeMinutes: number;
  checkInWindowAfterMinutes: number;
  checkOutWindowAfterMinutes: number;
  attendancePolicyId: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
}
