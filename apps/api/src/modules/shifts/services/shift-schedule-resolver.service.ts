import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import type { AttendancePolicy, RosterAssignment, Shift, ShiftAssignment } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES, type ErrorCode } from '../../../common/constants/error-codes.constants';
import type {
  ResolvedWorkSchedule,
  ScheduleSource,
  ShiftWorkSchedule,
} from '../../attendance/interfaces/shift-check-adapter.interface';

type ShiftWithPolicy = Shift & { attendancePolicy: AttendancePolicy };
type AssignmentWithShift = ShiftAssignment & { shift: ShiftWithPolicy };
type RosterWithOptionalShift = RosterAssignment & { shift: ShiftWithPolicy | null };

function dateOnlyLocal(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Calendar Y-M-D of a local Date as UTC midnight — matches @db.Date / toDateOnly storage. */
function toUtcDateOnlyFromLocal(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return dateOnlyLocal(x);
}

function parseHm(hm: string): [number, number] {
  const [h, m] = hm.split(':').map(Number) as [number, number];
  return [h ?? 0, m ?? 0];
}

function atLocal(date: Date, hm: string): Date {
  const [h, m] = parseHm(hm);
  const x = new Date(date);
  x.setHours(h, m, 0, 0);
  return x;
}

function weekendDaysFromPolicy(policy: AttendancePolicy): number[] {
  if (Array.isArray(policy.weekendDefinition)) {
    return policy.weekendDefinition as number[];
  }
  return (
    (policy.weekendDefinition as { days?: number[] } | null)?.days ?? [0, 6]
  );
}

@Injectable()
export class ShiftScheduleResolverService {
  private readonly logger = new Logger(ShiftScheduleResolverService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getWorkSchedule(
    tenantId: string,
    employeeId: string,
    workDate: Date,
  ): Promise<ResolvedWorkSchedule | null> {
    const asOf = dateOnlyLocal(workDate);
    const asOfUtc = toUtcDateOnlyFromLocal(asOf);

    // Phase 4: Effective published roster takes precedence over ShiftAssignment.
    // DRAFT tips are never used for attendance resolution.
    const roster = await this.prisma.rosterAssignment.findFirst({
      where: { tenantId, employeeId, workDate: asOfUtc, isEffectivePublished: true },
      include: { shift: { include: { attendancePolicy: true } } },
    });

    if (roster) {
      return this.buildFromLoadedRoster(
        tenantId,
        roster as unknown as RosterWithOptionalShift,
        asOf,
      );
    }

    // Fall back to ShiftAssignment (Phase 3).
    // Keep Phase 3 as-of semantics (local midnight Date) — do not reuse asOfUtc
    // here: smoke/fixtures and some writers pass local midnights that @db.Date
    // truncates via the instant's UTC calendar day.
    const assignment = await this.requireUniqueEffectiveAssignment(
      tenantId,
      employeeId,
      asOf,
    );
    if (!assignment) return null;
    return this.buildFromLoadedAssignment(tenantId, assignment, asOf);
  }

  async resolveWorkDateForEvent(
    tenantId: string,
    employeeId: string,
    eventTime: Date,
  ): Promise<{ workDate: Date; resolved: ResolvedWorkSchedule | null }> {
    const calendarA = dateOnlyLocal(eventTime);
    const calendarB = addDays(calendarA, -1);

    // Prefer previous calendar day when overnight attribution window matches
    // (SHIFT-START-DATE workDate rule).
    const resolvedB = await this.getWorkSchedule(tenantId, employeeId, calendarB);
    if (
      resolvedB &&
      eventTime >= resolvedB.attributionWindowStart &&
      eventTime <= resolvedB.attributionWindowEnd
    ) {
      return { workDate: calendarB, resolved: resolvedB };
    }

    const resolvedA = await this.getWorkSchedule(tenantId, employeeId, calendarA);
    if (
      resolvedA &&
      eventTime >= resolvedA.attributionWindowStart &&
      eventTime <= resolvedA.attributionWindowEnd
    ) {
      return { workDate: calendarA, resolved: resolvedA };
    }

    // Calendar-day fallback (M06-compatible when no window match / no assignment).
    return { workDate: calendarA, resolved: resolvedA };
  }

  async rebuildFromProvenance(
    tenantId: string,
    workDate: Date,
    provenance: {
      scheduleSource: ScheduleSource;
      shiftAssignmentId?: string | null;
      rosterAssignmentId?: string | null;
      resolvedShiftId?: string | null;
      attendancePolicyId?: string | null;
    },
  ): Promise<ResolvedWorkSchedule> {
    if (provenance.scheduleSource === 'ROSTER') {
      if (!provenance.rosterAssignmentId) {
        this.fail('ROSTER provenance missing rosterAssignmentId', {
          tenantId,
          provenance,
        });
      }
      const roster = await this.prisma.rosterAssignment.findFirst({
        where: { id: provenance.rosterAssignmentId!, tenantId },
        include: { shift: { include: { attendancePolicy: true } } },
      });
      if (!roster) {
        this.fail('Pinned RosterAssignment not found for tenant', {
          tenantId,
          rosterAssignmentId: provenance.rosterAssignmentId,
        });
      }
      const asOf = dateOnlyLocal(workDate);
      if ((roster as unknown as RosterWithOptionalShift).isRestDay) {
        return this.buildRestDayResult(roster!.id, asOf);
      }
      // Working roster day: prefer provenance.resolvedShiftId, fall back to roster.shiftId
      const shiftId = provenance.resolvedShiftId ?? (roster as unknown as RosterWithOptionalShift).shiftId;
      if (!shiftId) {
        this.fail('Roster working-day has no shiftId in provenance or roster', {
          tenantId,
          rosterAssignmentId: roster!.id,
        });
      }
      const shift = await this.loadShiftPinned(
        tenantId,
        shiftId!,
        provenance.attendancePolicyId,
      );
      return this.toRosterResolved(
        roster as unknown as RosterWithOptionalShift,
        shift,
        asOf,
      );
    }

    if (provenance.scheduleSource === 'SHIFT_ASSIGNMENT') {
      if (!provenance.shiftAssignmentId || !provenance.resolvedShiftId) {
        this.fail('SHIFT_ASSIGNMENT provenance missing required ids', {
          tenantId,
          provenance,
        });
      }
      const assignment = await this.prisma.shiftAssignment.findFirst({
        where: { id: provenance.shiftAssignmentId!, tenantId },
      });
      if (!assignment) {
        this.fail('Pinned shift assignment not found for tenant', {
          tenantId,
          shiftAssignmentId: provenance.shiftAssignmentId,
        });
      }
      if (assignment!.shiftId !== provenance.resolvedShiftId) {
        this.fail('Pinned provenance shiftId does not match assignment.shiftId', {
          tenantId,
          expected: assignment!.shiftId,
          pinned: provenance.resolvedShiftId,
        });
      }
      const shift = await this.loadShiftPinned(
        tenantId,
        provenance.resolvedShiftId!,
        provenance.attendancePolicyId,
      );
      return this.toResolved(assignment!, shift, dateOnlyLocal(workDate));
    }

    this.fail('Unsupported scheduleSource in provenance', {
      tenantId,
      scheduleSource: provenance.scheduleSource,
    });
  }

  // ─── Rest-day helper ───────────────────────────────────────────────────────

  private buildRestDayResult(
    rosterAssignmentId: string,
    workDate: Date,
  ): ResolvedWorkSchedule {
    const restSchedule: ShiftWorkSchedule = {
      workStartTime: '00:00',
      workEndTime: '00:00',
      workMinutesRequired: 0,
      gracePeriodMinutes: 0,
      lateToleranceMinutes: 0,
      earlyDepartureMinutes: 0,
      overtimeThresholdMinutes: 0,
      halfDayThresholdMinutes: 0,
      weekendDays: [0, 1, 2, 3, 4, 5, 6],
      timezone: 'UTC',
    };
    const start = new Date(workDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(workDate);
    end.setHours(23, 59, 59, 999);
    return {
      schedule: restSchedule,
      crossesMidnight: false,
      source: 'ROSTER',
      isRestDay: true,
      shiftId: null,
      shiftCode: null,
      shiftVersion: null,
      shiftAssignmentId: null,
      rosterAssignmentId,
      attendancePolicyId: null,
      attributionWindowStart: start,
      attributionWindowEnd: end,
    };
  }

  // ─── Roster helpers ────────────────────────────────────────────────────────

  private buildFromLoadedRoster(
    tenantId: string,
    roster: RosterWithOptionalShift,
    workDate: Date,
  ): ResolvedWorkSchedule {
    if (roster.tenantId !== tenantId) {
      this.fail('Cross-tenant RosterAssignment reference', {
        tenantId,
        rosterTenantId: roster.tenantId,
        rosterId: roster.id,
      });
    }
    if (roster.isRestDay) {
      return this.buildRestDayResult(roster.id, workDate);
    }
    if (!roster.shift) {
      this.fail('Roster working-day assignment has no shift loaded', {
        tenantId,
        rosterId: roster.id,
      });
    }
    const shift = this.assertShiftPolicy(roster.shift!);
    return this.toRosterResolved(roster, shift, workDate);
  }

  private toRosterResolved(
    roster: RosterWithOptionalShift,
    shift: ShiftWithPolicy,
    workDate: Date,
  ): ResolvedWorkSchedule {
    const policy = shift.attendancePolicy;
    const schedule: ShiftWorkSchedule = {
      workStartTime: shift.startLocalTime,
      workEndTime: shift.endLocalTime,
      workMinutesRequired: shift.requiredMinutes,
      gracePeriodMinutes: policy.graceMinutes,
      lateToleranceMinutes: policy.lateToleranceMinutes,
      earlyDepartureMinutes: policy.earlyDepartureToleranceMinutes,
      overtimeThresholdMinutes: policy.overtimeThresholdMinutes,
      halfDayThresholdMinutes: policy.halfDayMinutes,
      weekendDays: weekendDaysFromPolicy(policy),
      timezone: policy.timezone,
    };
    const { start, end } = this.attributionWindow(workDate, shift);
    return {
      schedule,
      crossesMidnight: shift.crossesMidnight,
      source: 'ROSTER',
      isRestDay: false,
      shiftId: shift.id,
      shiftCode: shift.code,
      shiftVersion: shift.version,
      shiftAssignmentId: null,
      rosterAssignmentId: roster.id,
      attendancePolicyId: policy.id,
      attributionWindowStart: start,
      attributionWindowEnd: end,
    };
  }

  // ─── ShiftAssignment helpers ───────────────────────────────────────────────

  private async requireUniqueEffectiveAssignment(
    tenantId: string,
    employeeId: string,
    asOf: Date,
  ): Promise<AssignmentWithShift | null> {
    const rows = await this.prisma.shiftAssignment.findMany({
      where: {
        tenantId,
        employeeId,
        effectiveFrom: { lte: asOf },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: asOf } }],
      },
      include: {
        shift: { include: { attendancePolicy: true } },
      },
      orderBy: { effectiveFrom: 'desc' },
      take: 20,
    });
    const nonEmpty = rows.filter(
      (r) => r.effectiveTo === null || r.effectiveTo > r.effectiveFrom,
    );
    if (nonEmpty.length === 0) return null;
    if (nonEmpty.length > 1) {
      this.fail(
        'Ambiguous effective ShiftAssignments for employee/workDate',
        {
          tenantId,
          employeeId,
          asOf: asOf.toISOString(),
          count: nonEmpty.length,
          ids: nonEmpty.map((r) => r.id),
        },
        ERROR_CODES.SHIFT_ASSIGNMENT_AMBIGUOUS,
      );
    }
    return nonEmpty[0]!;
  }

  private buildFromLoadedAssignment(
    tenantId: string,
    assignment: AssignmentWithShift,
    workDate: Date,
  ): ResolvedWorkSchedule {
    if (assignment.shift.tenantId !== tenantId) {
      this.fail('Cross-tenant Shift reference on ShiftAssignment', {
        tenantId,
        shiftTenantId: assignment.shift.tenantId,
        shiftId: assignment.shift.id,
      });
    }
    if (assignment.shift.id !== assignment.shiftId) {
      this.fail('ShiftAssignment.shiftId mismatch after include', {
        tenantId,
        assignmentId: assignment.id,
      });
    }
    const shift = this.assertShiftPolicy(assignment.shift);
    return this.toResolved(assignment, shift, workDate);
  }

  private async loadShiftPinned(
    tenantId: string,
    shiftId: string,
    attendancePolicyId?: string | null,
  ): Promise<ShiftWithPolicy> {
    const shift = await this.prisma.shift.findFirst({
      where: { id: shiftId, tenantId },
      include: { attendancePolicy: true },
    });
    if (!shift) {
      this.fail(
        'Pinned Shift not found for tenant',
        { tenantId, shiftId },
        ERROR_CODES.SHIFT_NOT_FOUND,
      );
    }
    // If no policy override or it matches the shift's own policy, use it directly.
    if (!attendancePolicyId || shift!.attendancePolicyId === attendancePolicyId) {
      return this.assertShiftPolicy(shift!);
    }
    // Policy override: load the specific pinned policy.
    const policy = await this.prisma.attendancePolicy.findFirst({
      where: { id: attendancePolicyId, tenantId, deletedAt: null },
    });
    if (!policy) {
      this.fail(
        'Pinned AttendancePolicy not found for tenant',
        { tenantId, attendancePolicyId },
        ERROR_CODES.SHIFT_POLICY_NOT_FOUND,
      );
    }
    return { ...shift!, attendancePolicy: policy! };
  }

  private assertShiftPolicy(shift: ShiftWithPolicy): ShiftWithPolicy {
    const policy = shift.attendancePolicy;
    if (!policy || policy.deletedAt) {
      this.fail(
        'Shift-linked AttendancePolicy missing or deleted',
        {
          shiftId: shift.id,
          attendancePolicyId: shift.attendancePolicyId,
        },
        ERROR_CODES.SHIFT_POLICY_NOT_FOUND,
      );
    }
    if (policy!.tenantId !== shift.tenantId) {
      this.fail('Cross-tenant Shift/AttendancePolicy reference', {
        shiftTenantId: shift.tenantId,
        policyTenantId: policy!.tenantId,
      });
    }
    if (
      !shift.startLocalTime ||
      !shift.endLocalTime ||
      shift.requiredMinutes == null
    ) {
      this.fail('Invalid Shift schedule configuration', { shiftId: shift.id });
    }
    return shift;
  }

  private toResolved(
    assignment: ShiftAssignment,
    shift: ShiftWithPolicy,
    workDate: Date,
  ): ResolvedWorkSchedule {
    const policy = shift.attendancePolicy;
    const schedule: ShiftWorkSchedule = {
      workStartTime: shift.startLocalTime,
      workEndTime: shift.endLocalTime,
      workMinutesRequired: shift.requiredMinutes,
      gracePeriodMinutes: policy.graceMinutes,
      lateToleranceMinutes: policy.lateToleranceMinutes,
      earlyDepartureMinutes: policy.earlyDepartureToleranceMinutes,
      overtimeThresholdMinutes: policy.overtimeThresholdMinutes,
      halfDayThresholdMinutes: policy.halfDayMinutes,
      weekendDays: weekendDaysFromPolicy(policy),
      timezone: policy.timezone,
    };

    const { start, end } = this.attributionWindow(workDate, shift);

    return {
      schedule,
      crossesMidnight: shift.crossesMidnight,
      source: 'SHIFT_ASSIGNMENT',
      isRestDay: false,
      shiftId: shift.id,
      shiftCode: shift.code,
      shiftVersion: shift.version,
      shiftAssignmentId: assignment.id,
      rosterAssignmentId: null,
      attendancePolicyId: policy.id,
      attributionWindowStart: start,
      attributionWindowEnd: end,
    };
  }

  private attributionWindow(
    workDate: Date,
    shift: Shift,
  ): { start: Date; end: Date } {
    const startBase = atLocal(workDate, shift.startLocalTime);
    const endBase = shift.crossesMidnight
      ? atLocal(addDays(workDate, 1), shift.endLocalTime)
      : atLocal(workDate, shift.endLocalTime);

    const start = new Date(
      startBase.getTime() - shift.checkInWindowBeforeMinutes * 60_000,
    );
    const end = new Date(
      endBase.getTime() + shift.checkOutWindowAfterMinutes * 60_000,
    );
    const lateCheckInBound = new Date(
      startBase.getTime() + shift.checkInWindowAfterMinutes * 60_000,
    );
    const attributionEnd =
      end.getTime() >= lateCheckInBound.getTime() ? end : lateCheckInBound;

    return { start, end: attributionEnd };
  }

  private fail(
    message: string,
    context: Record<string, unknown>,
    code: ErrorCode = ERROR_CODES.ATTENDANCE_SCHEDULE_RESOLUTION_FAILED,
  ): never {
    this.logger.error(`[ShiftScheduleResolver] ${message}`, context);
    throw new AppException({
      code,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      message,
      details: context,
    });
  }
}
