'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { attendanceApi } from '../api/attendance-api';
import type {
  CreateAttendanceEventPayload,
  CreateManualAttendanceRecordPayload,
  AttendancePeriodLockPayload,
  AttendancePeriodUnlockPayload,
  ListAttendanceParams,
} from '../types/attendance.types';

export const ATTENDANCE_KEYS = {
  all:        ['attendance'] as const,
  events:     (params?: ListAttendanceParams) => [...ATTENDANCE_KEYS.all, 'events', params] as const,
  event:      (id: string) => [...ATTENDANCE_KEYS.all, 'event', id] as const,
  records:    (params?: ListAttendanceParams) => [...ATTENDANCE_KEYS.all, 'records', params] as const,
  record:     (id: string) => [...ATTENDANCE_KEYS.all, 'record', id] as const,
  empRecords: (empId: string, params?: ListAttendanceParams) =>
    [...ATTENDANCE_KEYS.all, 'empRecords', empId, params] as const,
  exceptions: (params?: ListAttendanceParams) => [...ATTENDANCE_KEYS.all, 'exceptions', params] as const,
  exception:  (id: string) => [...ATTENDANCE_KEYS.all, 'exception', id] as const,
  periods: () => [...ATTENDANCE_KEYS.all, 'periods'] as const,
};

// ─── Attendance Events ────────────────────────────────────────────────────────

export function useAttendanceEvents(params?: ListAttendanceParams) {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.events(params),
    queryFn:  () => attendanceApi.events.list(params),
  });
}

export function useAttendanceEvent(id: string | undefined) {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.event(id ?? ''),
    queryFn:  () => attendanceApi.events.getById(id!),
    enabled:  !!id,
  });
}

export function useIngestAttendanceEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAttendanceEventPayload) =>
      attendanceApi.events.ingest(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ATTENDANCE_KEYS.all });
    },
  });
}

// ─── Attendance Records ───────────────────────────────────────────────────────

export function useAttendanceRecords(params?: ListAttendanceParams) {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.records(params),
    queryFn:  () => attendanceApi.records.list(params),
    staleTime: 60_000,
  });
}

export function useAttendanceRecord(id: string | undefined) {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.record(id ?? ''),
    queryFn:  () => attendanceApi.records.getById(id!),
    enabled:  !!id,
  });
}

export function useEmployeeAttendanceRecords(
  employeeId: string | undefined,
  params?: ListAttendanceParams,
) {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.empRecords(employeeId ?? '', params),
    queryFn:  () => attendanceApi.records.getByEmployee(employeeId!, params),
    enabled:  !!employeeId,
  });
}

export function useCreateManualAttendanceRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateManualAttendanceRecordPayload) =>
      attendanceApi.records.createManual(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ATTENDANCE_KEYS.all });
    },
  });
}

export function useRecalculateAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { employeeId: string; dateFrom: string; dateTo: string }) =>
      attendanceApi.records.recalculate(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ATTENDANCE_KEYS.all });
    },
  });
}

// ─── Attendance Exceptions ────────────────────────────────────────────────────

export function useAttendanceExceptions(params?: ListAttendanceParams) {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.exceptions(params),
    queryFn:  () => attendanceApi.exceptions.list(params),
  });
}

export function useAttendanceException(id: string | undefined) {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.exception(id ?? ''),
    queryFn:  () => attendanceApi.exceptions.getById(id!),
    enabled:  !!id,
  });
}

export function useResolveAttendanceException() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { resolutionNote?: string } }) =>
      attendanceApi.exceptions.resolve(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ATTENDANCE_KEYS.exceptions() });
    },
  });
}

export function useAttendancePeriods() {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.periods(),
    queryFn: () => attendanceApi.periods.list(),
    staleTime: 60_000,
  });
}

export function useLockAttendancePeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AttendancePeriodLockPayload) => attendanceApi.periods.lock(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ATTENDANCE_KEYS.periods() });
    },
  });
}

export function useUnlockAttendancePeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AttendancePeriodUnlockPayload) => attendanceApi.periods.unlock(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ATTENDANCE_KEYS.periods() });
    },
  });
}
