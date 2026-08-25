import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rostersApi } from '../api/rosters-api';
import { ROSTER_KEYS } from '../constants/shift.constants';
import type {
  CreateRosterAssignmentPayload,
  ListRostersParams,
  PublishRosterPayload,
  UpdateRosterAssignmentPayload,
} from '../types/roster.types';

export function useRosters(params: ListRostersParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ROSTER_KEYS.list(params),
    queryFn: () => rostersApi.list(params),
    enabled: options?.enabled ?? true,
    staleTime: 15_000,
  });
}

export function useCreateRosterAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRosterAssignmentPayload) =>
      rostersApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ROSTER_KEYS.lists() });
    },
  });
}

export function useUpdateRosterAssignment(assignmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      payload,
      ifMatch,
    }: {
      payload: UpdateRosterAssignmentPayload;
      ifMatch: string;
    }) => rostersApi.update(assignmentId, payload, ifMatch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ROSTER_KEYS.lists() });
      void queryClient.invalidateQueries({
        queryKey: ROSTER_KEYS.detail(assignmentId),
      });
    },
  });
}

export function usePublishRoster() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PublishRosterPayload) => rostersApi.publish(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ROSTER_KEYS.lists() });
    },
  });
}
