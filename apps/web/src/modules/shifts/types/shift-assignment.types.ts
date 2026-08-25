export type ShiftAssignmentSource =
  | 'INDIVIDUAL'
  | 'DEPARTMENT'
  | 'DEFAULT';

export interface ShiftAssignment {
  id: string;
  employeeId: string;
  employeeName?: string | null;
  shiftId: string;
  shiftName?: string | null;
  shiftCode?: string | null;
  branchId: string | null;
  branchName?: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  assignmentSource: ShiftAssignmentSource | string;
  sourceReferenceId: string | null;
  rowVersion: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentConflict {
  employeeId: string;
  conflictingAssignmentId: string;
  shiftId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface CreateShiftAssignmentPayload {
  shiftId: string;
  effectiveFrom: string;
  effectiveTo?: string;
  employeeIds?: string[];
  departmentId?: string;
  branchId?: string;
  overrideExisting?: boolean;
  notificationRequested?: boolean;
}

export interface UpdateShiftAssignmentPayload {
  shiftId?: string;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  branchId?: string | null;
  overrideExisting?: boolean;
}

export interface ShiftAssignmentBulkResult {
  target: 'EMPLOYEES' | 'DEPARTMENT';
  departmentId: string | null;
  employeesResolved: number;
  created: number;
  overridden: number;
  assignments: ShiftAssignment[];
  notificationRequested?: boolean;
}

export interface ListShiftAssignmentsParams {
  page?: number;
  pageSize?: number;
  employeeId?: string;
  departmentId?: string;
  shiftId?: string;
  asOf?: string;
}
