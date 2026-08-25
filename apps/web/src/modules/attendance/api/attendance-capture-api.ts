import { apiClient } from '../../../lib/api/client';
import type { ApiSuccessResponse } from '../../../lib/api/types';
import type {
  AttendanceDevice,
  AttendanceDeviceHealth,
  AttendanceDeviceHeartbeat,
  AttendanceDeviceTokenIssueResponse,
  AttendanceGeofence,
  CreateAttendanceGeofencePayload,
  DeviceLifecycleReasonPayload,
  GeofenceCheckPayload,
  GeofenceCheckResponse,
  HeartbeatHistoryParams,
  ListAttendanceDevicesParams,
  ListAttendanceGeofencesParams,
  ListOfflineSessionsParams,
  OfflinePendingEvent,
  OfflineReplayResponse,
  OfflineSession,
  ProvisionAttendanceDevicePayload,
  RegisterAttendanceDevicePayload,
  ReplaceAttendanceDevicePayload,
  RevalidatedDeviceEvent,
  UpdateAttendanceGeofencePayload,
} from '../types/attendance-capture.types';

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  timestamp: string;
}

const DEVICES_BASE = '/attendance/devices';
const GEOFENCES_BASE = '/attendance/geofences';
const OFFLINE_BASE = '/attendance/offline-sessions';
const DEVICE_EVENTS_BASE = '/attendance/device-events';

function ifMatchHeaders(ifMatch?: string): Record<string, string> {
  return ifMatch ? { 'if-match': ifMatch } : {};
}

/**
 * Attendance Capture API — operator/admin authenticated endpoints only.
 * Uses shared apiClient (Authorization, refresh, Correlation-ID, Idempotency-Key).
 * Envelope unwrapping follows attendance-api.ts (NOT attendance-policy-api.ts).
 */
export const attendanceCaptureApi = {
  devices: {
    list: (params?: ListAttendanceDevicesParams) =>
      apiClient
        .get<PaginatedResponse<AttendanceDevice>>(DEVICES_BASE, { params })
        .then((r) => r.data),

    getById: (deviceId: string) =>
      apiClient
        .get<ApiSuccessResponse<AttendanceDevice>>(`${DEVICES_BASE}/${deviceId}`)
        .then((r) => r.data),

    register: (payload: RegisterAttendanceDevicePayload) =>
      apiClient
        .post<ApiSuccessResponse<AttendanceDevice>>(DEVICES_BASE, payload)
        .then((r) => r.data),

    provision: (deviceId: string, payload: ProvisionAttendanceDevicePayload) =>
      apiClient
        .post<ApiSuccessResponse<AttendanceDevice>>(
          `${DEVICES_BASE}/${deviceId}/provision`,
          payload,
        )
        .then((r) => r.data),

    activate: (deviceId: string) =>
      apiClient
        .post<ApiSuccessResponse<AttendanceDevice>>(
          `${DEVICES_BASE}/${deviceId}/activate`,
        )
        .then((r) => r.data),

    suspend: (deviceId: string, payload: DeviceLifecycleReasonPayload) =>
      apiClient
        .post<ApiSuccessResponse<AttendanceDevice>>(
          `${DEVICES_BASE}/${deviceId}/suspend`,
          payload,
        )
        .then((r) => r.data),

    decommission: (deviceId: string, payload: DeviceLifecycleReasonPayload) =>
      apiClient
        .post<ApiSuccessResponse<AttendanceDevice>>(
          `${DEVICES_BASE}/${deviceId}/decommission`,
          payload,
        )
        .then((r) => r.data),

    replace: (deviceId: string, payload: ReplaceAttendanceDevicePayload) =>
      apiClient
        .post<ApiSuccessResponse<AttendanceDevice>>(
          `${DEVICES_BASE}/${deviceId}/replace`,
          payload,
        )
        .then((r) => r.data),

    /**
     * Issues a one-time raw device token.
     * Callers must keep the token in ephemeral component state only —
     * never cache via TanStack Query / localStorage / sessionStorage.
     */
    issueToken: (deviceId: string) =>
      apiClient
        .post<ApiSuccessResponse<AttendanceDeviceTokenIssueResponse>>(
          `${DEVICES_BASE}/${deviceId}/tokens`,
        )
        .then((r) => r.data),

    getHealthSummary: () =>
      apiClient
        .get<ApiSuccessResponse<AttendanceDeviceHealth[]>>(`${DEVICES_BASE}/health`)
        .then((r) => r.data),

    getLatestHeartbeat: (deviceId: string) =>
      apiClient
        .get<ApiSuccessResponse<AttendanceDeviceHeartbeat | null>>(
          `${DEVICES_BASE}/${deviceId}/heartbeats/latest`,
        )
        .then((r) => r.data),

    getHeartbeatHistory: (deviceId: string, params?: HeartbeatHistoryParams) =>
      apiClient
        .get<ApiSuccessResponse<AttendanceDeviceHeartbeat[]>>(
          `${DEVICES_BASE}/${deviceId}/heartbeats`,
          { params },
        )
        .then((r) => r.data),
  },

  deviceEvents: {
    revalidate: (deviceEventId: string) =>
      apiClient
        .post<ApiSuccessResponse<RevalidatedDeviceEvent>>(
          `${DEVICE_EVENTS_BASE}/${deviceEventId}/revalidate`,
        )
        .then((r) => r.data),
  },

  geofences: {
    list: (params?: ListAttendanceGeofencesParams) =>
      apiClient
        .get<ApiSuccessResponse<AttendanceGeofence[]>>(GEOFENCES_BASE, { params })
        .then((r) => r.data),

    getById: (geofenceId: string) =>
      apiClient
        .get<ApiSuccessResponse<AttendanceGeofence>>(
          `${GEOFENCES_BASE}/${geofenceId}`,
        )
        .then((r) => r.data),

    create: (payload: CreateAttendanceGeofencePayload) =>
      apiClient
        .post<ApiSuccessResponse<AttendanceGeofence>>(GEOFENCES_BASE, payload)
        .then((r) => r.data),

    update: (
      geofenceId: string,
      payload: UpdateAttendanceGeofencePayload,
      ifMatch?: string,
    ) =>
      apiClient
        .patch<ApiSuccessResponse<AttendanceGeofence>>(
          `${GEOFENCES_BASE}/${geofenceId}`,
          payload,
          { headers: ifMatchHeaders(ifMatch) },
        )
        .then((r) => r.data),

    delete: (geofenceId: string, ifMatch?: string) =>
      apiClient
        .delete<void>(`${GEOFENCES_BASE}/${geofenceId}`, {
          headers: ifMatchHeaders(ifMatch),
        })
        .then(() => undefined),

    check: (geofenceId: string, payload: GeofenceCheckPayload) =>
      apiClient
        .post<ApiSuccessResponse<GeofenceCheckResponse>>(
          `${GEOFENCES_BASE}/${geofenceId}/check`,
          payload,
        )
        .then((r) => r.data),
  },

  offlineSessions: {
    list: (params?: ListOfflineSessionsParams) =>
      apiClient
        .get<PaginatedResponse<OfflineSession>>(OFFLINE_BASE, { params })
        .then((r) => r.data),

    getById: (sessionId: string) =>
      apiClient
        .get<ApiSuccessResponse<OfflineSession>>(`${OFFLINE_BASE}/${sessionId}`)
        .then((r) => r.data),

    getPendingEvents: (sessionId: string) =>
      apiClient
        .get<ApiSuccessResponse<OfflinePendingEvent[]>>(
          `${OFFLINE_BASE}/${sessionId}/pending-events`,
        )
        .then((r) => r.data),

    replay: (sessionId: string) =>
      apiClient
        .post<ApiSuccessResponse<OfflineReplayResponse>>(
          `${OFFLINE_BASE}/${sessionId}/replay`,
        )
        .then((r) => r.data),

    close: (sessionId: string, payload: DeviceLifecycleReasonPayload) =>
      apiClient
        .post<ApiSuccessResponse<OfflineSession>>(
          `${OFFLINE_BASE}/${sessionId}/close`,
          payload,
        )
        .then((r) => r.data),
  },
};
