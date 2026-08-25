'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { essApi } from '../api/ess-api';
import type {
  AcknowledgeEssPolicyPayload,
  CreateEssLeaveRequestPayload,
  CreateEssRequestPayload,
  EssDateRangeParams,
  EssLeaveRequestsParams,
  EssListParams,
  EssNotificationsParams,
  EssRequestsParams,
  PatchEssProfilePayload,
} from '../types/ess.types';

export const ESS_KEYS = {
  all: ['ess'] as const,
  dashboard: () => [...ESS_KEYS.all, 'dashboard'] as const,
  profile: () => [...ESS_KEYS.all, 'profile'] as const,
  attendance: {
    all: () => [...ESS_KEYS.all, 'attendance'] as const,
    today: () => [...ESS_KEYS.attendance.all(), 'today'] as const,
    records: (params?: EssDateRangeParams) =>
      [...ESS_KEYS.attendance.all(), 'records', params ?? {}] as const,
  },
  documents: {
    all: () => [...ESS_KEYS.all, 'documents'] as const,
    list: (params?: EssListParams) => [...ESS_KEYS.documents.all(), params ?? {}] as const,
    detail: (id: string) => [...ESS_KEYS.documents.all(), id] as const,
  },
  roster: (params?: EssDateRangeParams) => [...ESS_KEYS.all, 'roster', params ?? {}] as const,
  leave: {
    all: () => [...ESS_KEYS.all, 'leave'] as const,
    balances: () => [...ESS_KEYS.leave.all(), 'balances'] as const,
    types: () => [...ESS_KEYS.leave.all(), 'types'] as const,
    requests: (params?: EssLeaveRequestsParams) => [...ESS_KEYS.leave.all(), 'requests', params ?? {}] as const,
    detail: (id: string) => [...ESS_KEYS.leave.all(), 'requests', id] as const,
  },
  payslips: {
    all: () => [...ESS_KEYS.all, 'payslips'] as const,
    list: (params?: EssListParams) => [...ESS_KEYS.payslips.all(), params ?? {}] as const,
    detail: (id: string) => [...ESS_KEYS.payslips.all(), id] as const,
  },
  requests: {
    all: () => [...ESS_KEYS.all, 'requests'] as const,
    list: (params?: EssRequestsParams) => [...ESS_KEYS.requests.all(), params ?? {}] as const,
    detail: (id: string) => [...ESS_KEYS.requests.all(), id] as const,
  },
  notifications: {
    all: () => [...ESS_KEYS.all, 'notifications'] as const,
    list: (params?: EssNotificationsParams) =>
      [...ESS_KEYS.notifications.all(), params ?? {}] as const,
    unreadCount: () => [...ESS_KEYS.notifications.all(), 'unread-count'] as const,
  },
  policies: () => [...ESS_KEYS.all, 'policies'] as const,
};

function invalidateEssHome(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ESS_KEYS.dashboard() });
}

export function useEssDashboard() {
  return useQuery({
    queryKey: ESS_KEYS.dashboard(),
    queryFn: () => essApi.dashboard.get(),
    staleTime: 60_000,
  });
}

export function useEssProfile() {
  return useQuery({
    queryKey: ESS_KEYS.profile(),
    queryFn: () => essApi.profile.get(),
    staleTime: 60_000,
  });
}

export function usePatchEssProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PatchEssProfilePayload) => essApi.profile.patch(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ESS_KEYS.profile() });
      invalidateEssHome(queryClient);
    },
  });
}

export function useEssTodayAttendance() {
  return useQuery({
    queryKey: ESS_KEYS.attendance.today(),
    queryFn: () => essApi.attendance.today(),
    staleTime: 30_000,
  });
}

export function useEssAttendanceRecords(params?: EssDateRangeParams) {
  return useQuery({
    queryKey: ESS_KEYS.attendance.records(params),
    queryFn: () => essApi.attendance.records(params),
    staleTime: 30_000,
  });
}

export function useEssCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => essApi.attendance.checkIn(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ESS_KEYS.attendance.all() });
      invalidateEssHome(queryClient);
    },
  });
}

export function useEssCheckOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => essApi.attendance.checkOut(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ESS_KEYS.attendance.all() });
      invalidateEssHome(queryClient);
    },
  });
}

export function useEssDocuments(params?: EssListParams) {
  return useQuery({
    queryKey: ESS_KEYS.documents.list(params),
    queryFn: () => essApi.documents.list(params),
    staleTime: 60_000,
  });
}

export function useEssDocument(id: string) {
  return useQuery({
    queryKey: ESS_KEYS.documents.detail(id),
    queryFn: () => essApi.documents.get(id),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

export function useEssRoster(params?: EssDateRangeParams) {
  return useQuery({
    queryKey: ESS_KEYS.roster(params),
    queryFn: () => essApi.roster.list(params),
    staleTime: 60_000,
  });
}

export function useEssLeaveBalances() {
  return useQuery({
    queryKey: ESS_KEYS.leave.balances(),
    queryFn: () => essApi.leave.balances(),
    staleTime: 30_000,
  });
}

export function useEssLeaveTypes() {
  return useQuery({
    queryKey: ESS_KEYS.leave.types(),
    queryFn: () => essApi.leave.types(),
    staleTime: 60_000,
  });
}

export function useEssLeaveRequests(params?: EssLeaveRequestsParams) {
  return useQuery({
    queryKey: ESS_KEYS.leave.requests(params),
    queryFn: () => essApi.leave.requests(params),
    staleTime: 30_000,
  });
}

export function useEssLeaveRequest(id: string) {
  return useQuery({
    queryKey: ESS_KEYS.leave.detail(id),
    queryFn: () => essApi.leave.getRequest(id),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useCreateEssLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateEssLeaveRequestPayload) => essApi.leave.createRequest(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ESS_KEYS.leave.all() });
      invalidateEssHome(queryClient);
    },
  });
}

export function useSubmitEssLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => essApi.leave.submitRequest(id),
    onSuccess: (response) => {
      void queryClient.invalidateQueries({ queryKey: ESS_KEYS.leave.all() });
      void queryClient.invalidateQueries({ queryKey: ESS_KEYS.leave.detail(response.data.id) });
      invalidateEssHome(queryClient);
    },
  });
}

export function useCancelEssLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => essApi.leave.cancelRequest(id),
    onSuccess: (response) => {
      void queryClient.invalidateQueries({ queryKey: ESS_KEYS.leave.all() });
      void queryClient.invalidateQueries({ queryKey: ESS_KEYS.leave.detail(response.data.id) });
      invalidateEssHome(queryClient);
    },
  });
}

export function useEssPayslips(params?: EssListParams) {
  return useQuery({
    queryKey: ESS_KEYS.payslips.list(params),
    queryFn: () => essApi.payslips.list(params),
    staleTime: 60_000,
  });
}

export function useEssPayslip(id: string) {
  return useQuery({
    queryKey: ESS_KEYS.payslips.detail(id),
    queryFn: () => essApi.payslips.get(id),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

export function useEssRequests(params?: EssRequestsParams) {
  return useQuery({
    queryKey: ESS_KEYS.requests.list(params),
    queryFn: () => essApi.requests.list(params),
    staleTime: 30_000,
  });
}

export function useEssRequest(id: string) {
  return useQuery({
    queryKey: ESS_KEYS.requests.detail(id),
    queryFn: () => essApi.requests.get(id),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useCreateEssRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateEssRequestPayload) => essApi.requests.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ESS_KEYS.requests.all() });
      invalidateEssHome(queryClient);
    },
  });
}

export function useSubmitEssRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => essApi.requests.submit(id),
    onSuccess: (response) => {
      void queryClient.invalidateQueries({ queryKey: ESS_KEYS.requests.all() });
      void queryClient.invalidateQueries({ queryKey: ESS_KEYS.requests.detail(response.data.id) });
      invalidateEssHome(queryClient);
    },
  });
}

export function useCancelEssRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => essApi.requests.cancel(id),
    onSuccess: (response) => {
      void queryClient.invalidateQueries({ queryKey: ESS_KEYS.requests.all() });
      void queryClient.invalidateQueries({ queryKey: ESS_KEYS.requests.detail(response.data.id) });
      invalidateEssHome(queryClient);
    },
  });
}

export function useEssNotifications(params?: EssNotificationsParams) {
  return useQuery({
    queryKey: ESS_KEYS.notifications.list(params),
    queryFn: () => essApi.notifications.list(params),
    staleTime: 30_000,
  });
}

export function useEssUnreadNotifications() {
  return useQuery({
    queryKey: ESS_KEYS.notifications.unreadCount(),
    queryFn: () => essApi.notifications.unreadCount(),
    staleTime: 30_000,
  });
}

export function useMarkEssNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => essApi.notifications.markRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ESS_KEYS.notifications.all() });
      invalidateEssHome(queryClient);
    },
  });
}

export function useMarkAllEssNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => essApi.notifications.markAllRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ESS_KEYS.notifications.all() });
      invalidateEssHome(queryClient);
    },
  });
}

export function useEssPolicies() {
  return useQuery({
    queryKey: ESS_KEYS.policies(),
    queryFn: () => essApi.policies.list(),
    staleTime: 60_000,
  });
}

export function useAcknowledgeEssPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AcknowledgeEssPolicyPayload) => essApi.policies.acknowledge(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ESS_KEYS.policies() });
      void queryClient.invalidateQueries({ queryKey: ESS_KEYS.documents.all() });
      invalidateEssHome(queryClient);
    },
  });
}
