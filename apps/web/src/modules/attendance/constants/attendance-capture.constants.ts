/**
 * Attendance Capture UI permission constants (human/admin operator).
 * Device-authenticated-only operations (token rotate/revoke/inspect) are excluded.
 */
export const ATTENDANCE_CAPTURE_PERMISSIONS = {
  DEVICE_READ: 'attendance.device.read',
  DEVICE_MANAGE: 'attendance.device.manage',
  DEVICE_TOKEN_ISSUE: 'attendance.device-token.issue',
  DEVICE_HEARTBEAT_READ: 'attendance.device-heartbeat.read',
  DEVICE_EVENT_REVALIDATE: 'attendance.device-event.revalidate',
  OFFLINE_READ: 'attendance.offline.read',
  OFFLINE_MANAGE: 'attendance.offline.manage',
  GEOFENCE_READ: 'attendance.geofence.read',
  GEOFENCE_MANAGE: 'attendance.geofence.manage',
} as const;

export type AttendanceCapturePermission =
  (typeof ATTENDANCE_CAPTURE_PERMISSIONS)[keyof typeof ATTENDANCE_CAPTURE_PERMISSIONS];

export const ATTENDANCE_DEVICE_STATUSES = [
  'PENDING',
  'ACTIVE',
  'SUSPENDED',
  'DECOMMISSIONED',
] as const;

/**
 * Device health statuses returned by GET /attendance/devices/health
 * (DeviceHealthService.determineStatus). Do not invent additional values.
 */
export const ATTENDANCE_DEVICE_HEALTH_STATUSES = [
  'HEALTHY',
  'DEGRADED',
  'UNHEALTHY',
  'OFFLINE',
  'SUSPENDED',
  'DECOMMISSIONED',
] as const;

/**
 * Capture-session statuses written by OfflineQueueService.
 * String column in Prisma — keep aligned with service transitions only.
 */
export const OFFLINE_SESSION_STATUSES = [
  'ACTIVE',
  'CLOSED',
  'COMPLETED',
] as const;

/** Centralized TanStack Query keys for Attendance Capture. */
export const attendanceCaptureKeys = {
  all: ['attendance-capture'] as const,

  devices: () => [...attendanceCaptureKeys.all, 'devices'] as const,
  deviceList: (params?: unknown) =>
    [...attendanceCaptureKeys.devices(), 'list', params] as const,
  device: (id: string) =>
    [...attendanceCaptureKeys.devices(), 'detail', id] as const,

  deviceHealth: () =>
    [...attendanceCaptureKeys.all, 'device-health'] as const,

  heartbeats: (deviceId: string, params?: unknown) =>
    [...attendanceCaptureKeys.all, 'heartbeats', deviceId, params] as const,
  heartbeatLatest: (deviceId: string) =>
    [...attendanceCaptureKeys.all, 'heartbeat-latest', deviceId] as const,

  geofences: (params?: unknown) =>
    [...attendanceCaptureKeys.all, 'geofences', params] as const,
  geofence: (id: string) =>
    [...attendanceCaptureKeys.all, 'geofence', id] as const,

  offlineSessions: (params?: unknown) =>
    [...attendanceCaptureKeys.all, 'offline-sessions', params] as const,
  offlineSession: (id: string) =>
    [...attendanceCaptureKeys.all, 'offline-session', id] as const,
  offlinePending: (id: string) =>
    [...attendanceCaptureKeys.all, 'offline-pending', id] as const,
} as const;
