export type AttendanceStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'LATE'
  | 'HALF_DAY'
  | 'EARLY_DEPARTURE'
  | 'MISSING_PUNCH'
  | 'ON_LEAVE'
  | 'HOLIDAY'
  | 'WEEKEND'
  | 'REMOTE_WORK'
  | 'BUSINESS_TRIP';

export type AttendanceEventType = 'CHECK_IN' | 'CHECK_OUT';

export type AttendanceSource =
  | 'BIOMETRIC'
  | 'MOBILE'
  | 'WEB'
  | 'MANUAL'
  | 'API'
  | 'OFFLINE_SYNC';

export type AttendanceExceptionType =
  | 'LATE'
  | 'EARLY_DEPARTURE'
  | 'MISSING_CHECK_IN'
  | 'MISSING_CHECK_OUT'
  | 'OVERTIME_UNAPPROVED';

export interface AttendanceEvent {
  id: string;
  tenantId: string;
  employeeId: string;
  eventType: AttendanceEventType;
  source: AttendanceSource;
  eventTime: string;
  recordedAt: string;
  deviceId: string | null;
  idempotencyKey: string;
  isCorrection: boolean;
  correctsEventId: string | null;
  status: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  tenantId: string;
  employeeId: string;
  attendanceDate: string;  // YYYY-MM-DD
  firstCheckIn: string | null;
  lastCheckOut: string | null;
  totalWorkedMinutes: number;
  regularMinutes: number;
  overtimeMinutes: number;
  lateMinutes: number;
  earlyDepartureMinutes: number;
  status: AttendanceStatus;
  isManual: boolean;
  isLeave: boolean;
  isHoliday: boolean;
  isWeekend: boolean;
  manualNote: string | null;
  periodLocked: boolean;
  calculationVersion: number;
  calculatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  rowVersion: string;
}

export interface AttendanceException {
  id: string;
  tenantId: string;
  attendanceRecordId: string;
  employeeId: string;
  exceptionType: AttendanceExceptionType;
  exceptionDate: string;
  description: string | null;
  severity: string;
  isResolved: boolean;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAttendanceEventPayload {
  employeeId: string;
  eventType: AttendanceEventType;
  eventTime: string;
  source: AttendanceSource;
  deviceId?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateManualAttendanceRecordPayload {
  employeeId: string;
  attendanceDate: string;
  status: AttendanceStatus;
  manualNote?: string;
}

export interface ListAttendanceParams {
  page?: number;
  pageSize?: number;
  employeeId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  departmentId?: string;
  legalEntityId?: string;
  isResolved?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AttendancePeriod {
  id: string;
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  isLocked: boolean;
  lockedAt: string | null;
  unlockedAt: string | null;
  lockedBy: string | null;
  unlockReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttendancePeriodLockPayload {
  periodStart: string;
  periodEnd: string;
}

export interface AttendancePeriodUnlockPayload extends AttendancePeriodLockPayload {
  reason: string;
}
