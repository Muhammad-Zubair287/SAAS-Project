'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { attendanceCaptureApi } from '../api/attendance-capture-api';
import { attendanceCaptureKeys } from '../constants/attendance-capture.constants';
import type {
  DeviceLifecycleReasonPayload,
  ListOfflineSessionsParams,
} from '../types/attendance-capture.types';

export function useOfflineSessions(
  params?: ListOfflineSessionsParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: attendanceCaptureKeys.offlineSessions(params),
    queryFn: () => attendanceCaptureApi.offlineSessions.list(params),
    staleTime: 30_000,
    enabled: options?.enabled ?? true,
  });
}

export function useOfflineSession(
  sessionId: string | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: attendanceCaptureKeys.offlineSession(sessionId ?? ''),
    queryFn: () => attendanceCaptureApi.offlineSessions.getById(sessionId!),
    enabled: (options?.enabled ?? true) && !!sessionId,
    staleTime: 15_000,
  });
}

export function usePendingOfflineEvents(
  sessionId: string | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: attendanceCaptureKeys.offlinePending(sessionId ?? ''),
    queryFn: () =>
      attendanceCaptureApi.offlineSessions.getPendingEvents(sessionId!),
    enabled: (options?.enabled ?? true) && !!sessionId,
    staleTime: 10_000,
  });
}

export function useReplayOfflineSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      attendanceCaptureApi.offlineSessions.replay(sessionId),
    onSuccess: (_data, sessionId) => {
      void qc.invalidateQueries({
        queryKey: attendanceCaptureKeys.offlineSession(sessionId),
      });
      void qc.invalidateQueries({
        queryKey: attendanceCaptureKeys.offlinePending(sessionId),
      });
      void qc.invalidateQueries({
        queryKey: [...attendanceCaptureKeys.all, 'offline-sessions'],
      });
    },
  });
}

export function useCloseOfflineSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      payload,
    }: {
      sessionId: string;
      payload: DeviceLifecycleReasonPayload;
    }) => attendanceCaptureApi.offlineSessions.close(sessionId, payload),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({
        queryKey: attendanceCaptureKeys.offlineSession(variables.sessionId),
      });
      void qc.invalidateQueries({
        queryKey: attendanceCaptureKeys.offlinePending(variables.sessionId),
      });
      void qc.invalidateQueries({
        queryKey: [...attendanceCaptureKeys.all, 'offline-sessions'],
      });
    },
  });
}
