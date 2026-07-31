export interface AttendancePolicy {
  id: string;
  tenantId: string;
  legalEntityId: string | null;
  branchId: string | null;
  name: string;
  description: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  version: number;
  isCurrent: boolean;
  workingMinutesPerDay: number;
  workStartTime: string;
  workEndTime: string;
  graceMinutes: number;
  lateToleranceMinutes: number;
  earlyDepartureToleranceMinutes: number;
  halfDayMinutes: number;
  minimumWorkingMinutes: number;
  overtimeThresholdMinutes: number;
  roundingStrategy: string;
  weekendDefinition: number[];
  timezone: string;
  allowManualAttendance: boolean;
  allowEarlyCheckIn: boolean;
  allowLateCheckOut: boolean;
  allowOvertime: boolean;
  allowedIpRanges: string[] | null;
  createdBy: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  rowVersion: string;
}

export interface CreateAttendancePolicyPayload {
  legalEntityId?: string;
  branchId?: string;
  name: string;
  description?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  workingMinutesPerDay: number;
  workStartTime: string;
  workEndTime: string;
  graceMinutes: number;
  lateToleranceMinutes: number;
  earlyDepartureToleranceMinutes: number;
  halfDayMinutes: number;
  minimumWorkingMinutes: number;
  overtimeThresholdMinutes: number;
  weekendDefinition: number[];
  timezone?: string;
  allowManualAttendance?: boolean;
  allowEarlyCheckIn?: boolean;
  allowLateCheckOut?: boolean;
  allowOvertime?: boolean;
  allowedIpRanges?: string[];
}

export interface UpdateAttendancePolicyPayload extends Partial<CreateAttendancePolicyPayload> {}

export interface ListAttendancePoliciesParams {
  legalEntityId?: string;
  branchId?: string;
  isCurrentOnly?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}
