import { apiClient } from '../../../lib/api/client';
import type { ApiSuccessResponse } from '../../../lib/api/types';
import type {
  AcknowledgeEssPolicyPayload,
  CreateEssLeaveRequestPayload,
  CreateEssRequestPayload,
  EssAttendanceRecord,
  EssDashboardResponse,
  EssDateRangeParams,
  EssDocument,
  EssLeaveBalance,
  EssLeaveRequest,
  EssLeaveRequestsParams,
  EssLeaveType,
  EssListParams,
  EssNotification,
  EssNotificationsParams,
  EssPayslip,
  EssPolicy,
  EssProfileResponse,
  EssRequestDetail,
  EssRequestListItem,
  EssRequestsParams,
  EssRosterItem,
  EssTodayAttendanceResponse,
  PatchEssProfilePayload,
} from '../types/ess.types';

export const essApi = {
  dashboard: {
    get: () =>
      apiClient
        .get<ApiSuccessResponse<EssDashboardResponse>>('/me/dashboard')
        .then((r) => r.data),
  },
  profile: {
    get: () =>
      apiClient
        .get<ApiSuccessResponse<EssProfileResponse>>('/me/profile')
        .then((r) => r.data),
    patch: (payload: PatchEssProfilePayload) =>
      apiClient
        .patch<ApiSuccessResponse<EssProfileResponse>>('/me/profile', payload)
        .then((r) => r.data),
  },
  attendance: {
    records: (params?: EssDateRangeParams) =>
      apiClient
        .get<ApiSuccessResponse<EssAttendanceRecord[]>>('/me/attendance/records', { params })
        .then((r) => r.data),
    today: () =>
      apiClient
        .get<ApiSuccessResponse<EssTodayAttendanceResponse>>('/me/attendance/today')
        .then((r) => r.data),
    checkIn: () =>
      apiClient
        .post<ApiSuccessResponse<unknown>>('/me/attendance/check-in', {})
        .then((r) => r.data),
    checkOut: () =>
      apiClient
        .post<ApiSuccessResponse<unknown>>('/me/attendance/check-out', {})
        .then((r) => r.data),
  },
  documents: {
    list: (params?: EssListParams) =>
      apiClient
        .get<ApiSuccessResponse<EssDocument[]>>('/me/documents', { params })
        .then((r) => r.data),
    get: (id: string) =>
      apiClient
        .get<ApiSuccessResponse<EssDocument>>(`/me/documents/${id}`)
        .then((r) => r.data),
  },
  roster: {
    list: (params?: EssDateRangeParams) =>
      apiClient
        .get<ApiSuccessResponse<EssRosterItem[]>>('/me/roster', { params })
        .then((r) => r.data),
  },
  leave: {
    balances: () =>
      apiClient
        .get<ApiSuccessResponse<EssLeaveBalance[]>>('/me/leave/balances')
        .then((r) => r.data),
    types: () =>
      apiClient
        .get<ApiSuccessResponse<EssLeaveType[]>>('/me/leave/types')
        .then((r) => r.data),
    requests: (params?: EssLeaveRequestsParams) =>
      apiClient
        .get<ApiSuccessResponse<EssLeaveRequest[]>>('/me/leave/requests', { params })
        .then((r) => r.data),
    getRequest: (id: string) =>
      apiClient
        .get<ApiSuccessResponse<EssLeaveRequest>>(`/me/leave/requests/${id}`)
        .then((r) => r.data),
    createRequest: (payload: CreateEssLeaveRequestPayload) =>
      apiClient
        .post<ApiSuccessResponse<EssLeaveRequest>>('/me/leave/requests', payload)
        .then((r) => r.data),
    submitRequest: (id: string) =>
      apiClient
        .post<ApiSuccessResponse<EssLeaveRequest>>(`/me/leave/requests/${id}/submit`, {})
        .then((r) => r.data),
    cancelRequest: (id: string) =>
      apiClient
        .post<ApiSuccessResponse<EssLeaveRequest>>(`/me/leave/requests/${id}/cancel`, {})
        .then((r) => r.data),
  },
  payslips: {
    list: (params?: EssListParams) =>
      apiClient
        .get<ApiSuccessResponse<EssPayslip[]>>('/me/payslips', { params })
        .then((r) => r.data),
    get: (id: string) =>
      apiClient
        .get<ApiSuccessResponse<EssPayslip>>(`/me/payslips/${id}`)
        .then((r) => r.data),
  },
  requests: {
    list: (params?: EssRequestsParams) =>
      apiClient
        .get<ApiSuccessResponse<EssRequestListItem[]>>('/me/requests', { params })
        .then((r) => r.data),
    get: (id: string) =>
      apiClient
        .get<ApiSuccessResponse<EssRequestDetail>>(`/me/requests/${id}`)
        .then((r) => r.data),
    create: (payload: CreateEssRequestPayload) =>
      apiClient
        .post<ApiSuccessResponse<EssRequestDetail>>('/me/requests', payload)
        .then((r) => r.data),
    submit: (id: string) =>
      apiClient
        .post<ApiSuccessResponse<EssRequestDetail>>(`/me/requests/${id}/submit`, {})
        .then((r) => r.data),
    cancel: (id: string) =>
      apiClient
        .post<ApiSuccessResponse<EssRequestDetail>>(`/me/requests/${id}/cancel`, {})
        .then((r) => r.data),
  },
  notifications: {
    list: (params?: EssNotificationsParams) =>
      apiClient
        .get<ApiSuccessResponse<EssNotification[]>>('/me/notifications', { params })
        .then((r) => r.data),
    unreadCount: () =>
      apiClient
        .get<ApiSuccessResponse<{ count: number }>>('/me/notifications/unread-count')
        .then((r) => r.data),
    markRead: (id: string) =>
      apiClient
        .post<ApiSuccessResponse<EssNotification>>(`/me/notifications/${id}/read`, {})
        .then((r) => r.data),
    markAllRead: () =>
      apiClient
        .post<ApiSuccessResponse<{ updated: number }>>('/me/notifications/read-all', {})
        .then((r) => r.data),
  },
  policies: {
    list: () =>
      apiClient
        .get<ApiSuccessResponse<EssPolicy[]>>('/me/policies')
        .then((r) => r.data),
    acknowledge: (payload: AcknowledgeEssPolicyPayload) =>
      apiClient
        .post<ApiSuccessResponse<{ id: string; acknowledgedAt: string }>>(
          '/me/policies/acknowledge',
          payload,
        )
        .then((r) => r.data),
  },
};
