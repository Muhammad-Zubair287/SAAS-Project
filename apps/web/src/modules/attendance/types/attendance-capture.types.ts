/**
 * Attendance Capture frontend types — derived from live API DTOs only.
 * Secrets (tokenHash, sessionTokenHash, historical raw tokens) are excluded.
 */

export type AttendanceDeviceStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'DECOMMISSIONED';

/**
 * Live API health statuses from DeviceHealthService.determineStatus.
 * Keep in sync with ATTENDANCE_DEVICE_HEALTH_STATUSES.
 */
export type AttendanceDeviceHealthStatus =
  | 'HEALTHY'
  | 'DEGRADED'
  | 'UNHEALTHY'
  | 'OFFLINE'
  | 'SUSPENDED'
  | 'DECOMMISSIONED';

export type AttendanceDeviceSortBy = 'name' | 'createdAt' | 'lastSeenAt';

export interface AttendanceDevice {
  id: string;
  name: string;
  deviceType: string;
  serialNumber: string;
  status: AttendanceDeviceStatus | string;
  vendor?: string | null;
  model?: string | null;
  timezone?: string | null;
  lastSeenAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListAttendanceDevicesParams {
  page?: number;
  pageSize?: number;
  sortOrder?: 'asc' | 'desc';
  sortBy?: AttendanceDeviceSortBy;
  status?: AttendanceDeviceStatus;
  search?: string;
}

export interface RegisterAttendanceDevicePayload {
  name: string;
  deviceType: string;
  serialNumber: string;
  vendor?: string;
  model?: string;
  timezone?: string;
  metadata?: Record<string, unknown>;
}

export interface ProvisionAttendanceDevicePayload {
  deviceFingerprint: string;
  publicKeyFingerprint: string;
  ipWhitelist?: string[];
}

export interface DeviceLifecycleReasonPayload {
  reason: string;
}

export interface ReplaceAttendanceDevicePayload {
  newSerialNumber: string;
  newDeviceFingerprint?: string;
  newPublicKeyFingerprint?: string;
}

export interface AttendanceDeviceTokenIssueResponse {
  token: string;
  tokenType: string;
  expiresIn: number;
  expiresAt: string;
}

export interface AttendanceDeviceHealth {
  deviceId: string;
  lastSeenAt?: string;
  healthStatus: AttendanceDeviceHealthStatus | string;
  averageCpu?: number;
  averageMemory?: number;
  averageDisk?: number;
  outstandingQueue?: number;
}

/** Tenant-wide capture/device health summary from GET /attendance/devices/health */
export type CaptureHealthSummary = AttendanceDeviceHealth[];

export interface AttendanceDeviceHeartbeat {
  id: string;
  tenantId: string;
  deviceId: string;
  occurredAt: string;
  ipAddress?: string | null;
  cpu?: number | null;
  memory?: number | null;
  disk?: number | null;
  queueLength?: number | null;
  firmwareVersion?: string | null;
  clockOffsetMs?: number | null;
  lastSyncAt?: string | null;
  metrics?: Record<string, unknown> | null;
  createdAt: string;
}

export interface HeartbeatHistoryParams {
  sinceHours?: number;
}

/** Circle-only geofence (Batch 3). Polygon is out of scope. */
export interface AttendanceGeofence {
  id: string;
  tenantId: string;
  name: string;
  legalEntityId?: string | null;
  branchId?: string | null;
  shape: 'CIRCLE' | string;
  centerLat?: number | null;
  centerLng?: number | null;
  radiusMeters?: number | null;
  activeFrom?: string | null;
  activeTo?: string | null;
  metadata?: Record<string, unknown> | null;
  /** Optimistic concurrency token — send as If-Match on PATCH/DELETE */
  rowVersion: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListAttendanceGeofencesParams {
  legalEntityId?: string;
  branchId?: string;
}

export interface CreateAttendanceGeofencePayload {
  name: string;
  legalEntityId?: string;
  branchId?: string;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  activeFrom?: string;
  activeTo?: string;
}

export interface UpdateAttendanceGeofencePayload {
  name?: string;
  centerLat?: number;
  centerLng?: number;
  radiusMeters?: number;
  activeFrom?: string;
  activeTo?: string;
}

export interface GeofenceCheckPayload {
  latitude: number;
  longitude: number;
  at?: string;
}

export interface GeofenceCheckResponse {
  isWithin: boolean;
  distance?: number;
  exceedBy?: number;
}

export interface OfflineSession {
  id: string;
  deviceId?: string | null;
  mobileDeviceId?: string | null;
  startedAt: string;
  endedAt?: string | null;
  clientTimezone?: string | null;
  status?: string | null;
}

export interface ListOfflineSessionsParams {
  page?: number;
  pageSize?: number;
  sortOrder?: 'asc' | 'desc';
  status?: string;
  deviceId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface OfflinePendingEvent {
  id: string;
  tenantId: string;
  sessionId?: string | null;
  source: string;
  /** BigInt-safe string from OfflinePendingEventResponseDto */
  sequenceNumber: string;
  payload: Record<string, unknown>;
  /** Client-supplied integrity hash of the event payload (not a credential) */
  payloadHash: string;
  uploadedAt: string;
  replayedAt?: string | null;
  status: string;
  attempts: number;
}

export interface OfflineReplayResponse {
  sessionId: string;
  processedCount: number;
  successCount: number;
  errorCount: number;
  deduplicatedCount: number;
}

export interface RevalidatedDeviceEvent {
  id: string;
  tenantId: string;
  captureSessionId?: string | null;
  source: string;
  sourceEventId: string;
  occurredAt: string;
  receivedAt: string;
  employeeId?: string | null;
  deviceId?: string | null;
  mobileDeviceId?: string | null;
  eventType: string;
  geoLat?: number | null;
  geoLng?: number | null;
  geoAccuracyM?: number | null;
  validationStatus: string;
  validationReason?: string | null;
}
