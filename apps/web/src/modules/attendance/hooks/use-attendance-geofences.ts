'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { attendanceCaptureApi } from '../api/attendance-capture-api';
import { attendanceCaptureKeys } from '../constants/attendance-capture.constants';
import type {
  CreateAttendanceGeofencePayload,
  GeofenceCheckPayload,
  ListAttendanceGeofencesParams,
  UpdateAttendanceGeofencePayload,
} from '../types/attendance-capture.types';

export function useAttendanceGeofences(params?: ListAttendanceGeofencesParams) {
  return useQuery({
    queryKey: attendanceCaptureKeys.geofences(params),
    queryFn: () => attendanceCaptureApi.geofences.list(params),
    staleTime: 60_000,
  });
}

export function useAttendanceGeofence(geofenceId: string | undefined) {
  return useQuery({
    queryKey: attendanceCaptureKeys.geofence(geofenceId ?? ''),
    queryFn: () => attendanceCaptureApi.geofences.getById(geofenceId!),
    enabled: !!geofenceId,
    staleTime: 60_000,
  });
}

export function useCreateAttendanceGeofence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAttendanceGeofencePayload) =>
      attendanceCaptureApi.geofences.create(payload),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: [...attendanceCaptureKeys.all, 'geofences'],
      });
    },
  });
}

export function useUpdateAttendanceGeofence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      geofenceId,
      payload,
      ifMatch,
    }: {
      geofenceId: string;
      payload: UpdateAttendanceGeofencePayload;
      ifMatch?: string;
    }) => attendanceCaptureApi.geofences.update(geofenceId, payload, ifMatch),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({
        queryKey: attendanceCaptureKeys.geofence(variables.geofenceId),
      });
      void qc.invalidateQueries({
        queryKey: [...attendanceCaptureKeys.all, 'geofences'],
      });
    },
  });
}

export function useDeleteAttendanceGeofence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      geofenceId,
      ifMatch,
    }: {
      geofenceId: string;
      ifMatch?: string;
    }) => attendanceCaptureApi.geofences.delete(geofenceId, ifMatch),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({
        queryKey: attendanceCaptureKeys.geofence(variables.geofenceId),
      });
      void qc.invalidateQueries({
        queryKey: [...attendanceCaptureKeys.all, 'geofences'],
      });
    },
  });
}

export function useCheckAttendanceGeofence() {
  return useMutation({
    mutationFn: ({
      geofenceId,
      payload,
    }: {
      geofenceId: string;
      payload: GeofenceCheckPayload;
    }) => attendanceCaptureApi.geofences.check(geofenceId, payload),
  });
}
