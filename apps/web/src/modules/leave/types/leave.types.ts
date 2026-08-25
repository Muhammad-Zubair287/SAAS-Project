export type LeaveRequestStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'RETURNED'
  | 'CANCELLED'
  | 'COMPLETED';

export interface LeaveEmployeeRef {
  id: string;
  displayName: string | null;
  employeeNumber: string | null;
}

export interface LeaveType {
  id: string;
  code: string;
  name: string;
  paidStatus: 'PAID' | 'UNPAID' | 'MIXED';
  unit: 'DAY' | 'HOUR';
  halfDayAllowed: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  rowVersion: string;
  message?: string;
}

export interface LeaveRequestDay {
  id: string;
  leaveDate: string;
  quantity: number;
  dayPart: string;
  payrollImpact: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employee: LeaveEmployeeRef;
  leaveType: {
    id: string;
    code: string;
    name: string;
    paidStatus: string;
    unit: string;
  };
  startsOn: string;
  endsOn: string;
  requestedQuantity: number;
  reason: string | null;
  emergency: boolean;
  status: LeaveRequestStatus;
  submittedAt: string | null;
  decidedAt: string | null;
  decidedBy: string | null;
  days: LeaveRequestDay[];
  createdAt: string;
  updatedAt: string;
  rowVersion: string;
}

export interface LeaveSummary {
  pendingCount: number;
  typesCount: number;
}

export interface ListLeaveRequestsParams {
  page?: number;
  pageSize?: number;
  status?: string;
}

export interface CreateLeaveTypePayload {
  code: string;
  name: string;
  paidStatus: 'PAID' | 'UNPAID' | 'MIXED';
  unit: 'DAY' | 'HOUR';
  halfDayAllowed?: boolean;
}

export interface UpdateLeaveTypePayload {
  name?: string;
  paidStatus?: 'PAID' | 'UNPAID' | 'MIXED';
  unit?: 'DAY' | 'HOUR';
  halfDayAllowed?: boolean;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface AdjustLeaveBalancePayload {
  employeeId: string;
  leaveTypeId: string;
  quantity: number;
  effectiveDate: string;
  reason: string;
  entryType?: 'GRANT' | 'ADJUSTMENT';
}
