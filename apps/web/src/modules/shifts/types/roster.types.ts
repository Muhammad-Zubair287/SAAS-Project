export type RosterStatus = 'DRAFT' | 'PUBLISHED';
export type RosterRecurrenceType = 'DAILY' | 'WEEKLY';
export type RosterCalendarView = 'day' | 'week' | 'month';

export interface RosterAssignment {
  id: string;
  employeeId: string;
  employeeName?: string | null;
  workDate: string;
  shiftId: string | null;
  shiftName?: string | null;
  shiftCode?: string | null;
  startLocalTime?: string | null;
  endLocalTime?: string | null;
  crossesMidnight?: boolean | null;
  branchId: string | null;
  branchName?: string | null;
  rosterStatus: RosterStatus | string;
  isRestDay: boolean;
  isDraftTip: boolean;
  isEffectivePublished: boolean;
  publishedAt: string | null;
  publishedBy: string | null;
  supersedesId: string | null;
  assignmentSource: string;
  sourceReferenceId: string | null;
  rowVersion: string;
  createdAt: string;
  updatedAt: string;
}

export interface RosterConflict {
  employeeId: string;
  workDate: string;
  existingDraftTipId?: string;
  existingPublishedId?: string;
}

export interface ListRostersParams {
  dateFrom: string;
  dateTo: string;
  page?: number;
  pageSize?: number;
  employeeId?: string;
  employeeIds?: string[];
  departmentId?: string;
  branchId?: string;
  rosterStatus?: RosterStatus;
  includeHistory?: boolean;
}

export interface CreateRosterAssignmentPayload {
  shiftId?: string;
  isRestDay?: boolean;
  branchId?: string;
  employeeIds?: string[];
  departmentId?: string;
  startDate: string;
  endDate: string;
  recurrence?: {
    type: RosterRecurrenceType;
    daysOfWeek?: number[];
  };
  restWeekdays?: number[];
  overrideExisting?: boolean;
  notificationRequested?: boolean;
}

export interface UpdateRosterAssignmentPayload {
  shiftId?: string;
  isRestDay?: boolean;
  branchId?: string | null;
}

export interface PublishRosterPayload {
  dateFrom: string;
  dateTo: string;
  employeeIds?: string[];
  departmentId?: string;
  branchId?: string;
  notificationRequested?: boolean;
  confirmAttendanceImpact?: boolean;
  overrideLocked?: boolean;
}

export interface RosterBulkResult {
  dateFrom: string;
  dateTo: string;
  employeesResolved: number;
  rowsCreated: number;
  sampleIds: string[];
  notificationRequested?: boolean;
}

export interface RosterPublishResult {
  dateFrom: string;
  dateTo: string;
  rowsPublished: number;
  employeesAffected: number;
  sampleIds: string[];
  notificationRequested?: boolean;
}
