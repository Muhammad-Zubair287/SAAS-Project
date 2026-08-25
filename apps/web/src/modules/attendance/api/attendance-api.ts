import { apiClient } from '../../../lib/api/client';
import type { ApiSuccessResponse } from '../../../lib/api/types';
import type {
  AttendanceEvent,
  AttendanceRecord,
  AttendanceException,
  CreateAttendanceEventPayload,
  CreateManualAttendanceRecordPayload,
  ListAttendanceParams,
  AttendancePeriod,
  AttendancePeriodLockPayload,
  AttendancePeriodUnlockPayload,
} from '../types/attendance.types';

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

const EVENTS_BASE = '/attendance/events';
const RECORDS_BASE = '/attendance/records';
const EXCEPTIONS_BASE = '/attendance/exceptions';

export const attendanceApi = {
  events: {
    ingest: (payload: CreateAttendanceEventPayload) =>
      apiClient
        .post<ApiSuccessResponse<AttendanceEvent>>(EVENTS_BASE, payload)
        .then((r) => r.data),

    list: (params?: ListAttendanceParams) =>
      apiClient
        .get<PaginatedResponse<AttendanceEvent>>(EVENTS_BASE, { params })
        .then((r) => r.data),

    getById: (id: string) =>
      apiClient
        .get<ApiSuccessResponse<AttendanceEvent>>(`${EVENTS_BASE}/${id}`)
        .then((r) => r.data),
  },

  records: {
    list: (params?: ListAttendanceParams) =>
      apiClient
        .get<PaginatedResponse<AttendanceRecord>>(RECORDS_BASE, { params })
        .then((r) => r.data),

    getById: (id: string) =>
      apiClient
        .get<ApiSuccessResponse<AttendanceRecord>>(`${RECORDS_BASE}/${id}`)
        .then((r) => r.data),

    getByEmployee: (employeeId: string, params?: ListAttendanceParams) =>
      apiClient
        .get<PaginatedResponse<AttendanceRecord>>(
          `${RECORDS_BASE}/employee/${employeeId}`,
          { params },
        )
        .then((r) => r.data),

    createManual: (payload: CreateManualAttendanceRecordPayload) =>
      apiClient
        .post<ApiSuccessResponse<AttendanceRecord>>(RECORDS_BASE, payload)
        .then((r) => r.data),

    recalculate: (payload: { employeeId: string; dateFrom: string; dateTo: string }) =>
      apiClient
        .post<ApiSuccessResponse<void>>(`${RECORDS_BASE}/recalculate`, payload)
        .then((r) => r.data),
  },

  exceptions: {
    list: (params?: ListAttendanceParams) =>
      apiClient
        .get<PaginatedResponse<AttendanceException>>(EXCEPTIONS_BASE, { params })
        .then((r) => r.data),

    getById: (id: string) =>
      apiClient
        .get<ApiSuccessResponse<AttendanceException>>(`${EXCEPTIONS_BASE}/${id}`)
        .then((r) => r.data),

    resolve: (id: string, payload: { resolutionNote?: string }) =>
      apiClient
        .patch<ApiSuccessResponse<AttendanceException>>(
          `${EXCEPTIONS_BASE}/${id}/resolve`,
          payload,
        )
        .then((r) => r.data),
  },

  periods: {
    list: () =>
      apiClient
        .get<ApiSuccessResponse<AttendancePeriod[]>>('/attendance/periods')
        .then((r) => r.data),

    lock: (payload: AttendancePeriodLockPayload) =>
      apiClient
        .post<ApiSuccessResponse<AttendancePeriod>>('/attendance/period-lock', payload)
        .then((r) => r.data),

    unlock: (payload: AttendancePeriodUnlockPayload) =>
      apiClient
        .post<ApiSuccessResponse<AttendancePeriod>>('/attendance/period-unlock', payload)
        .then((r) => r.data),
  },
};
