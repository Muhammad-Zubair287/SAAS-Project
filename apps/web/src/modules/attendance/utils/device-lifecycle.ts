import type { AttendanceDeviceStatus } from '../types/attendance-capture.types';

/** UI-level lifecycle affordances derived from backend transition rules. */
export type DeviceLifecycleUiAction =
  | 'provision'
  | 'activate'
  | 'suspend'
  | 'decommission'
  | 'replace'
  | 'issueToken';

/**
 * Hide impossible actions for UX. Backend remains authoritative.
 * Rules mirror device-registry.service / device-auth.service.
 */
export function getAvailableDeviceActions(
  status: string,
): DeviceLifecycleUiAction[] {
  switch (status as AttendanceDeviceStatus) {
    case 'PENDING':
      return ['provision', 'activate'];
    case 'ACTIVE':
      return ['suspend', 'decommission', 'replace', 'issueToken'];
    case 'SUSPENDED':
      return ['activate', 'decommission', 'replace'];
    case 'DECOMMISSIONED':
    default:
      return [];
  }
}

export const DEVICE_FIELD_LIMITS = {
  name: 255,
  deviceType: 64,
  serialNumber: 128,
  vendor: 128,
  model: 128,
  timezone: 50,
  fingerprint: 128,
  ipWhitelistEntry: 64,
  reason: 500,
} as const;

export const HEARTBEAT_SINCE_HOURS = [1, 6, 24, 72, 168] as const;
