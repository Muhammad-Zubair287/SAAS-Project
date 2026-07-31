export interface ShiftWorkSchedule {
  workStartTime: string;            // "HH:MM" local time
  workEndTime: string;              // "HH:MM" local time
  workMinutesRequired: number;
  gracePeriodMinutes: number;
  lateToleranceMinutes: number;
  earlyDepartureMinutes: number;
  overtimeThresholdMinutes: number;
  halfDayThresholdMinutes: number;
  weekendDays: number[];            // ISO day numbers 0=Sun, 6=Sat
  timezone: string;                 // IANA timezone string
}

export interface ShiftCheckAdapter {
  getWorkSchedule(tenantId: string, employeeId: string, date: Date): Promise<ShiftWorkSchedule | null>;
}

export class NullShiftCheckAdapter implements ShiftCheckAdapter {
  async getWorkSchedule(): Promise<ShiftWorkSchedule | null> { return null; }
}
