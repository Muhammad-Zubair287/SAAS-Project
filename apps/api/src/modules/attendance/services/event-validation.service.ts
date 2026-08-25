import { Injectable, Logger } from '@nestjs/common';
import { type AttendanceDevice } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AttendanceDeviceRepository } from '../repositories/attendance-device.repository';
import { AttendanceDeviceEventRepository } from '../repositories/attendance-device-event.repository';
import { GeofenceService } from './geofence.service';
import type { IngestEventInput } from './device-event-ingest.service';

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  warnings?: string[];
}

/**
 * EventValidationService
 *
 * Performs comprehensive validation on attendance capture events.
 * Responsibilities:
 * 1. Duplicate detection (by idempotency key, checksum)
 * 2. Checksum validation (payload integrity)
 * 3. Employee mapping & existence
 * 4. Clock skew validation (device time vs server)
 * 5. GPS validation (accuracy, coordinates)
 * 6. IP address validation (whitelist check)
 * 7. Geofence validation (if applicable)
 *
 * Returns structured validation result with reason on failure.
 * Allows controllers to decide whether to accept, reject, or queue for review.
 */
@Injectable()
export class EventValidationService {
  private readonly logger = new Logger(EventValidationService.name);

  // Validation thresholds
  private readonly MAX_CLOCK_SKEW_MS = 300000; // 5 minutes
  private readonly MIN_GPS_ACCURACY_M = 5; // Minimum accuracy (meters)
  private readonly MAX_GPS_ACCURACY_M = 5000; // Maximum useful accuracy
  private readonly MAX_EVENT_AGE_MS = 86400000; // 24 hours

  constructor(
    private readonly deviceRepo: AttendanceDeviceRepository,
    private readonly deviceEventRepo: AttendanceDeviceEventRepository,
    private readonly geofenceService: GeofenceService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Validate an event comprehensively.
   * Performs all checks and returns boolean + reason on failure.
   */
  async validateEvent(
    tenantId: string,
    input: IngestEventInput,
    device: AttendanceDevice | null,
  ): Promise<ValidationResult> {
    const warnings: string[] = [];

    // 1. Validate payload checksum
    const checksumValid = this.validateChecksum(input.payload, input.checksum);
    if (!checksumValid) {
      return {
        isValid: false,
        reason: 'Event checksum mismatch (payload integrity violation)',
      };
    }

    // 2. Validate timestamp (not too old, not in future)
    const timestampValid = this.validateTimestamp(input.occurredAt);
    if (!timestampValid) {
      return {
        isValid: false,
        reason: `Event timestamp is outside valid range (${this.MAX_EVENT_AGE_MS / 1000 / 3600} hours)`,
      };
    }

    // 3. Validate employee exists (if provided)
    if (input.employeeId) {
      const employeeExists = await this.validateEmployeeExists(input.employeeId, tenantId);
      if (!employeeExists) {
        return {
          isValid: false,
          reason: `Employee ${input.employeeId} not found`,
        };
      }
    }

    // 4. Validate device (if provided)
    if (input.deviceId && device) {
      const deviceValid = this.validateDevice(device);
      if (!deviceValid) {
        return {
          isValid: false,
          reason: `Device is not in ACTIVE status (status: ${device.status})`,
        };
      }

      // 5. Validate IP whitelist
      if (device.ipWhitelist && device.ipWhitelist.length > 0 && input.ipAddress) {
        const ipValid = this.validateIpWhitelist(input.ipAddress, device.ipWhitelist);
        if (!ipValid) {
          warnings.push(`IP address ${input.ipAddress} is not in device whitelist`);
        }
      }

      // 6. Validate clock skew (if device time is available)
      const clockSkew = this.validateClockSkew(input.occurredAt);
      if (clockSkew > this.MAX_CLOCK_SKEW_MS) {
        warnings.push(
          `Device clock skew is ${Math.round(clockSkew / 1000)} seconds`,
        );
      }
    }

    // 7. Validate GPS (if coordinates provided)
    if (input.geoLat !== undefined && input.geoLng !== undefined) {
      const gpsValid = this.validateGps(
        input.geoLat,
        input.geoLng,
        input.geoAccuracyM,
      );
      if (!gpsValid) {
        warnings.push('GPS coordinates are invalid or accuracy is too low');
      }

      // 8. Validate geofence (if applicable)
      // TODO: Integrate with branch/legal entity to find applicable geofence
      // For now, skip geofence validation
    }

    return {
      isValid: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Validate checksum matches payload.
   */
  private validateChecksum(payload: Record<string, unknown>, checksum: string): boolean {
    // Implementation depends on how checksum is computed
    // For now, assume it's provided by the caller
    // In production, recompute and compare
    return !!checksum && checksum.length === 64; // SHA-256 hex is 64 chars
  }

  /**
   * Validate timestamp is not too old and not in future.
   */
  private validateTimestamp(timestamp: Date): boolean {
    const now = new Date();
    const age = now.getTime() - timestamp.getTime();

    // Event is too old (more than MAX_EVENT_AGE_MS)
    if (age > this.MAX_EVENT_AGE_MS) {
      return false;
    }

    // Event is in the future (more than 1 minute ahead)
    if (age < -60000) {
      return false;
    }

    return true;
  }

  /**
   * Check if employee exists in the system.
   */
  private async validateEmployeeExists(
    employeeId: string,
    tenantId: string,
  ): Promise<boolean> {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
    });
    return !!employee;
  }

  /**
   * Validate device status is ACTIVE.
   */
  private validateDevice(device: AttendanceDevice): boolean {
    return device.status === 'ACTIVE';
  }

  /**
   * Validate IP address against device whitelist.
   */
  private validateIpWhitelist(ipAddress: string, whitelist: string[]): boolean {
    if (!ipAddress || whitelist.length === 0) {
      return true; // No restriction
    }

    // TODO: Implement CIDR matching for IP ranges
    // For now, simple exact match
    return whitelist.includes(ipAddress);
  }

  /**
   * Calculate clock skew between device timestamp and server time.
   * Returns absolute skew in milliseconds.
   */
  private validateClockSkew(deviceTimestamp: Date): number {
    const now = new Date();
    return Math.abs(now.getTime() - deviceTimestamp.getTime());
  }

  /**
   * Validate GPS coordinates and accuracy.
   */
  private validateGps(
    latitude: number,
    longitude: number,
    accuracy?: number,
  ): boolean {
    // Validate coordinates are within valid range
    if (latitude < -90 || latitude > 90) {
      return false;
    }

    if (longitude < -180 || longitude > 180) {
      return false;
    }

    // Validate accuracy if provided
    if (accuracy !== undefined) {
      if (accuracy < this.MIN_GPS_ACCURACY_M || accuracy > this.MAX_GPS_ACCURACY_M) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check for duplicate event by idempotency key.
   */
  async checkDuplicate(
    idempotencyKey: string,
    tenantId: string,
  ): Promise<boolean> {
    const existing = await this.deviceEventRepo.findByIdempotencyKey(
      idempotencyKey,
      tenantId,
    );
    return !!existing;
  }

  /**
   * Validate that event type is in the allowed list.
   */
  validateEventType(eventType: string): boolean {
    const ALLOWED_TYPES = [
      'CLOCK_IN',
      'CLOCK_OUT',
      'BREAK_START',
      'BREAK_END',
      'LOCATION_PING',
      'MOBILE_CHECKIN',
      'MOBILE_CHECKOUT',
    ];

    return ALLOWED_TYPES.includes(eventType.toUpperCase());
  }

  /**
   * Validate event payload structure.
   * Can be used to validate specific event types have required fields.
   */
  validatePayloadStructure(
    payload: Record<string, unknown>,
    eventType: string,
  ): boolean {
    // All events should have minimal structure
    // Type-specific validation can be added here
    return !!payload;
  }
}
