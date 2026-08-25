import type {
  AttendanceDeviceHealth,
  AttendanceDeviceHealthStatus,
} from '../types/attendance-capture.types';

/** Health states that require operator attention (aligned with DeviceHealthService outbox). */
export const CAPTURE_ATTENTION_STATUSES = [
  'DEGRADED',
  'UNHEALTHY',
  'OFFLINE',
  'SUSPENDED',
] as const satisfies readonly AttendanceDeviceHealthStatus[];

export type CaptureAttentionStatus = (typeof CAPTURE_ATTENTION_STATUSES)[number];

export interface CaptureHealthCounts {
  total: number;
  HEALTHY: number;
  DEGRADED: number;
  UNHEALTHY: number;
  OFFLINE: number;
  SUSPENDED: number;
  DECOMMISSIONED: number;
  other: number;
}

/**
 * Deterministic client-side aggregates from per-device health rows.
 * No invented analytics — counts of live `healthStatus` values only.
 */
export function countCaptureHealth(
  rows: AttendanceDeviceHealth[],
): CaptureHealthCounts {
  const counts: CaptureHealthCounts = {
    total: rows.length,
    HEALTHY: 0,
    DEGRADED: 0,
    UNHEALTHY: 0,
    OFFLINE: 0,
    SUSPENDED: 0,
    DECOMMISSIONED: 0,
    other: 0,
  };

  for (const row of rows) {
    const status = row.healthStatus;
    if (status === 'HEALTHY') counts.HEALTHY += 1;
    else if (status === 'DEGRADED') counts.DEGRADED += 1;
    else if (status === 'UNHEALTHY') counts.UNHEALTHY += 1;
    else if (status === 'OFFLINE') counts.OFFLINE += 1;
    else if (status === 'SUSPENDED') counts.SUSPENDED += 1;
    else if (status === 'DECOMMISSIONED') counts.DECOMMISSIONED += 1;
    else counts.other += 1;
  }

  return counts;
}

export function filterAttentionRequired(
  rows: AttendanceDeviceHealth[],
): AttendanceDeviceHealth[] {
  const set = new Set<string>(CAPTURE_ATTENTION_STATUSES);
  return rows.filter((row) => set.has(row.healthStatus));
}

export function shortenDeviceId(id: string): string {
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}
