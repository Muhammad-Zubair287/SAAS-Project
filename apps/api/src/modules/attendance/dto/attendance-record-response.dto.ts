export class AttendanceRecordResponseDto {
  id!: string;
  tenantId!: string;
  employeeId!: string;
  attendanceDate!: string;           // YYYY-MM-DD
  firstCheckIn!: string | null;      // ISO timestamp
  lastCheckOut!: string | null;
  totalWorkedMinutes!: number;
  regularMinutes!: number;
  overtimeMinutes!: number;
  lateMinutes!: number;
  earlyDepartureMinutes!: number;
  status!: string;
  isManual!: boolean;
  isLeave!: boolean;
  isHoliday!: boolean;
  isWeekend!: boolean;
  manualNote!: string | null;
  periodLocked!: boolean;
  calculationVersion!: number;
  calculatedAt!: string | null;
  scheduleSource!: string | null;
  resolvedShiftId!: string | null;
  shiftAssignmentId!: string | null;
  rosterAssignmentId!: string | null;
  attendancePolicyId!: string | null;
  createdAt!: string;
  updatedAt!: string;
  rowVersion!: string;
}
