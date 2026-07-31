import { Injectable } from '@nestjs/common';
import {
  ATTENDANCE_STATUS,
  ATTENDANCE_EXCEPTION_TYPE,
} from '../constants/attendance.constants';
import type { LeaveCheckAdapter } from '../interfaces/leave-check-adapter.interface';
import type { ShiftCheckAdapter, ShiftWorkSchedule } from '../interfaces/shift-check-adapter.interface';

export interface RawEventInput {
  id: string;
  eventType: string;  // CHECK_IN | CHECK_OUT
  eventTime: Date;
}

export interface CalculationInput {
  tenantId: string;
  employeeId: string;
  legalEntityId: string | null;
  workDate: Date;
  rawEvents: RawEventInput[];
  leaveAdapter: LeaveCheckAdapter;
  shiftAdapter: ShiftCheckAdapter;
  policySchedule: ShiftWorkSchedule;
}

export interface ExceptionResult {
  exceptionType: string;
  description: string;
  severity: string;  // INFO | WARNING | ERROR
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
}

@Injectable()
export class AttendanceCalculatorService {
  async calculate(input: CalculationInput): Promise<CalculationResult> {
    const { tenantId, employeeId, legalEntityId, workDate, rawEvents, leaveAdapter, shiftAdapter, policySchedule } = input;

    // 1. Get schedule (shift adapter overrides policy schedule; policy schedule is required)
    const schedule: ShiftWorkSchedule =
      (await shiftAdapter.getWorkSchedule(tenantId, employeeId, workDate)) ?? policySchedule;

    // 2. Check non-working day first (early exit)
    const dayOfWeek = workDate.getDay(); // 0=Sun, 6=Sat
    const isWeekend = schedule.weekendDays.includes(dayOfWeek);
    if (isWeekend) {
      return this.nonWorkingDayResult(ATTENDANCE_STATUS.WEEKEND, true, false, false);
    }

    const isHoliday = await leaveAdapter.isHoliday(tenantId, legalEntityId, workDate);
    if (isHoliday) {
      return this.nonWorkingDayResult(ATTENDANCE_STATUS.HOLIDAY, false, true, false);
    }

    const isLeave = await leaveAdapter.hasApprovedLeave(tenantId, employeeId, workDate);
    if (isLeave) {
      return this.nonWorkingDayResult(ATTENDANCE_STATUS.ON_LEAVE, false, false, true);
    }

    // 3. No raw events = ABSENT
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
      };
    }

    // 4. Extract check-ins and check-outs
    const checkIns = rawEvents
      .filter((e) => e.eventType === 'CHECK_IN')
      .sort((a, b) => a.eventTime.getTime() - b.eventTime.getTime());
    const checkOuts = rawEvents
      .filter((e) => e.eventType === 'CHECK_OUT')
      .sort((a, b) => a.eventTime.getTime() - b.eventTime.getTime());

    const firstCheckIn  = checkIns.length  > 0 ? checkIns[0]!.eventTime  : null;
    const lastCheckOut  = checkOuts.length > 0 ? checkOuts[checkOuts.length - 1]!.eventTime : null;

    const exceptions: ExceptionResult[] = [];

    // 5. Missing punch detection
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
      };
    }

    // 6. Compute worked time
    const totalWorkedMinutes = Math.max(
      0,
      Math.floor((lastCheckOut.getTime() - firstCheckIn.getTime()) / 60000),
    );

    // 7. Parse schedule times (HH:MM) in workDate context
    const [startH, startM] = schedule.workStartTime.split(':').map(Number) as [number, number];
    const [endH, endM]     = schedule.workEndTime.split(':').map(Number) as [number, number];

    const scheduledStart = new Date(workDate);
    scheduledStart.setHours(startH, startM, 0, 0);

    const scheduledEnd = new Date(workDate);
    scheduledEnd.setHours(endH, endM, 0, 0);

    // 8. Late minutes
    const rawLate = Math.max(
      0,
      Math.floor((firstCheckIn.getTime() - scheduledStart.getTime()) / 60000) - schedule.gracePeriodMinutes,
    );
    const lateMinutes = Math.max(0, rawLate);
    if (lateMinutes > schedule.lateToleranceMinutes) {
      exceptions.push({
        exceptionType: ATTENDANCE_EXCEPTION_TYPE.LATE,
        description: `Late by ${lateMinutes} minutes`,
        severity: 'WARNING',
      });
    }

    // 9. Early departure
    const rawEarly = Math.max(
      0,
      Math.floor((scheduledEnd.getTime() - lastCheckOut.getTime()) / 60000),
    );
    const earlyDepartureMinutes = Math.max(0, rawEarly - schedule.earlyDepartureMinutes);
    if (earlyDepartureMinutes > 0) {
      exceptions.push({
        exceptionType: ATTENDANCE_EXCEPTION_TYPE.EARLY_DEPARTURE,
        description: `Left ${earlyDepartureMinutes} minutes early`,
        severity: 'WARNING',
      });
    }

    // 10. Overtime
    const excessMinutes  = Math.max(0, totalWorkedMinutes - schedule.workMinutesRequired);
    const overtimeMinutes = Math.max(0, excessMinutes - schedule.overtimeThresholdMinutes);

    // 11. Regular minutes
    const regularMinutes = Math.min(totalWorkedMinutes, schedule.workMinutesRequired);

    // 12. Determine status (priority ladder)
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
    };
  }

  private nonWorkingDayResult(
    status: string,
    isWeekend: boolean,
    isHoliday: boolean,
    isLeave: boolean,
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
    };
  }
}
