'use client';

import { useQuery } from '@tanstack/react-query';
import { attendanceCaptureApi } from '../api/attendance-capture-api';
import { attendanceCaptureKeys } from '../constants/attendance-capture.constants';

/**
 * Tenant device/capture health summary (API-backed only).
 * No invented analytics — maps GET /attendance/devices/health.
 */
export function useAttendanceDeviceHealth(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: attendanceCaptureKeys.deviceHealth(),
    queryFn: () => attendanceCaptureApi.devices.getHealthSummary(),
    staleTime: 30_000,
    enabled: options?.enabled ?? true,
  });
}

/** Alias matching the capture-dashboard health summary naming. */
export function useAttendanceCaptureHealth() {
  return useAttendanceDeviceHealth();
}
