import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { attendancePolicyApi } from '../api/attendance-policy-api';
import type { ListAttendancePoliciesParams } from '../types/attendance-policy.types';

export const ATTENDANCE_POLICY_KEYS = {
  all: ['attendance-policies'] as const,
  lists: () => [...ATTENDANCE_POLICY_KEYS.all, 'list'] as const,
  list: (params?: ListAttendancePoliciesParams) =>
    [...ATTENDANCE_POLICY_KEYS.lists(), params] as const,
  details: () => [...ATTENDANCE_POLICY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...ATTENDANCE_POLICY_KEYS.details(), id] as const,
};

export function useAttendancePolicies(params?: ListAttendancePoliciesParams) {
  return useQuery({
    queryKey: ATTENDANCE_POLICY_KEYS.list(params),
    queryFn: () => attendancePolicyApi.list(params),
    staleTime: 60_000,
  });
}

export function useAttendancePolicy(id: string) {
  return useQuery({
    queryKey: ATTENDANCE_POLICY_KEYS.detail(id),
    queryFn: () => attendancePolicyApi.getById(id),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCreateAttendancePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: attendancePolicyApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ATTENDANCE_POLICY_KEYS.lists() });
    },
  });
}

export function useUpdateAttendancePolicy(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof attendancePolicyApi.update>[1]) =>
      attendancePolicyApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ATTENDANCE_POLICY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: ATTENDANCE_POLICY_KEYS.detail(id) });
    },
  });
}

export function useDeleteAttendancePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: attendancePolicyApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ATTENDANCE_POLICY_KEYS.lists() });
    },
  });
}
