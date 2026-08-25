import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma, type RosterAssignment } from '@prisma/client';
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
import { dateOnlyIso, toDateOnly } from '../constants/shift-assignment.constants';
import {
  ROSTER_ASSIGNMENT_SOURCE,
  ROSTER_EVENTS,
  ROSTER_STATUS,
} from '../constants/roster.constants';
import {
  toRosterAssignmentResponse,
  type CreateRosterAssignmentDto,
  type ListRosterDto,
  type PublishRosterDto,
  type RosterAssignmentResponseDto,
  type RosterAssignmentWithRelations,
  type RosterBulkResultDto,
  type RosterConflictDto,
  type RosterPublishResultDto,
  type UpdateRosterAssignmentDto,
} from '../dto/roster.dto';
import { expandRosterDates } from './roster-recurrence.util';
import { RosterAssignmentRepository } from '../repositories/roster-assignment.repository';

// ─── helpers ─────────────────────────────────────────────────────────────────

function parseExpectedRowVersion(ifMatch: string | undefined): bigint {
  if (!ifMatch?.trim()) {
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
      message: 'Wildcard If-Match (*) is not allowed for roster mutations.',
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

// ─── service ─────────────────────────────────────────────────────────────────

@Injectable()
export class RosterService {
  private readonly logger = new Logger(RosterService.name);

  constructor(
    private readonly repo: RosterAssignmentRepository,
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
  ) {}

  // ── List ────────────────────────────────────────────────────────────────────

  async list(tenantId: string, query: ListRosterDto) {
    const page     = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { data, total } = await this.repo.findMany(tenantId, query);
    return createPaginatedResponse(
      data.map(toRosterAssignmentResponse),
      total,
      page,
      pageSize,
    );
  }

  // ── Get by id ───────────────────────────────────────────────────────────────

  async getById(
    tenantId: string,
    id: string,
  ): Promise<RosterAssignmentResponseDto> {
    const row = await this.requireRosterAssignment(tenantId, id);
    return toRosterAssignmentResponse(row);
  }

  // ── Create drafts ───────────────────────────────────────────────────────────

  async createDrafts(
    tenantId: string,
    dto: CreateRosterAssignmentDto,
    actorId: string,
    actorEmail: string,
    correlationId: string,
    actorUserId: string,
    actorPlatformRole?: string | null,
  ): Promise<RosterBulkResultDto> {
    // ── 1. Target validation ─────────────────────────────────────────────────
    const hasEmployees  = (dto.employeeIds?.length ?? 0) > 0;
    const hasDepartment = !!dto.departmentId;
    if (hasEmployees === hasDepartment) {
      throw new AppException({
        code: ERROR_CODES.ROSTER_TARGET_REQUIRED,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Provide exactly one of employeeIds or departmentId.',
      });
    }

    // ── 2. Rest/shift coherence ──────────────────────────────────────────────
    const topLevelIsRest = dto.isRestDay ?? false;
    if (topLevelIsRest && dto.shiftId) {
      throw new AppException({
        code: ERROR_CODES.ROSTER_INVALID_REST_DAY,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'shiftId must be absent when isRestDay is true.',
      });
    }
    if (!topLevelIsRest && !dto.shiftId) {
      // shiftId is required for non-rest days unless ALL expanded days are covered by restWeekdays
      // We enforce it simply: if isRestDay is not true, shiftId is required.
      throw new AppException({
        code: ERROR_CODES.ROSTER_INVALID_REST_DAY,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'shiftId is required when isRestDay is false.',
      });
    }

    // ── 3. Override permission ───────────────────────────────────────────────
    if (dto.overrideExisting) {
      await this.requireOverridePermission(actorUserId, tenantId, actorPlatformRole);
    }

    // ── 4. Resolve employees ─────────────────────────────────────────────────
    let employeeIds: string[];
    let source: string;
    let sourceReferenceId: string | null = null;

    if (hasDepartment) {
      source             = dto.recurrence ? ROSTER_ASSIGNMENT_SOURCE.RECURRENCE : ROSTER_ASSIGNMENT_SOURCE.DEPARTMENT;
      sourceReferenceId  = dto.departmentId!;
      employeeIds        = await this.resolveDepartmentEmployees(tenantId, dto.departmentId!);
      if (employeeIds.length === 0) {
        throw new AppException({
          code: ERROR_CODES.ROSTER_TARGET_REQUIRED,
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Department has no current ACTIVE employees (snapshot expansion).',
        });
      }
    } else {
      source      = dto.recurrence ? ROSTER_ASSIGNMENT_SOURCE.RECURRENCE : ROSTER_ASSIGNMENT_SOURCE.INDIVIDUAL;
      employeeIds = [...new Set(dto.employeeIds!)];
      await this.requireEligibleEmployees(tenantId, employeeIds);
    }

    // ── 5. Validate shift (active check before expansion) ────────────────────
    if (dto.shiftId) {
      await this.requireActiveShift(tenantId, dto.shiftId);
    }
    if (dto.branchId) {
      await this.requireBranch(tenantId, dto.branchId);
    }

    // ── 6. Expand dates ──────────────────────────────────────────────────────
    const expandedDates = expandRosterDates(
      dto.startDate,
      dto.endDate,
      dto.recurrence,
      dto.restWeekdays,
      topLevelIsRest,
      employeeIds.length,
    );

    if (expandedDates.length === 0) {
      throw new AppException({
        code: ERROR_CODES.ROSTER_INVALID_DATES,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'The recurrence expansion produced no dates for the given range.',
      });
    }

    // expandedDates is non-empty (checked above)
    const dateFrom = expandedDates[0]!.date;
    const dateTo   = expandedDates[expandedDates.length - 1]!.date;

    // ── 7. Conflict scan ─────────────────────────────────────────────────────
    //   Draft tip exists + no override → ROSTER_CONFLICT
    //   Draft tip exists + override → retire tip (keep historical row) then create new tip
    //   Effective published exists + no override → ROSTER_CONFLICT
    //   Effective published exists + override → supersede (record supersedesId)
    const conflicts: RosterConflictDto[] = [];
    const toSupersede = new Map<string, string>(); // key `${empId}_${dateIso}` → publishedId
    const retireDraftTips: string[] = [];

    for (const employeeId of employeeIds) {
      for (const { date } of expandedDates) {
        const draftTip = await this.repo.findDraftTip(tenantId, employeeId, date);
        if (draftTip) {
          if (!dto.overrideExisting) {
            conflicts.push({
              employeeId,
              workDate:           dateOnlyIso(date),
              existingDraftTipId: draftTip.id,
            });
            continue;
          }
          retireDraftTips.push(draftTip.id);
        }

        const effective = await this.repo.findEffectivePublished(tenantId, employeeId, date);
        if (effective) {
          if (!dto.overrideExisting) {
            conflicts.push({
              employeeId,
              workDate:            dateOnlyIso(date),
              existingPublishedId: effective.id,
            });
          } else {
            toSupersede.set(`${employeeId}_${dateOnlyIso(date)}`, effective.id);
          }
        }
      }
    }

    if (conflicts.length > 0) {
      throw new AppException({
        code: ERROR_CODES.ROSTER_CONFLICT,
        statusCode: HttpStatus.CONFLICT,
        message:
          'One or more employee/date combinations already have a roster entry that blocks creation.',
        details: { conflicts },
      });
    }

    // ── 8. Create draft rows in transaction ───────────────────────────────────
    const created = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      if (retireDraftTips.length > 0) {
        await tx.rosterAssignment.updateMany({
          where: { tenantId, id: { in: retireDraftTips } },
          data: {
            isDraftTip: false,
            updatedBy:  actorId,
            rowVersion: { increment: 1 },
          },
        });
      }

      const rows: RosterAssignment[] = [];

      for (const employeeId of employeeIds) {
        for (const { date, isRestDay } of expandedDates) {
          const supersedesId = toSupersede.get(`${employeeId}_${dateOnlyIso(date)}`) ?? null;

          const row = await tx.rosterAssignment.create({
            data: {
              tenantId,
              employeeId,
              workDate:             date,
              shiftId:              isRestDay ? null : dto.shiftId!,
              branchId:             dto.branchId ?? null,
              rosterStatus:         ROSTER_STATUS.DRAFT,
              isRestDay,
              isDraftTip:           true,
              isEffectivePublished: false,
              supersedesId,
              assignmentSource:     source,
              sourceReferenceId,
              createdBy:            actorId,
              updatedBy:            actorId,
            },
          });
          rows.push(row);
        }
      }

      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId,
          actorType:    AuditActorType.USER,
          actorEmail,
          module:       'SHIFT',
          action:       'RosterDraftsCreated',
          resourceType: 'roster_assignment',
          resourceId:   rows[0]?.id ?? null,
          before:       Prisma.JsonNull,
          after: {
            dateFrom:              dateOnlyIso(dateFrom),
            dateTo:                dateOnlyIso(dateTo),
            employeesResolved:     employeeIds.length,
            rowsCreated:           rows.length,
            overrideExisting:      !!dto.overrideExisting,
            notificationRequested: !!dto.notificationRequested,
            assignmentSource:      source,
          } as Prisma.InputJsonValue,
          correlationId,
          severity:    AuditEventSeverity.INFO,
          occurredAt:  new Date(),
        },
      });

      const sampleIds = rows.slice(0, 20).map((r) => r.id);

      await tx.outboxEvent.create({
        data: {
          tenantId,
          eventId:   randomUUID(),
          eventType: ROSTER_EVENTS.ASSIGNED,
          payload: {
            tenantId,
            dateFrom:              dateOnlyIso(dateFrom),
            dateTo:                dateOnlyIso(dateTo),
            employeeCount:         employeeIds.length,
            rowCount:              rows.length,
            sampleIds,
            notificationRequested: !!dto.notificationRequested,
            correlationId,
          },
        },
      });

      return rows;
    });

    this.logger.log(
      `RosterDrafts created count=${created.length} employees=${employeeIds.length} source=${source}`,
    );

    return {
      dateFrom:          dateOnlyIso(dateFrom),
      dateTo:            dateOnlyIso(dateTo),
      employeesResolved: employeeIds.length,
      rowsCreated:       created.length,
      sampleIds:         created.slice(0, 20).map((r) => r.id),
      notificationRequested: !!dto.notificationRequested,
    };
  }

  // ── Patch draft tip ─────────────────────────────────────────────────────────

  async patchDraft(
    tenantId: string,
    id: string,
    dto: UpdateRosterAssignmentDto,
    ifMatch: string | undefined,
    actorId: string,
    actorEmail: string,
    correlationId: string,
  ): Promise<RosterAssignmentResponseDto> {
    const expected = parseExpectedRowVersion(ifMatch);
    const current  = await this.requireRosterAssignment(tenantId, id);

    if (!current.isDraftTip || current.rosterStatus !== ROSTER_STATUS.DRAFT) {
      throw new AppException({
        code: ERROR_CODES.ROSTER_DRAFT_ONLY,
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: 'Only the current DRAFT tip row may be patched.',
      });
    }

    if (current.rowVersion !== expected) {
      versionConflict();
    }

    // Determine effective isRestDay / shiftId after patch
    const newIsRestDay =
      dto.isRestDay !== undefined ? dto.isRestDay : current.isRestDay;
    const newShiftId =
      newIsRestDay
        ? null
        : dto.shiftId !== undefined
          ? dto.shiftId
          : current.shiftId;

    if (!newIsRestDay && !newShiftId) {
      throw new AppException({
        code: ERROR_CODES.ROSTER_INVALID_REST_DAY,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'shiftId is required when isRestDay is false.',
      });
    }
    if (newIsRestDay && newShiftId) {
      throw new AppException({
        code: ERROR_CODES.ROSTER_INVALID_REST_DAY,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'shiftId must be null when isRestDay is true.',
      });
    }

    if (newShiftId) {
      await this.requireActiveShift(tenantId, newShiftId);
    }

    const newBranchId =
      dto.branchId !== undefined ? dto.branchId : current.branchId;
    if (newBranchId) {
      await this.requireBranch(tenantId, newBranchId);
    }

    try {
      const updated = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
        const row = await this.repo.updateWithVersion(
          tenantId,
          id,
          expected,
          {
            isRestDay: newIsRestDay,
            shiftId:   newShiftId,
            branchId:  newBranchId,
            updatedBy: actorId,
          },
          tx,
        );

        await tx.auditEvent.create({
          data: {
            tenantId,
            actorId,
            actorType:    AuditActorType.USER,
            actorEmail,
            module:       'SHIFT',
            action:       'RosterDraftPatched',
            resourceType: 'roster_assignment',
            resourceId:   row.id,
            before:       this.rosterSnapshot(current) as Prisma.InputJsonValue,
            after:        this.rosterSnapshot(row)     as Prisma.InputJsonValue,
            correlationId,
            severity:    AuditEventSeverity.INFO,
            occurredAt:  new Date(),
          },
        });

        return row;
      });

      const withRelations = await this.requireRosterAssignment(tenantId, updated.id);
      return toRosterAssignmentResponse(withRelations);
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

  // ── Publish drafts ──────────────────────────────────────────────────────────

  async publishDrafts(
    tenantId: string,
    dto: PublishRosterDto,
    actorId: string,
    actorEmail: string,
    correlationId: string,
    actorUserId: string,
    actorPlatformRole?: string | null,
  ): Promise<RosterPublishResultDto> {
    const dateFrom = toDateOnly(dto.dateFrom);
    const dateTo   = toDateOnly(dto.dateTo);

    if (dateTo < dateFrom) {
      throw new AppException({
        code: ERROR_CODES.ROSTER_INVALID_DATES,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'dateTo must be on or after dateFrom.',
      });
    }

    // Resolve employee scope
    let scopeEmployeeIds: string[] | undefined;
    if (dto.departmentId) {
      scopeEmployeeIds = await this.resolveDepartmentEmployees(tenantId, dto.departmentId);
      if (scopeEmployeeIds.length === 0) {
        throw new AppException({
          code: ERROR_CODES.ROSTER_NOT_PUBLISHABLE,
          statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          message: 'Department has no ACTIVE employees — no draft tips to publish.',
        });
      }
    } else if (dto.employeeIds?.length) {
      scopeEmployeeIds = dto.employeeIds;
    }

    // Find draft tips in scope
    const drafts = await this.repo.findDraftTipsForPublish(
      tenantId,
      dateFrom,
      dateTo,
      { employeeIds: scopeEmployeeIds, branchId: dto.branchId },
    );

    if (drafts.length === 0) {
      throw new AppException({
        code: ERROR_CODES.ROSTER_NOT_PUBLISHABLE,
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: 'No draft tip roster rows found for the given scope.',
      });
    }

    // ── Pre-publish validation (all-or-nothing) ───────────────────────────────
    const shiftIds = [...new Set(drafts.filter((d) => !d.isRestDay && d.shiftId).map((d) => d.shiftId!))];
    const activeShifts = await this.loadActiveShiftIds(tenantId, shiftIds);

    const inactiveShiftRows = drafts.filter(
      (d) => !d.isRestDay && d.shiftId && !activeShifts.has(d.shiftId),
    );
    if (inactiveShiftRows.length > 0) {
      throw new AppException({
        code: ERROR_CODES.ROSTER_SHIFT_INACTIVE,
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: 'One or more draft rows reference an INACTIVE shift.',
        details: { rowIds: inactiveShiftRows.map((r) => r.id) },
      });
    }

    // Attendance impact check
    const needsOverridePermission = await this.checkAttendanceImpact(
      tenantId,
      drafts,
      dto.confirmAttendanceImpact ?? false,
      dto.overrideLocked ?? false,
    );

    if (needsOverridePermission) {
      await this.requireOverridePermission(actorUserId, tenantId, actorPlatformRole);
    }

    // ── Publish in transaction ────────────────────────────────────────────────
    const publishedAt = new Date();

    await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      for (const draft of drafts) {
        // Clear the previous isEffectivePublished for this employee+workDate (if any)
        await tx.rosterAssignment.updateMany({
          where: {
            tenantId,
            employeeId: draft.employeeId,
            workDate:   draft.workDate,
            isEffectivePublished: true,
          },
          data: { isEffectivePublished: false },
        });

        // Promote draft to published
        await tx.rosterAssignment.update({
          where: { id: draft.id },
          data: {
            rosterStatus:         ROSTER_STATUS.PUBLISHED,
            isDraftTip:           false,
            isEffectivePublished: true,
            publishedAt,
            publishedBy:          actorId,
            updatedBy:            actorId,
            rowVersion:           { increment: 1 },
          },
        });
      }

      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId,
          actorType:    AuditActorType.USER,
          actorEmail,
          module:       'SHIFT',
          action:       'RosterPublished',
          resourceType: 'roster_assignment',
          resourceId:   drafts[0]?.id ?? null,
          before:       Prisma.JsonNull,
          after: {
            dateFrom:              dateOnlyIso(dateFrom),
            dateTo:                dateOnlyIso(dateTo),
            rowsPublished:         drafts.length,
            employeesAffected:     new Set(drafts.map((d) => d.employeeId)).size,
            notificationRequested: !!dto.notificationRequested,
          } as Prisma.InputJsonValue,
          correlationId,
          severity:   AuditEventSeverity.INFO,
          occurredAt: publishedAt,
        },
      });

      const sampleIds = drafts.slice(0, 20).map((r) => r.id);

      await tx.outboxEvent.create({
        data: {
          tenantId,
          eventId:   randomUUID(),
          eventType: ROSTER_EVENTS.PUBLISHED,
          payload: {
            tenantId,
            dateFrom:              dateOnlyIso(dateFrom),
            dateTo:                dateOnlyIso(dateTo),
            rowCount:              drafts.length,
            employeeCount:         new Set(drafts.map((d) => d.employeeId)).size,
            sampleIds,
            notificationRequested: !!dto.notificationRequested,
            correlationId,
          },
        },
      });
    });

    const employeesAffected = new Set(drafts.map((d) => d.employeeId)).size;

    this.logger.log(
      `RosterPublished rows=${drafts.length} employees=${employeesAffected} dateFrom=${dateOnlyIso(dateFrom)} dateTo=${dateOnlyIso(dateTo)}`,
    );

    return {
      dateFrom:          dateOnlyIso(dateFrom),
      dateTo:            dateOnlyIso(dateTo),
      rowsPublished:     drafts.length,
      employeesAffected,
      sampleIds:         drafts.slice(0, 20).map((r) => r.id),
      notificationRequested: !!dto.notificationRequested,
    };
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

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
    if (!this.authorization.hasAllPermissions(resolved.permissions, [ROSTER_PERMISSIONS.OVERRIDE])) {
      throw new AppException({
        code: ERROR_CODES.PERMISSION_DENIED,
        statusCode: HttpStatus.FORBIDDEN,
        message: 'roster.override permission is required for this operation.',
      });
    }
  }

  private async requireActiveShift(tenantId: string, shiftId: string): Promise<void> {
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
        code: ERROR_CODES.ROSTER_SHIFT_INACTIVE,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Cannot create a roster row referencing an INACTIVE shift.',
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
        message: 'Branch not found for this organisation.',
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
    if (ineligible.length > 0) {
      throw new AppException({
        code: ERROR_CODES.SHIFT_ASSIGNMENT_EMPLOYEE_INVALID,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Only ACTIVE employees can receive roster assignments.',
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

  private async requireRosterAssignment(
    tenantId: string,
    id: string,
  ): Promise<RosterAssignmentWithRelations> {
    const row = await this.repo.findById(tenantId, id);
    if (!row) {
      throw new AppException({
        code: ERROR_CODES.ROSTER_ASSIGNMENT_NOT_FOUND,
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Roster assignment not found.',
      });
    }
    return row;
  }

  /** Load the set of shiftIds that are ACTIVE (used for publish validation). */
  private async loadActiveShiftIds(
    tenantId: string,
    shiftIds: string[],
  ): Promise<Set<string>> {
    if (shiftIds.length === 0) return new Set();
    const rows = await this.prisma.shift.findMany({
      where: { tenantId, id: { in: shiftIds }, status: SHIFT_STATUS.ACTIVE },
      select: { id: true },
    });
    return new Set(rows.map((r) => r.id));
  }

  /**
   * Check attendance records for every draft being published.
   *
   * - No record → OK
   * - Record exists, periodLocked=false → require confirmAttendanceImpact=true
   * - Record exists, periodLocked=true  → block unless overrideLocked (also needs roster.override — caller checks)
   *
   * Returns true when roster.override permission is required (locked override requested).
   */
  private async checkAttendanceImpact(
    tenantId: string,
    drafts: RosterAssignment[],
    confirmAttendanceImpact: boolean,
    overrideLocked: boolean,
  ): Promise<boolean> {
    const keys = drafts.map((d) => ({ employeeId: d.employeeId, workDate: d.workDate }));

    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        tenantId,
        OR: keys.map((k) => ({
          employeeId:     k.employeeId,
          attendanceDate: k.workDate,
        })),
      },
      select: { id: true, employeeId: true, attendanceDate: true, periodLocked: true },
    });

    const lockedRows: string[]   = [];
    const unlockedRows: string[] = [];

    for (const draft of drafts) {
      const key = `${draft.employeeId}_${dateOnlyIso(draft.workDate)}`;
      const rec = records.find(
        (r) =>
          r.employeeId === draft.employeeId &&
          r.attendanceDate.toISOString().slice(0, 10) === dateOnlyIso(draft.workDate),
      );
      if (!rec) continue;

      if (rec.periodLocked) {
        lockedRows.push(draft.id);
      } else {
        unlockedRows.push(draft.id);
      }
    }

    if (lockedRows.length > 0 && !overrideLocked) {
      throw new AppException({
        code: ERROR_CODES.ROSTER_ATTENDANCE_LOCKED,
        statusCode: HttpStatus.CONFLICT,
        message: 'Some rows have period-locked attendance. Pass overrideLocked=true with roster.override to proceed.',
        details: { lockedRosterRowIds: lockedRows },
      });
    }

    if (unlockedRows.length > 0 && !confirmAttendanceImpact) {
      throw new AppException({
        code: ERROR_CODES.ROSTER_ATTENDANCE_CONFIRM_REQUIRED,
        statusCode: HttpStatus.CONFLICT,
        message: 'Some rows have existing (unlocked) attendance records that will be affected. Pass confirmAttendanceImpact=true to confirm.',
        details: { affectedRosterRowIds: unlockedRows },
      });
    }

    // Override of locked records requires roster.override (signal to caller)
    return lockedRows.length > 0 && overrideLocked;
  }

  private rosterSnapshot(row: RosterAssignment | RosterAssignmentWithRelations) {
    return {
      id:              row.id,
      employeeId:      row.employeeId,
      workDate:        dateOnlyIso(row.workDate),
      shiftId:         row.shiftId,
      branchId:        row.branchId,
      rosterStatus:    row.rosterStatus,
      isRestDay:       row.isRestDay,
      isDraftTip:      row.isDraftTip,
      isEffectivePublished: row.isEffectivePublished,
      rowVersion:      row.rowVersion.toString(),
    };
  }
}
