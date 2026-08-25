import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Prisma, type ShiftAssignment } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { ROSTER_PERMISSIONS } from '../../../common/constants/permissions.constants';
import {
  AuditActorType,
  AuditEventSeverity,
} from '../../../common/enums/platform.enum';
import { createPaginatedResponse } from '../../../common/utils/response.helper';
import { AuthorizationService } from '../../authentication/services/authorization.service';
import { SHIFT_STATUS } from '../constants/shift.constants';
import {
  SHIFT_ASSIGNMENT_SOURCE,
  dateOnlyIso,
  rangesOverlap,
  toDateOnly,
} from '../constants/shift-assignment.constants';
import {
  toShiftAssignmentResponse,
  type AssignmentConflictDto,
  type CreateShiftAssignmentDto,
  type ListShiftAssignmentsDto,
  type ShiftAssignmentBulkResultDto,
  type ShiftAssignmentResponseDto,
  type ShiftAssignmentWithRelations,
  type UpdateShiftAssignmentDto,
} from '../dto/shift-assignment.dto';
import { ShiftAssignmentRepository } from '../repositories/shift-assignment.repository';

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
      message: 'Wildcard If-Match (*) is not allowed for assignment mutations.',
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

@Injectable()
export class ShiftAssignmentService {
  private readonly logger = new Logger(ShiftAssignmentService.name);

  constructor(
    private readonly repo: ShiftAssignmentRepository,
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
  ) {}

  async list(tenantId: string, query: ListShiftAssignmentsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { data, total } = await this.repo.findMany(tenantId, query);
    return createPaginatedResponse(
      data.map(toShiftAssignmentResponse),
      total,
      page,
      pageSize,
    );
  }

  async getById(
    tenantId: string,
    id: string,
  ): Promise<ShiftAssignmentResponseDto> {
    const row = await this.requireAssignment(tenantId, id);
    return toShiftAssignmentResponse(row);
  }

  async assign(
    tenantId: string,
    dto: CreateShiftAssignmentDto,
    actorId: string,
    actorEmail: string,
    correlationId: string,
    actorUserId: string,
    actorPlatformRole?: string | null,
  ): Promise<ShiftAssignmentBulkResultDto> {
    const hasEmployees = (dto.employeeIds?.length ?? 0) > 0;
    const hasDepartment = !!dto.departmentId;
    if (hasEmployees === hasDepartment) {
      throw new AppException({
        code: ERROR_CODES.SHIFT_ASSIGNMENT_TARGET_REQUIRED,
        statusCode: HttpStatus.BAD_REQUEST,
        message:
          'Provide either employeeIds or departmentId (exactly one target mode).',
      });
    }

    if (dto.overrideExisting) {
      await this.requireOverridePermission(
        actorUserId,
        tenantId,
        actorPlatformRole,
      );
    }

    const effectiveFrom = toDateOnly(dto.effectiveFrom);
    const effectiveTo = dto.effectiveTo ? toDateOnly(dto.effectiveTo) : null;
    this.assertRange(effectiveFrom, effectiveTo);

    await this.requireAssignableShift(
      tenantId,
      dto.shiftId,
      effectiveFrom,
      effectiveTo,
    );
    if (dto.branchId) {
      await this.requireBranch(tenantId, dto.branchId);
    }

    let employeeIds: string[];
    let source: string;
    let sourceReferenceId: string | null = null;
    let target: 'EMPLOYEES' | 'DEPARTMENT';

    if (hasDepartment) {
      target = 'DEPARTMENT';
      source = SHIFT_ASSIGNMENT_SOURCE.DEPARTMENT;
      sourceReferenceId = dto.departmentId!;
      employeeIds = await this.resolveDepartmentEmployees(
        tenantId,
        dto.departmentId!,
      );
      if (employeeIds.length === 0) {
        throw new AppException({
          code: ERROR_CODES.SHIFT_ASSIGNMENT_DEPARTMENT_EMPTY,
          statusCode: HttpStatus.BAD_REQUEST,
          message:
            'Department has no current ACTIVE employees to assign (snapshot expansion).',
        });
      }
    } else {
      target = 'EMPLOYEES';
      source = SHIFT_ASSIGNMENT_SOURCE.INDIVIDUAL;
      employeeIds = [...new Set(dto.employeeIds!)];
      await this.requireEligibleEmployees(tenantId, employeeIds);
    }

    const allConflicts: AssignmentConflictDto[] = [];
    const overlapsByEmployee = new Map<string, ShiftAssignment[]>();

    for (const employeeId of employeeIds) {
      const candidates = await this.repo.findOverlapCandidates(
        tenantId,
        employeeId,
        effectiveFrom,
        effectiveTo,
      );
      const overlaps = candidates.filter((c) =>
        rangesOverlap(
          c.effectiveFrom,
          c.effectiveTo,
          effectiveFrom,
          effectiveTo,
        ),
      );
      if (overlaps.length) {
        overlapsByEmployee.set(employeeId, overlaps);
        for (const o of overlaps) {
          allConflicts.push({
            employeeId,
            conflictingAssignmentId: o.id,
            shiftId: o.shiftId,
            effectiveFrom: dateOnlyIso(o.effectiveFrom),
            effectiveTo: o.effectiveTo ? dateOnlyIso(o.effectiveTo) : null,
          });
        }
      }
    }

    if (allConflicts.length && !dto.overrideExisting) {
      throw new AppException({
        code: ERROR_CODES.SHIFT_ASSIGNMENT_OVERLAP,
        statusCode: HttpStatus.CONFLICT,
        message:
          'One or more employees already have overlapping default shift assignments.',
        details: { conflicts: allConflicts },
      });
    }

    let overridden = 0;
    const created = await this.prisma.withTenantTransaction(
      tenantId,
      async (tx) => {
        if (dto.overrideExisting) {
          for (const [, overlaps] of overlapsByEmployee) {
            for (const overlap of overlaps) {
              await this.truncateOverlap(
                tx,
                tenantId,
                overlap,
                effectiveFrom,
                actorId,
                actorEmail,
                correlationId,
              );
              overridden += 1;
            }
          }
        }

        const rows: ShiftAssignment[] = [];
        for (const employeeId of employeeIds) {
          const row = await tx.shiftAssignment.create({
            data: {
              tenantId,
              employeeId,
              shiftId: dto.shiftId,
              branchId: dto.branchId ?? null,
              effectiveFrom,
              effectiveTo,
              assignmentSource: source,
              sourceReferenceId,
              createdBy: actorId,
              updatedBy: actorId,
            },
          });
          rows.push(row);
        }

        await tx.auditEvent.create({
          data: {
            tenantId,
            actorId,
            actorType: AuditActorType.USER,
            actorEmail,
            module: 'SHIFT',
            action:
              target === 'DEPARTMENT'
                ? 'ShiftAssignmentDepartmentBulk'
                : 'ShiftAssignmentCreated',
            resourceType: 'shift_assignment',
            resourceId: rows[0]?.id ?? sourceReferenceId ?? dto.shiftId,
            before: Prisma.JsonNull,
            after: {
              target,
              departmentId: sourceReferenceId,
              shiftId: dto.shiftId,
              effectiveFrom: dateOnlyIso(effectiveFrom),
              effectiveTo: effectiveTo ? dateOnlyIso(effectiveTo) : null,
              employeesResolved: employeeIds.length,
              created: rows.length,
              overridden,
              assignmentSource: source,
              overrideExisting: !!dto.overrideExisting,
              notificationRequested: !!dto.notificationRequested,
            } as Prisma.InputJsonValue,
            correlationId,
            severity: AuditEventSeverity.INFO,
            occurredAt: new Date(),
          },
        });

        return rows;
      },
    );

    this.logger.log(
      `ShiftAssignment created count=${created.length} target=${target} override=${overridden}`,
    );

    const enriched =
      created.length === 0
        ? []
        : await this.prisma.shiftAssignment.findMany({
            where: {
              tenantId,
              id: { in: created.map((r) => r.id) },
            },
            include: {
              employee: { select: { displayName: true } },
              shift: { select: { name: true, code: true } },
              branch: { select: { name: true } },
            },
          });

    return {
      target,
      departmentId: sourceReferenceId,
      employeesResolved: employeeIds.length,
      created: created.length,
      overridden,
      assignments: enriched.map(toShiftAssignmentResponse),
      notificationRequested: !!dto.notificationRequested,
    };
  }

  async update(
    tenantId: string,
    assignmentId: string,
    dto: UpdateShiftAssignmentDto,
    ifMatch: string | undefined,
    actorId: string,
    actorEmail: string,
    correlationId: string,
    actorUserId: string,
    actorPlatformRole?: string | null,
  ): Promise<ShiftAssignmentResponseDto> {
    const expected = parseExpectedRowVersion(ifMatch);
    const current = await this.requireAssignment(tenantId, assignmentId);

    if (current.rowVersion !== expected) {
      versionConflict();
    }

    if (dto.overrideExisting) {
      await this.requireOverridePermission(
        actorUserId,
        tenantId,
        actorPlatformRole,
      );
    }

    const effectiveFrom = dto.effectiveFrom
      ? toDateOnly(dto.effectiveFrom)
      : current.effectiveFrom;
    const effectiveTo =
      dto.effectiveTo === undefined
        ? current.effectiveTo
        : dto.effectiveTo === null
          ? null
          : toDateOnly(dto.effectiveTo);
    this.assertRange(effectiveFrom, effectiveTo);

    const shiftId = dto.shiftId ?? current.shiftId;
    if (dto.shiftId) {
      await this.requireAssignableShift(
        tenantId,
        shiftId,
        effectiveFrom,
        effectiveTo,
      );
    }

    const branchId =
      dto.branchId === undefined ? current.branchId : dto.branchId;
    if (branchId) {
      await this.requireBranch(tenantId, branchId);
    }

    const candidates = await this.repo.findOverlapCandidates(
      tenantId,
      current.employeeId,
      effectiveFrom,
      effectiveTo,
      current.id,
    );
    const overlaps = candidates.filter((c) =>
      rangesOverlap(
        c.effectiveFrom,
        c.effectiveTo,
        effectiveFrom,
        effectiveTo,
      ),
    );

    if (overlaps.length && !dto.overrideExisting) {
      throw new AppException({
        code: ERROR_CODES.SHIFT_ASSIGNMENT_OVERLAP,
        statusCode: HttpStatus.CONFLICT,
        message: 'Updated range overlaps an existing default shift assignment.',
        details: {
          conflicts: overlaps.map((o) => ({
            employeeId: current.employeeId,
            conflictingAssignmentId: o.id,
            shiftId: o.shiftId,
            effectiveFrom: dateOnlyIso(o.effectiveFrom),
            effectiveTo: o.effectiveTo ? dateOnlyIso(o.effectiveTo) : null,
          })),
        },
      });
    }

    try {
      const updated = await this.prisma.withTenantTransaction(
        tenantId,
        async (tx) => {
          if (dto.overrideExisting) {
            for (const overlap of overlaps) {
              await this.truncateOverlap(
                tx,
                tenantId,
                overlap,
                effectiveFrom,
                actorId,
                actorEmail,
                correlationId,
              );
            }
          }

          const row = await tx.shiftAssignment.update({
            where: {
              id: current.id,
              tenantId,
              rowVersion: expected,
            } as Prisma.ShiftAssignmentWhereUniqueInput,
            data: {
              shiftId,
              branchId,
              effectiveFrom,
              effectiveTo,
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
              action: 'ShiftAssignmentUpdated',
              resourceType: 'shift_assignment',
              resourceId: row.id,
              before: this.snapshot(current) as Prisma.InputJsonValue,
              after: this.snapshot(row) as Prisma.InputJsonValue,
              correlationId,
              severity: AuditEventSeverity.INFO,
              occurredAt: new Date(),
            },
          });

          return row;
        },
      );
      const withRelations = await this.requireAssignment(tenantId, updated.id);
      return toShiftAssignmentResponse(withRelations);
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

  private async truncateOverlap(
    tx: Prisma.TransactionClient,
    tenantId: string,
    overlap: ShiftAssignment,
    newFrom: Date,
    actorId: string,
    actorEmail: string,
    correlationId: string,
  ): Promise<void> {
    // Historically reproducible truncation (no supersedesId):
    // - If conflict starts before new range: close at new.effectiveFrom
    // - If conflict starts on/after new range: close as empty range (to = from)
    const nextTo =
      overlap.effectiveFrom < newFrom ? newFrom : overlap.effectiveFrom;

    const updated = await tx.shiftAssignment.update({
      where: { id: overlap.id },
      data: {
        effectiveTo: nextTo,
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
        action: 'ShiftAssignmentOverrideTruncated',
        resourceType: 'shift_assignment',
        resourceId: overlap.id,
        before: this.snapshot(overlap) as Prisma.InputJsonValue,
        after: this.snapshot(updated) as Prisma.InputJsonValue,
        correlationId,
        severity: AuditEventSeverity.INFO,
        occurredAt: new Date(),
      },
    });
  }

  private async requireOverridePermission(
    userId: string,
    tenantId: string,
    platformRole?: string | null,
  ): Promise<void> {
    const resolved = await this.authorization.getEffectivePermissions(
      userId,
      tenantId,
      platformRole ?? null,
    );
    if (
      !this.authorization.hasAllPermissions(resolved.permissions, [
        ROSTER_PERMISSIONS.OVERRIDE,
      ])
    ) {
      throw new AppException({
        code: ERROR_CODES.PERMISSION_DENIED,
        statusCode: HttpStatus.FORBIDDEN,
        message:
          'roster.override is required to override overlapping shift assignments.',
      });
    }
  }

  private assertRange(from: Date, to: Date | null): void {
    if (to && to <= from) {
      throw new AppException({
        code: ERROR_CODES.SHIFT_ASSIGNMENT_INVALID_DATES,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'effectiveTo must be after effectiveFrom (exclusive end).',
      });
    }
  }

  private async requireAssignableShift(
    tenantId: string,
    shiftId: string,
    rangeFrom: Date,
    rangeTo: Date | null,
  ): Promise<void> {
    const shift = await this.prisma.shift.findFirst({
      where: { id: shiftId, tenantId },
    });
    if (!shift) {
      throw new AppException({
        code: ERROR_CODES.SHIFT_NOT_FOUND,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Shift not found for this organisation.',
      });
    }
    if (shift.status !== SHIFT_STATUS.ACTIVE) {
      throw new AppException({
        code: ERROR_CODES.SHIFT_INACTIVE,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Cannot assign an INACTIVE shift to a new assignment.',
      });
    }
    // Shift definition must be effective for the assignment start (and end if bounded)
    if (shift.effectiveFrom > rangeFrom) {
      throw new AppException({
        code: ERROR_CODES.SHIFT_INVALID_DATES,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Shift is not effective for the assignment start date.',
      });
    }
    if (shift.effectiveTo && shift.effectiveTo <= rangeFrom) {
      throw new AppException({
        code: ERROR_CODES.SHIFT_INVALID_DATES,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Shift ends before the assignment start date.',
      });
    }
    if (
      rangeTo &&
      shift.effectiveTo &&
      shift.effectiveTo < rangeTo
    ) {
      throw new AppException({
        code: ERROR_CODES.SHIFT_INVALID_DATES,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Shift effective range does not cover the assignment end.',
      });
    }
  }

  private async requireBranch(tenantId: string, branchId: string): Promise<void> {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId },
    });
    if (!branch) {
      throw new AppException({
        code: ERROR_CODES.SHIFT_ASSIGNMENT_BRANCH_INVALID,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Branch (location) not found for this organisation.',
      });
    }
  }

  private async requireEligibleEmployees(
    tenantId: string,
    employeeIds: string[],
  ): Promise<void> {
    const employees = await this.prisma.employee.findMany({
      where: { tenantId, id: { in: employeeIds } },
      select: { id: true, status: true },
    });
    if (employees.length !== employeeIds.length) {
      throw new AppException({
        code: ERROR_CODES.SHIFT_ASSIGNMENT_EMPLOYEE_INVALID,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'One or more employees were not found in this organisation.',
      });
    }
    const ineligible = employees.filter((e) => e.status !== 'ACTIVE');
    if (ineligible.length) {
      throw new AppException({
        code: ERROR_CODES.SHIFT_ASSIGNMENT_EMPLOYEE_INVALID,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Only ACTIVE employees can receive new shift assignments.',
        details: { employeeIds: ineligible.map((e) => e.id) },
      });
    }
  }

  private async resolveDepartmentEmployees(
    tenantId: string,
    departmentId: string,
  ): Promise<string[]> {
    const dept = await this.prisma.department.findFirst({
      where: { id: departmentId, tenantId },
      select: { id: true },
    });
    if (!dept) {
      throw new AppException({
        code: ERROR_CODES.SHIFT_ASSIGNMENT_EMPLOYEE_INVALID,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Department not found for this organisation.',
      });
    }
    const employees = await this.prisma.employee.findMany({
      where: { tenantId, departmentId, status: 'ACTIVE' },
      select: { id: true },
    });
    return employees.map((e) => e.id);
  }

  private async requireAssignment(
    tenantId: string,
    id: string,
  ): Promise<ShiftAssignmentWithRelations> {
    const row = await this.repo.findById(tenantId, id);
    if (!row) {
      throw new AppException({
        code: ERROR_CODES.SHIFT_ASSIGNMENT_NOT_FOUND,
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Shift assignment not found.',
      });
    }
    return row;
  }

  private snapshot(row: ShiftAssignment | ShiftAssignmentWithRelations) {
    return {
      id: row.id,
      employeeId: row.employeeId,
      shiftId: row.shiftId,
      branchId: row.branchId,
      effectiveFrom: dateOnlyIso(row.effectiveFrom),
      effectiveTo: row.effectiveTo ? dateOnlyIso(row.effectiveTo) : null,
      assignmentSource: row.assignmentSource,
      sourceReferenceId: row.sourceReferenceId,
      rowVersion: row.rowVersion.toString(),
    };
  }
}
