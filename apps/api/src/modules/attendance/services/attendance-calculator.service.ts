import { Inject, Injectable } from '@nestjs/common';
import {
  ATTENDANCE_STATUS,
  ATTENDANCE_EXCEPTION_TYPE,
} from '../constants/attendance.constants';
import { AttendancePolicyService } from './attendance-policy.service';
import type { LeaveCheckAdapter } from '../interfaces/leave-check-adapter.interface';
import {
  SHIFT_CHECK_ADAPTER,
  type ResolvedWorkSchedule,
  type ScheduleSource,
  type ShiftCheckAdapter,
  type ShiftScheduleProvenance,
  type ShiftWorkSchedule,
} from '../interfaces/shift-check-adapter.interface';

export interface RawEventInput {
  id: string;
  eventType: string; // CHECK_IN | CHECK_OUT
  eventTime: Date;
}

export interface CalculationInput {
  tenantId: string;
  employeeId: string;
  branchId: string | null;
  legalEntityId: string | null;
  workDate: Date;
  rawEvents: RawEventInput[];
  leaveAdapter: LeaveCheckAdapter;
  /** When set, reuse pinned Shift/policy instead of live assignment resolve. */
  pinnedProvenance?: {
    scheduleSource: ScheduleSource;
    resolvedShiftId: string | null;
    shiftAssignmentId: string | null;
    rosterAssignmentId?: string | null;
    attendancePolicyId: string | null;
  } | null;
  /** Optional pre-resolved shift schedule (from workDate attribution). */
  preResolved?: ResolvedWorkSchedule | null;
}

export interface ExceptionResult {
  exceptionType: string;
  description: string;
  severity: string; // INFO | WARNING | ERROR
}

export interface CalculationResult {
  status: string;
  firstCheckIn: Date | null;
  lastCheckOut: Date | null;
  totalWorkedMinutes: number;
  regularMinutes: number;
  overtimeMinutes: number;
  lateMinutes: number;
  earlyDepartureMinutes: number;
  isLeave: boolean;
  isHoliday: boolean;
  isWeekend: boolean;
  exceptions: ExceptionResult[];
  provenance: ShiftScheduleProvenance;
}

@Injectable()
export class AttendanceCalculatorService {
  constructor(
    private readonly policyService: AttendancePolicyService,
    @Inject(SHIFT_CHECK_ADAPTER)
    private readonly shiftCheck: ShiftCheckAdapter,
  ) {}

  async calculate(input: CalculationInput): Promise<CalculationResult> {
    const {
      tenantId,
      employeeId,
      branchId,
      legalEntityId,
      workDate,
      rawEvents,
      leaveAdapter,
      pinnedProvenance,
      preResolved,
    } = input;

    const { schedule, provenance, crossesMidnight, isRestDay } =
      await this.resolveScheduleContext({
        tenantId,
        employeeId,
        branchId,
        legalEntityId,
        workDate,
        pinnedProvenance,
        preResolved,
      });

    // Roster rest-day takes absolute precedence — treat as WEEKEND (PD-2).
    if (isRestDay) {
      return this.nonWorkingDayResult(
        ATTENDANCE_STATUS.WEEKEND,
        true,
        false,
        false,
        provenance,
      );
    }

    // PD-3: published roster working Shift wins over policy weekendDefinition.
    // Only apply policy weekendDays when schedule did not come from an explicit
    // published roster assignment.
    const dayOfWeek = workDate.getDay();
    const isWeekend =
      provenance.scheduleSource !== 'ROSTER' &&
      schedule.weekendDays.includes(dayOfWeek);
    if (isWeekend) {
      return this.nonWorkingDayResult(
        ATTENDANCE_STATUS.WEEKEND,
        true,
        false,
        false,
        provenance,
      );
    }

    const isHoliday = await leaveAdapter.isHoliday(
      tenantId,
      legalEntityId,
      workDate,
    );
    if (isHoliday) {
      return this.nonWorkingDayResult(
        ATTENDANCE_STATUS.HOLIDAY,
        false,
        true,
        false,
        provenance,
      );
    }

    const isLeave = await leaveAdapter.hasApprovedLeave(
      tenantId,
      employeeId,
      workDate,
    );
    if (isLeave) {
      return this.nonWorkingDayResult(
        ATTENDANCE_STATUS.ON_LEAVE,
        false,
        false,
        true,
        provenance,
      );
    }

    if (rawEvents.length === 0) {
      return {
        status: ATTENDANCE_STATUS.ABSENT,
        firstCheckIn: null,
        lastCheckOut: null,
        totalWorkedMinutes: 0,
        regularMinutes: 0,
        overtimeMinutes: 0,
        lateMinutes: 0,
        earlyDepartureMinutes: 0,
        isLeave: false,
        isHoliday: false,
        isWeekend: false,
        exceptions: [],
        provenance,
      };
    }

    const checkIns = rawEvents
      .filter((e) => e.eventType === 'CHECK_IN')
      .sort((a, b) => a.eventTime.getTime() - b.eventTime.getTime());
    const checkOuts = rawEvents
      .filter((e) => e.eventType === 'CHECK_OUT')
      .sort((a, b) => a.eventTime.getTime() - b.eventTime.getTime());

    const firstCheckIn =
      checkIns.length > 0 ? checkIns[0]!.eventTime : null;
    const lastCheckOut =
      checkOuts.length > 0
        ? checkOuts[checkOuts.length - 1]!.eventTime
        : null;

    const exceptions: ExceptionResult[] = [];

    if (!firstCheckIn && lastCheckOut) {
      exceptions.push({
        exceptionType: ATTENDANCE_EXCEPTION_TYPE.MISSING_CHECK_IN,
        description: 'Check-out recorded without check-in',
        severity: 'WARNING',
      });
    }
    if (firstCheckIn && !lastCheckOut) {
      exceptions.push({
        exceptionType: ATTENDANCE_EXCEPTION_TYPE.MISSING_CHECK_OUT,
        description: 'Check-in recorded without check-out',
        severity: 'WARNING',
      });
    }
    if (!firstCheckIn || !lastCheckOut) {
      return {
        status: ATTENDANCE_STATUS.MISSING_PUNCH,
        firstCheckIn,
        lastCheckOut,
        totalWorkedMinutes: 0,
        regularMinutes: 0,
        overtimeMinutes: 0,
        lateMinutes: 0,
        earlyDepartureMinutes: 0,
        isLeave: false,
        isHoliday: false,
        isWeekend: false,
        exceptions,
        provenance,
      };
    }

    // Wall-clock worked minutes — Phase 3 does NOT subtract breakMinutes.
    const totalWorkedMinutes = Math.max(
      0,
      Math.floor(
        (lastCheckOut.getTime() - firstCheckIn.getTime()) / 60000,
      ),
    );

    const [startH, startM] = schedule.workStartTime
      .split(':')
      .map(Number) as [number, number];
    const [endH, endM] = schedule.workEndTime.split(':').map(Number) as [
      number,
      number,
    ];

    const scheduledStart = new Date(workDate);
    scheduledStart.setHours(startH, startM, 0, 0);

    const scheduledEnd = new Date(workDate);
    scheduledEnd.setHours(endH, endM, 0, 0);
    if (crossesMidnight) {
      scheduledEnd.setDate(scheduledEnd.getDate() + 1);
    }

    const rawLate = Math.max(
      0,
      Math.floor(
        (firstCheckIn.getTime() - scheduledStart.getTime()) / 60000,
      ) - schedule.gracePeriodMinutes,
    );
    const lateMinutes = Math.max(0, rawLate);
    if (lateMinutes > schedule.lateToleranceMinutes) {
      exceptions.push({
        exceptionType: ATTENDANCE_EXCEPTION_TYPE.LATE,
        description: `Late by ${lateMinutes} minutes`,
        severity: 'WARNING',
      });
    }

    const rawEarly = Math.max(
      0,
      Math.floor(
        (scheduledEnd.getTime() - lastCheckOut.getTime()) / 60000,
      ),
    );
    const earlyDepartureMinutes = Math.max(
      0,
      rawEarly - schedule.earlyDepartureMinutes,
    );
    if (earlyDepartureMinutes > 0) {
      exceptions.push({
        exceptionType: ATTENDANCE_EXCEPTION_TYPE.EARLY_DEPARTURE,
        description: `Left ${earlyDepartureMinutes} minutes early`,
        severity: 'WARNING',
      });
    }

    const excessMinutes = Math.max(
      0,
      totalWorkedMinutes - schedule.workMinutesRequired,
    );
    const overtimeMinutes = Math.max(
      0,
      excessMinutes - schedule.overtimeThresholdMinutes,
    );
    const regularMinutes = Math.min(
      totalWorkedMinutes,
      schedule.workMinutesRequired,
    );

    let status: string;
    if (totalWorkedMinutes < schedule.halfDayThresholdMinutes) {
      status = ATTENDANCE_STATUS.HALF_DAY;
    } else if (lateMinutes > schedule.lateToleranceMinutes) {
      status = ATTENDANCE_STATUS.LATE;
    } else {
      status = ATTENDANCE_STATUS.PRESENT;
    }

    return {
      status,
      firstCheckIn,
      lastCheckOut,
      totalWorkedMinutes,
      regularMinutes,
      overtimeMinutes,
      lateMinutes,
      earlyDepartureMinutes,
      isLeave: false,
      isHoliday: false,
      isWeekend: false,
      exceptions,
      provenance,
    };
  }

  private async resolveScheduleContext(args: {
    tenantId: string;
    employeeId: string;
    branchId: string | null;
    legalEntityId: string | null;
    workDate: Date;
    pinnedProvenance?: CalculationInput['pinnedProvenance'];
    preResolved?: ResolvedWorkSchedule | null;
  }): Promise<{
    schedule: ShiftWorkSchedule;
    provenance: ShiftScheduleProvenance;
    crossesMidnight: boolean;
    isRestDay: boolean;
  }> {
    const {
      tenantId,
      employeeId,
      branchId,
      legalEntityId,
      workDate,
      pinnedProvenance,
      preResolved,
    } = args;

    // ROSTER pinned provenance
    if (
      pinnedProvenance?.scheduleSource === 'ROSTER' &&
      pinnedProvenance.rosterAssignmentId
    ) {
      const pinned = await this.shiftCheck.rebuildFromProvenance(
        tenantId,
        workDate,
        {
          scheduleSource: 'ROSTER',
          rosterAssignmentId: pinnedProvenance.rosterAssignmentId,
          resolvedShiftId: pinnedProvenance.resolvedShiftId,
          attendancePolicyId: pinnedProvenance.attendancePolicyId,
        },
      );
      return {
        schedule: pinned.schedule,
        crossesMidnight: pinned.crossesMidnight,
        isRestDay: pinned.isRestDay,
        provenance: {
          scheduleSource: 'ROSTER',
          resolvedShiftId: pinned.shiftId,
          shiftAssignmentId: null,
          rosterAssignmentId: pinned.rosterAssignmentId,
          attendancePolicyId: pinned.attendancePolicyId,
        },
      };
    }

    // SHIFT_ASSIGNMENT pinned provenance
    if (
      pinnedProvenance?.scheduleSource === 'SHIFT_ASSIGNMENT' &&
      pinnedProvenance.shiftAssignmentId &&
      pinnedProvenance.resolvedShiftId &&
      pinnedProvenance.attendancePolicyId
    ) {
      const pinned = await this.shiftCheck.rebuildFromProvenance(
        tenantId,
        workDate,
        {
          scheduleSource: 'SHIFT_ASSIGNMENT',
          shiftAssignmentId: pinnedProvenance.shiftAssignmentId,
          resolvedShiftId: pinnedProvenance.resolvedShiftId,
          attendancePolicyId: pinnedProvenance.attendancePolicyId,
        },
      );
      return {
        schedule: pinned.schedule,
        crossesMidnight: pinned.crossesMidnight,
        isRestDay: pinned.isRestDay,
        provenance: {
          scheduleSource: 'SHIFT_ASSIGNMENT',
          resolvedShiftId: pinned.shiftId,
          shiftAssignmentId: pinned.shiftAssignmentId,
          rosterAssignmentId: null,
          attendancePolicyId: pinned.attendancePolicyId,
        },
      };
    }

    // Pre-resolved (from resolveWorkDateForEvent — may be ROSTER or SHIFT_ASSIGNMENT)
    if (preResolved) {
      return {
        schedule: preResolved.schedule,
        crossesMidnight: preResolved.crossesMidnight,
        isRestDay: preResolved.isRestDay,
        provenance: {
          scheduleSource: preResolved.source,
          resolvedShiftId: preResolved.shiftId,
          shiftAssignmentId: preResolved.shiftAssignmentId,
          rosterAssignmentId: preResolved.rosterAssignmentId,
          attendancePolicyId: preResolved.attendancePolicyId,
        },
      };
    }

    if (pinnedProvenance?.scheduleSource === 'ATTENDANCE_POLICY') {
      // Legacy/policy provenance: re-resolve via scope ladder.
    }

    // Live resolve (roster → assignment → policy)
    const fromAssignment = await this.shiftCheck.getWorkSchedule(
      tenantId,
      employeeId,
      workDate,
    );
    if (fromAssignment) {
      return {
        schedule: fromAssignment.schedule,
        crossesMidnight: fromAssignment.crossesMidnight,
        isRestDay: fromAssignment.isRestDay,
        provenance: {
          scheduleSource: fromAssignment.source,
          resolvedShiftId: fromAssignment.shiftId,
          shiftAssignmentId: fromAssignment.shiftAssignmentId,
          rosterAssignmentId: fromAssignment.rosterAssignmentId,
          attendancePolicyId: fromAssignment.attendancePolicyId,
        },
      };
    }

    const policy = await this.policyService.resolvePolicy(
      tenantId,
      workDate,
      branchId,
      legalEntityId,
    );
    return {
      schedule: this.policyService.policyToSchedule(policy),
      crossesMidnight: false,
      isRestDay: false,
      provenance: {
        scheduleSource: 'ATTENDANCE_POLICY',
        resolvedShiftId: null,
        shiftAssignmentId: null,
        rosterAssignmentId: null,
        attendancePolicyId: policy.id,
      },
    };
  }

  private nonWorkingDayResult(
    status: string,
    isWeekend: boolean,
    isHoliday: boolean,
    isLeave: boolean,
    provenance: ShiftScheduleProvenance,
  ): CalculationResult {
    return {
      status,
      firstCheckIn: null,
      lastCheckOut: null,
      totalWorkedMinutes: 0,
      regularMinutes: 0,
      overtimeMinutes: 0,
      lateMinutes: 0,
      earlyDepartureMinutes: 0,
      isLeave,
      isHoliday,
      isWeekend,
      exceptions: [],
      provenance,
    };
  }
}
