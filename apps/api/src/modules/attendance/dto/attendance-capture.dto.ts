import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  AttendanceCaptureSession,
  AttendanceDevice,
  AttendanceGeofence,
  AttendanceOfflineQueue,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const DEVICE_STATUSES = ['PENDING', 'ACTIVE', 'SUSPENDED', 'DECOMMISSIONED'] as const;
const EVENT_TYPES = ['CHECK_IN', 'CHECK_OUT', 'BREAK_START', 'BREAK_END'] as const;
const CAPTURE_SOURCES = ['BIOMETRIC', 'MOBILE', 'OFFLINE', 'GATEWAY'] as const;

export class RegisterAttendanceDeviceDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(255) name!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(64) deviceType!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(128) serialNumber!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(128) vendor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(128) model?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) timezone?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class ProvisionAttendanceDeviceDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(128) deviceFingerprint!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(128) publicKeyFingerprint!: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) @MaxLength(64, { each: true }) ipWhitelist?: string[];
}

export class DeviceReasonDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(500) reason!: string;
}

export class ReplaceAttendanceDeviceDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(128) newSerialNumber!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(128) newDeviceFingerprint?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(128) newPublicKeyFingerprint?: string;
}

export class DeviceHeartbeatDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(100) cpu?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(100) memory?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(100) disk?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) queueLength?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(128) firmwareVersion?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() clockOffsetMs?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() lastSyncAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class HeartbeatHistoryQueryDto {
  @ApiPropertyOptional({ default: 24, minimum: 1, maximum: 168 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(168) sinceHours?: number;
}

export class DeviceLocationDto {
  @ApiProperty() @Type(() => Number) @IsLatitude() latitude!: number;
  @ApiProperty() @Type(() => Number) @IsLongitude() longitude!: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) accuracyMeters?: number;
}

export class IngestDeviceEventDto {
  @ApiProperty({ enum: CAPTURE_SOURCES }) @IsIn(CAPTURE_SOURCES) source!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(255) sourceEventId!: string;
  @ApiProperty() @IsDateString() occurredAt!: string;
  @ApiProperty() @IsUUID() deviceId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() employeeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() mobileDeviceId?: string;
  @ApiProperty({ enum: EVENT_TYPES }) @IsIn(EVENT_TYPES) eventType!: string;
  @ApiPropertyOptional({ type: DeviceLocationDto }) @IsOptional() @ValidateNested() @Type(() => DeviceLocationDto) location?: DeviceLocationDto;
  @ApiProperty() @IsObject() payload!: Record<string, unknown>;
}

export class CreateOfflineSessionDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() mobileDeviceId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) clientTimezone?: string;
}

export class OfflineQueueEventDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(32) source!: string;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) sequenceNumber!: number;
  @ApiProperty() @IsObject() payload!: Record<string, unknown>;
  @ApiProperty() @IsString() @Matches(/^[a-f0-9]{64,128}$/i) payloadHash!: string;
}

export class OfflineBatchDto {
  @ApiProperty({ type: [OfflineQueueEventDto], maxItems: 100 }) @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => OfflineQueueEventDto) events!: OfflineQueueEventDto[];
}

export class CreateGeofenceDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(200) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() legalEntityId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() branchId?: string;
  @ApiProperty() @Type(() => Number) @IsLatitude() centerLat!: number;
  @ApiProperty() @Type(() => Number) @IsLongitude() centerLng!: number;
  @ApiProperty({ minimum: 10, maximum: 100000 }) @Type(() => Number) @IsInt() @Min(10) @Max(100000) radiusMeters!: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() activeFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() activeTo?: string;
}

export class UpdateGeofenceDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) name?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsLatitude() centerLat?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsLongitude() centerLng?: number;
  @ApiPropertyOptional({ minimum: 10, maximum: 100000 }) @IsOptional() @Type(() => Number) @IsInt() @Min(10) @Max(100000) radiusMeters?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() activeFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() activeTo?: string;
}

export class ListGeofencesQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() legalEntityId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() branchId?: string;
}

export class GeofenceCheckDto {
  @ApiProperty() @Type(() => Number) @IsLatitude() latitude!: number;
  @ApiProperty() @Type(() => Number) @IsLongitude() longitude!: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() at?: string;
}

export class DeviceResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() deviceType!: string;
  @ApiProperty() serialNumber!: string;
  @ApiProperty({ enum: DEVICE_STATUSES }) status!: string;
  @ApiPropertyOptional() vendor?: string | null;
  @ApiPropertyOptional() model?: string | null;
  @ApiPropertyOptional() timezone?: string | null;
  @ApiPropertyOptional() lastSeenAt?: Date | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class OfflineSessionResponseDto {
  @ApiProperty() id!: string;
  @ApiPropertyOptional() deviceId?: string | null;
  @ApiPropertyOptional() mobileDeviceId?: string | null;
  @ApiProperty() startedAt!: Date;
  @ApiPropertyOptional() endedAt?: Date | null;
  @ApiPropertyOptional() clientTimezone?: string | null;
  @ApiPropertyOptional() status?: string | null;
}

/** Safe pending offline event — excludes internal-only fields; sequenceNumber as string for JSON. */
export class OfflinePendingEventResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiPropertyOptional() sessionId?: string | null;
  @ApiProperty() source!: string;
  @ApiProperty({ description: 'Sequence number serialized as string (BigInt-safe)' })
  sequenceNumber!: string;
  @ApiProperty({ type: 'object', additionalProperties: true })
  payload!: Record<string, unknown>;
  @ApiProperty({ description: 'Client-supplied integrity hash of the event payload' })
  payloadHash!: string;
  @ApiProperty() uploadedAt!: Date;
  @ApiPropertyOptional() replayedAt?: Date | null;
  @ApiProperty() status!: string;
  @ApiProperty() attempts!: number;
}

/** Safe geofence transport DTO — circle fields + rowVersion; no Prisma entity passthrough. */
export class GeofenceResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() legalEntityId?: string | null;
  @ApiPropertyOptional() branchId?: string | null;
  @ApiProperty() shape!: string;
  @ApiPropertyOptional() centerLat?: number | null;
  @ApiPropertyOptional() centerLng?: number | null;
  @ApiPropertyOptional() radiusMeters?: number | null;
  @ApiPropertyOptional() activeFrom?: Date | null;
  @ApiPropertyOptional() activeTo?: Date | null;
  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  metadata?: Record<string, unknown> | null;
  @ApiProperty({ description: 'Optimistic concurrency version; send as If-Match on PATCH/DELETE' })
  rowVersion!: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class DeviceTokenResponseDto {
  @ApiProperty() token!: string;
  @ApiProperty({ example: 'Device' }) tokenType = 'Device';
  @ApiProperty() expiresIn!: number;
  @ApiProperty() expiresAt!: Date;
}

export class DeviceTokenInspectionResponseDto {
  @ApiProperty() deviceId!: string;
  @ApiProperty() valid = true;
  @ApiProperty() expiresAt!: Date;
}

export class DeviceEventResponseDto {
  @ApiProperty() eventId!: string;
  @ApiProperty() validationStatus!: string;
  @ApiPropertyOptional() validationReason?: string;
  @ApiPropertyOptional() rawEventId?: string;
  @ApiProperty() replayed = false;
}

export class OfflineBatchReceiptDto {
  @ApiProperty() sessionId!: string;
  @ApiProperty() acceptedCount!: number;
  @ApiProperty() deduplicatedCount!: number;
  @ApiProperty() pendingCount!: number;
}

export const toDeviceResponse = (device: AttendanceDevice): DeviceResponseDto => ({
  id: device.id,
  name: device.name,
  deviceType: device.deviceType,
  serialNumber: device.serialNumber ?? '',
  status: device.status,
  vendor: device.vendor,
  model: device.model,
  timezone: device.timezone,
  lastSeenAt: device.lastSeenAt,
  createdAt: device.createdAt,
  updatedAt: device.updatedAt,
});

export const toOfflineSessionResponse = (
  session: AttendanceCaptureSession,
): OfflineSessionResponseDto => ({
  id: session.id,
  deviceId: session.deviceId,
  mobileDeviceId: session.mobileDeviceId,
  startedAt: session.startedAt,
  endedAt: session.endedAt,
  clientTimezone: session.clientTimezone,
  status: session.status,
});

export const toOfflinePendingEventResponse = (
  event: AttendanceOfflineQueue,
): OfflinePendingEventResponseDto => ({
  id: event.id,
  tenantId: event.tenantId,
  sessionId: event.sessionId,
  source: event.source,
  sequenceNumber: event.sequenceNumber.toString(),
  payload: (event.payload ?? {}) as Record<string, unknown>,
  payloadHash: event.payloadHash,
  uploadedAt: event.uploadedAt,
  replayedAt: event.replayedAt,
  status: event.status,
  attempts: event.attempts,
});

export const toGeofenceResponse = (geofence: AttendanceGeofence): GeofenceResponseDto => ({
  id: geofence.id,
  tenantId: geofence.tenantId,
  name: geofence.name,
  legalEntityId: geofence.legalEntityId,
  branchId: geofence.branchId,
  shape: geofence.shape,
  centerLat: geofence.centerLat,
  centerLng: geofence.centerLng,
  radiusMeters: geofence.radiusMeters,
  activeFrom: geofence.activeFrom,
  activeTo: geofence.activeTo,
  metadata: (geofence.metadata ?? null) as Record<string, unknown> | null,
  rowVersion: geofence.rowVersion.toString(),
  createdAt: geofence.createdAt,
  updatedAt: geofence.updatedAt,
});
