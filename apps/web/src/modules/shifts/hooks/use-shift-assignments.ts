import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { shiftAssignmentsApi } from '../api/shift-assignments-api';
import { SHIFT_ASSIGNMENT_KEYS, SHIFT_KEYS } from '../constants/shift.constants';
import type {
  CreateShiftAssignmentPayload,
  ListShiftAssignmentsParams,
  UpdateShiftAssignmentPayload,
} from '../types/shift-assignment.types';

export function useShiftAssignments(params?: ListShiftAssignmentsParams) {
  return useQuery({
    queryKey: SHIFT_ASSIGNMENT_KEYS.list(params),
    queryFn: () => shiftAssignmentsApi.list(params),
    staleTime: 30_000,
  });
}

export function useShiftAssignment(
  assignmentId: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: SHIFT_ASSIGNMENT_KEYS.detail(assignmentId),
    queryFn: () => shiftAssignmentsApi.getById(assignmentId),
    enabled: options?.enabled ?? !!assignmentId,
    staleTime: 30_000,
  });
}

export function useAssignShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateShiftAssignmentPayload) =>
      shiftAssignmentsApi.assign(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: SHIFT_ASSIGNMENT_KEYS.lists(),
      });
      void queryClient.invalidateQueries({ queryKey: SHIFT_KEYS.lists() });
    },
  });
}

export function useUpdateShiftAssignment(assignmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      payload,
      ifMatch,
    }: {
      payload: UpdateShiftAssignmentPayload;
      ifMatch: string;
    }) => shiftAssignmentsApi.update(assignmentId, payload, ifMatch),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: SHIFT_ASSIGNMENT_KEYS.lists(),
      });
      void queryClient.invalidateQueries({
        queryKey: SHIFT_ASSIGNMENT_KEYS.detail(assignmentId),
      });
      void queryClient.invalidateQueries({ queryKey: SHIFT_KEYS.lists() });
    },
  });
}
