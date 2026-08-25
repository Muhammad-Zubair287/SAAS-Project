/** Domain event type strings — aligned with outbox publishers in the Attendance module. */
export const ATTENDANCE_EVENTS = {
  ATTENDANCE_EVENT_RECEIVED: 'AttendanceEventReceived.v1',
  CAPTURE_VALIDATION_FAILED: 'CaptureValidationFailed.v1',
  OFFLINE_SESSION_CREATED: 'OfflineSessionCreated.v1',
  OFFLINE_REPLAY_REQUESTED: 'OfflineReplayRequested.v1',
  OFFLINE_REPLAY_COMPLETED: 'OfflineReplayCompleted.v1',
  ATTENDANCE_DEVICE_HEARTBEAT: 'AttendanceDeviceHeartbeat.v1',
  DEVICE_HEALTH_CHANGED: 'DeviceHealthChanged.v1',
  DEVICE_HEALTH_SCAN_REQUESTED: 'DeviceHealthScanRequested.v1',
  DUPLICATE_DETECTION_REQUESTED: 'DuplicateDetectionRequested.v1',
  ATTENDANCE_EVENT_INGESTED: 'AttendanceEventIngested.v1',
  ATTENDANCE_RECORD_CALCULATED: 'AttendanceRecordCalculated.v1',
  ATTENDANCE_EXCEPTION_RAISED: 'AttendanceExceptionRaised.v1',
} as const;

export type AttendanceEventType = (typeof ATTENDANCE_EVENTS)[keyof typeof ATTENDANCE_EVENTS];

export const ATTENDANCE_EVENT_PREFIXES = ['Attendance', 'Capture', 'Offline', 'Device'] as const;

export function isAttendanceDomainEvent(eventType: string): boolean {
  return ATTENDANCE_EVENT_PREFIXES.some((prefix) => eventType.startsWith(prefix));
}
