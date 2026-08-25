export type ShiftStatus = 'ACTIVE' | 'INACTIVE';

export interface Shift {
  id: string;
  code: string;
  name: string;
  version: number;
  status: ShiftStatus | string;
  startLocalTime: string;
  endLocalTime: string;
  crossesMidnight: boolean;
  requiredMinutes: number;
  breakMinutes: number;
  breakPaid: boolean;
  checkInWindowBeforeMinutes: number;
  checkInWindowAfterMinutes: number;
  checkOutWindowAfterMinutes: number;
  attendancePolicyId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  rowVersion: string;
  createdAt: string;
  updatedAt: string;
  /** Present on list responses — current effective assignment count. */
  activeAssignmentCount?: number;
}

export interface ListShiftsParams {
  page?: number;
  pageSize?: number;
  status?: ShiftStatus | '';
  search?: string;
  sortBy?: 'code' | 'name' | 'effectiveFrom' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateShiftPayload {
  code: string;
  name: string;
  startLocalTime: string;
  endLocalTime: string;
  crossesMidnight?: boolean;
  requiredMinutes: number;
  breakMinutes?: number;
  breakPaid?: boolean;
  checkInWindowBeforeMinutes?: number;
  checkInWindowAfterMinutes?: number;
  checkOutWindowAfterMinutes?: number;
  attendancePolicyId: string;
  effectiveFrom: string;
  effectiveTo?: string;
}

export type UpdateShiftPayload = Partial<CreateShiftPayload> & {
  status?: ShiftStatus;
};
