import { apiClient } from '../../../lib/api/client';
import type { ApiSuccessResponse } from '../../../lib/api/types';
import type {
  AdjustLeaveBalancePayload,
  CreateLeaveTypePayload,
  LeaveRequest,
  LeaveSummary,
  LeaveType,
  ListLeaveRequestsParams,
  UpdateLeaveTypePayload,
} from '../types/leave.types';

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  timestamp: string;
}

const BASE = '/leave';

export const leaveApi = {
  summary: () =>
    apiClient.get<ApiSuccessResponse<LeaveSummary>>(`${BASE}/summary`).then((r) => r.data),

  requests: {
    list: (params?: ListLeaveRequestsParams) =>
      apiClient
        .get<PaginatedResponse<LeaveRequest>>(`${BASE}/requests`, { params })
        .then((r) => r.data),

    getById: (id: string) =>
      apiClient
        .get<ApiSuccessResponse<LeaveRequest>>(`${BASE}/requests/${id}`)
        .then((r) => r.data),

    approve: (id: string) =>
      apiClient
        .post<ApiSuccessResponse<LeaveRequest> & { message?: string }>(
          `/leave-requests/${id}/approve`,
          {},
        )
        .then((r) => r.data),

    reject: (id: string) =>
      apiClient
        .post<ApiSuccessResponse<LeaveRequest> & { message?: string }>(
          `/leave-requests/${id}/reject`,
          {},
        )
        .then((r) => r.data),
  },

  types: {
    list: () =>
      apiClient.get<ApiSuccessResponse<LeaveType[]>>(`${BASE}/types`).then((r) => r.data),

    create: (payload: CreateLeaveTypePayload) =>
      apiClient
        .post<ApiSuccessResponse<LeaveType> & { message?: string }>(`${BASE}/types`, payload)
        .then((r) => r.data),

    update: (id: string, payload: UpdateLeaveTypePayload) =>
      apiClient
        .patch<ApiSuccessResponse<LeaveType> & { message?: string }>(
          `${BASE}/types/${id}`,
          payload,
        )
        .then((r) => r.data),
  },

  balances: {
    adjust: (payload: AdjustLeaveBalancePayload) =>
      apiClient
        .post<ApiSuccessResponse<unknown> & { message?: string }>(
          `${BASE}/balances/adjustments`,
          payload,
        )
        .then((r) => r.data),

    grant: (payload: AdjustLeaveBalancePayload) =>
      apiClient
        .post<ApiSuccessResponse<unknown> & { message?: string }>(
          `${BASE}/balances/grants`,
          payload,
        )
        .then((r) => r.data),
  },
};
