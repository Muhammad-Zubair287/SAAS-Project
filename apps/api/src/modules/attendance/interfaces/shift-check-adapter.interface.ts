export interface ShiftWorkSchedule {
  workStartTime: string; // "HH:MM" local time
  workEndTime: string; // "HH:MM" local time
  workMinutesRequired: number;
  gracePeriodMinutes: number;
  lateToleranceMinutes: number;
  earlyDepartureMinutes: number;
  overtimeThresholdMinutes: number;
  halfDayThresholdMinutes: number;
  weekendDays: number[]; // 0=Sun … 6=Sat
  timezone: string; // IANA
}

export type ScheduleSource = 'ROSTER' | 'SHIFT_ASSIGNMENT' | 'ATTENDANCE_POLICY';

/**
 * Resolved schedule from M07 (roster or ShiftAssignment).
 * Rest-day roster rows set isRestDay=true and null shift fields.
 */
export interface ResolvedWorkSchedule {
  schedule: ShiftWorkSchedule;
  crossesMidnight: boolean;
  source: 'ROSTER' | 'SHIFT_ASSIGNMENT';
  isRestDay: boolean;
  shiftId: string | null;
  shiftCode: string | null;
  shiftVersion: number | null;
  shiftAssignmentId: string | null;
  rosterAssignmentId: string | null;
  attendancePolicyId: string | null;
  /** Inclusive window used for punch attribution (not hard reject). */
  attributionWindowStart: Date;
  attributionWindowEnd: Date;
}

export interface ShiftScheduleProvenance {
  scheduleSource: ScheduleSource;
  resolvedShiftId: string | null;
  shiftAssignmentId: string | null;
  rosterAssignmentId: string | null;
  attendancePolicyId: string | null;
}

export interface ShiftCheckAdapter {
  getWorkSchedule(
    tenantId: string,
    employeeId: string,
    workDate: Date,
  ): Promise<ResolvedWorkSchedule | null>;

  resolveWorkDateForEvent(
    tenantId: string,
    employeeId: string,
    eventTime: Date,
  ): Promise<{
    workDate: Date;
    resolved: ResolvedWorkSchedule | null;
  }>;

  rebuildFromProvenance(
    tenantId: string,
    workDate: Date,
    provenance: {
      scheduleSource: ScheduleSource;
      shiftAssignmentId?: string | null;
      rosterAssignmentId?: string | null;
      resolvedShiftId?: string | null;
      attendancePolicyId?: string | null;
    },
  ): Promise<ResolvedWorkSchedule>;
}

export class NullShiftCheckAdapter implements ShiftCheckAdapter {
  async getWorkSchedule(): Promise<ResolvedWorkSchedule | null> {
    return null;
  }

  async resolveWorkDateForEvent(
    _tenantId: string,
    _employeeId: string,
    eventTime: Date,
  ): Promise<{ workDate: Date; resolved: ResolvedWorkSchedule | null }> {
    const workDate = new Date(eventTime);
    workDate.setHours(0, 0, 0, 0);
    return { workDate, resolved: null };
  }

  async rebuildFromProvenance(): Promise<ResolvedWorkSchedule> {
    throw new Error('NullShiftCheckAdapter cannot rebuild provenance');
  }
}

export const SHIFT_CHECK_ADAPTER = Symbol('SHIFT_CHECK_ADAPTER');
