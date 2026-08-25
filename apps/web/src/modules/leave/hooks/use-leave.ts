'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { maybeToastSuccess, toastApiError } from '../../../lib/api/toast-api';
import { leaveApi } from '../api/leave-api';
import type {
  AdjustLeaveBalancePayload,
  CreateLeaveTypePayload,
  ListLeaveRequestsParams,
  UpdateLeaveTypePayload,
} from '../types/leave.types';

export const LEAVE_KEYS = {
  all: ['leave'] as const,
  summary: () => [...LEAVE_KEYS.all, 'summary'] as const,
  requests: (params?: ListLeaveRequestsParams) =>
    [...LEAVE_KEYS.all, 'requests', params] as const,
  request: (id: string) => [...LEAVE_KEYS.all, 'request', id] as const,
  types: () => [...LEAVE_KEYS.all, 'types'] as const,
};

export function useLeaveSummary() {
  return useQuery({
    queryKey: LEAVE_KEYS.summary(),
    queryFn: () => leaveApi.summary(),
  });
}

export function useLeaveRequests(params?: ListLeaveRequestsParams) {
  return useQuery({
    queryKey: LEAVE_KEYS.requests(params),
    queryFn: () => leaveApi.requests.list(params),
  });
}

export function useLeaveRequest(id: string | undefined) {
  return useQuery({
    queryKey: LEAVE_KEYS.request(id ?? ''),
    queryFn: () => leaveApi.requests.getById(id!),
    enabled: !!id,
  });
}

export function useLeaveTypes() {
  return useQuery({
    queryKey: LEAVE_KEYS.types(),
    queryFn: () => leaveApi.types.list(),
  });
}

export function useCreateLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateLeaveTypePayload) => leaveApi.types.create(payload),
    onSuccess: (res) => {
      maybeToastSuccess(res);
      void qc.invalidateQueries({ queryKey: LEAVE_KEYS.all });
    },
    onError: (err) => toastApiError(err, 'Request failed'),
  });
}

export function useUpdateLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateLeaveTypePayload }) =>
      leaveApi.types.update(id, payload),
    onSuccess: (res) => {
      maybeToastSuccess(res);
      void qc.invalidateQueries({ queryKey: LEAVE_KEYS.all });
    },
    onError: (err) => toastApiError(err, 'Request failed'),
  });
}

export function useApproveLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leaveApi.requests.approve(id),
    onSuccess: (res) => {
      maybeToastSuccess(res);
      void qc.invalidateQueries({ queryKey: LEAVE_KEYS.all });
    },
    onError: (err) => toastApiError(err, 'Request failed'),
  });
}

export function useRejectLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leaveApi.requests.reject(id),
    onSuccess: (res) => {
      maybeToastSuccess(res);
      void qc.invalidateQueries({ queryKey: LEAVE_KEYS.all });
    },
    onError: (err) => toastApiError(err, 'Request failed'),
  });
}

export function useAdjustLeaveBalance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdjustLeaveBalancePayload) => leaveApi.balances.adjust(payload),
    onSuccess: (res) => {
      maybeToastSuccess(res);
      void qc.invalidateQueries({ queryKey: LEAVE_KEYS.all });
    },
    onError: (err) => toastApiError(err, 'Request failed'),
  });
}
