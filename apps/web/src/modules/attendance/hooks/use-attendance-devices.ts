'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { attendanceCaptureApi } from '../api/attendance-capture-api';
import { attendanceCaptureKeys } from '../constants/attendance-capture.constants';
import type {
  DeviceLifecycleReasonPayload,
  HeartbeatHistoryParams,
  ListAttendanceDevicesParams,
  ProvisionAttendanceDevicePayload,
  RegisterAttendanceDevicePayload,
  ReplaceAttendanceDevicePayload,
} from '../types/attendance-capture.types';

export function useAttendanceDevices(
  params?: ListAttendanceDevicesParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: attendanceCaptureKeys.deviceList(params),
    queryFn: () => attendanceCaptureApi.devices.list(params),
    staleTime: 30_000,
    enabled: options?.enabled ?? true,
  });
}

export function useAttendanceDevice(deviceId: string | undefined) {
  return useQuery({
    queryKey: attendanceCaptureKeys.device(deviceId ?? ''),
    queryFn: () => attendanceCaptureApi.devices.getById(deviceId!),
    enabled: !!deviceId,
    staleTime: 30_000,
  });
}

export function useRegisterAttendanceDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: RegisterAttendanceDevicePayload) =>
      attendanceCaptureApi.devices.register(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: attendanceCaptureKeys.devices() });
      void qc.invalidateQueries({ queryKey: attendanceCaptureKeys.deviceHealth() });
    },
  });
}

export function useProvisionAttendanceDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      deviceId,
      payload,
    }: {
      deviceId: string;
      payload: ProvisionAttendanceDevicePayload;
    }) => attendanceCaptureApi.devices.provision(deviceId, payload),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({
        queryKey: attendanceCaptureKeys.device(variables.deviceId),
      });
      void qc.invalidateQueries({ queryKey: attendanceCaptureKeys.devices() });
      void qc.invalidateQueries({ queryKey: attendanceCaptureKeys.deviceHealth() });
    },
  });
}

export function useActivateAttendanceDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deviceId: string) =>
      attendanceCaptureApi.devices.activate(deviceId),
    onSuccess: (_data, deviceId) => {
      void qc.invalidateQueries({ queryKey: attendanceCaptureKeys.device(deviceId) });
      void qc.invalidateQueries({ queryKey: attendanceCaptureKeys.devices() });
      void qc.invalidateQueries({ queryKey: attendanceCaptureKeys.deviceHealth() });
    },
  });
}

export function useSuspendAttendanceDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      deviceId,
      payload,
    }: {
      deviceId: string;
      payload: DeviceLifecycleReasonPayload;
    }) => attendanceCaptureApi.devices.suspend(deviceId, payload),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({
        queryKey: attendanceCaptureKeys.device(variables.deviceId),
      });
      void qc.invalidateQueries({ queryKey: attendanceCaptureKeys.devices() });
      void qc.invalidateQueries({ queryKey: attendanceCaptureKeys.deviceHealth() });
    },
  });
}

export function useDecommissionAttendanceDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      deviceId,
      payload,
    }: {
      deviceId: string;
      payload: DeviceLifecycleReasonPayload;
    }) => attendanceCaptureApi.devices.decommission(deviceId, payload),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({
        queryKey: attendanceCaptureKeys.device(variables.deviceId),
      });
      void qc.invalidateQueries({ queryKey: attendanceCaptureKeys.devices() });
      void qc.invalidateQueries({ queryKey: attendanceCaptureKeys.deviceHealth() });
    },
  });
}

export function useReplaceAttendanceDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      deviceId,
      payload,
    }: {
      deviceId: string;
      payload: ReplaceAttendanceDevicePayload;
    }) => attendanceCaptureApi.devices.replace(deviceId, payload),
    onSuccess: (data, variables) => {
      void qc.invalidateQueries({
        queryKey: attendanceCaptureKeys.device(variables.deviceId),
      });
      const newDeviceId = data?.data?.id;
      if (newDeviceId) {
        void qc.invalidateQueries({
          queryKey: attendanceCaptureKeys.device(newDeviceId),
        });
      }
      void qc.invalidateQueries({ queryKey: attendanceCaptureKeys.devices() });
      void qc.invalidateQueries({ queryKey: attendanceCaptureKeys.deviceHealth() });
    },
  });
}

/**
 * Issues a one-time device token.
 * The mutation result is returned to the caller only — never written into Query cache.
 */
export function useIssueAttendanceDeviceToken() {
  return useMutation({
    mutationFn: (deviceId: string) =>
      attendanceCaptureApi.devices.issueToken(deviceId),
    // Intentionally no onSuccess cache write / setQueryData for the raw token.
  });
}

export function useAttendanceHeartbeats(
  deviceId: string | undefined,
  params?: HeartbeatHistoryParams,
) {
  return useQuery({
    queryKey: attendanceCaptureKeys.heartbeats(deviceId ?? '', params),
    queryFn: () =>
      attendanceCaptureApi.devices.getHeartbeatHistory(deviceId!, params),
    enabled: !!deviceId,
    staleTime: 15_000,
  });
}

export function useAttendanceLatestHeartbeat(deviceId: string | undefined) {
  return useQuery({
    queryKey: attendanceCaptureKeys.heartbeatLatest(deviceId ?? ''),
    queryFn: () => attendanceCaptureApi.devices.getLatestHeartbeat(deviceId!),
    enabled: !!deviceId,
    staleTime: 15_000,
  });
}

export function useRevalidateAttendanceDeviceEvent() {
  return useMutation({
    mutationFn: (deviceEventId: string) =>
      attendanceCaptureApi.deviceEvents.revalidate(deviceEventId),
  });
}
