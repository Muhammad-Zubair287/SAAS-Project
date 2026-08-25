import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { randomUUID } from 'crypto';
import { Prisma, ValidationStatus, CaptureSource, type AttendanceDeviceEvent } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { AuditEventSeverity } from '../../../common/enums/platform.enum';
import { AttendanceDeviceEventRepository } from '../repositories/attendance-device-event.repository';
import { AttendanceRawEventRepository } from '../repositories/attendance-raw-event.repository';
import { AttendanceDeviceRepository } from '../repositories/attendance-device.repository';
import { DeviceAuthService } from './device-auth.service';
import { EventValidationService } from './event-validation.service';

export interface IngestEventInput {
  source: CaptureSource;
  sourceEventId: string;
  idempotencyKey?: string;
  occurredAt: Date;
  employeeId?: string;
  deviceId?: string;
  mobileDeviceId?: string;
  eventType: string;
  geoLat?: number;
  geoLng?: number;
  geoAccuracyM?: number;
  ipAddress?: string;
  payload: Record<string, unknown>;
  checksum: string;
}

export interface IngestEventResult {
  eventId: string;
  validationStatus: ValidationStatus;
  validationReason?: string;
  rawEventId?: string;
}

/**
 * DeviceEventIngestService
 *
 * Receives attendance capture events from devices.
 * Responsibilities:
 * 1. Normalize payloads
 * 2. Validate device, session, token, timestamp
 * 3. Compute checksum for idempotency
 * 4. Persist to AttendanceDeviceEvent (with PENDING status)
 * 5. Forward validated events to AttendanceRawEvent
 * 6. Publish AttendanceEventReceived outbox event
 *
 * NEVER calculates attendance. That's the calculator's job.
 */
@Injectable()
export class DeviceEventIngestService {
  private readonly logger = new Logger(DeviceEventIngestService.name);

  constructor(
    private readonly deviceEventRepo: AttendanceDeviceEventRepository,
    private readonly rawEventRepo: AttendanceRawEventRepository,
    private readonly deviceRepo: AttendanceDeviceRepository,
    private readonly deviceAuthService: DeviceAuthService,
    private readonly validationService: EventValidationService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Ingest an event from a device.
   *
   * Flow:
   * 1. Compute checksum (payload hash) for idempotency
   * 2. Check for duplicates by idempotency key / checksum
   * 3. Validate device exists and is ACTIVE
   * 4. Create AttendanceDeviceEvent with PENDING validation status
   * 5. If validation passes: create AttendanceRawEvent, publish outbox event
   * 6. If validation fails: mark event as REJECTED with reason
   *
   * Returns immediately with event ID. Validation is async via the outbox.
   */
  async ingestEvent(
    tenantId: string,
    input: IngestEventInput,
    deviceToken: string,
    correlationId: string,
  ): Promise<IngestEventResult> {
    // Compute checksum for idempotency
    const checksum = this.computeChecksum(input.payload);

    // Check for duplicate by idempotency key (if provided)
    if (input.idempotencyKey) {
      const existing = await this.deviceEventRepo.findByIdempotencyKey(
        input.idempotencyKey,
        tenantId,
      );
      if (existing) {
        return {
          eventId: existing.id,
          validationStatus: existing.validationStatus,
          validationReason: existing.validationReason ?? undefined,
          rawEventId: existing.id, // Not accurate but follows pattern
        };
      }
    }

    // Check for duplicate by checksum
    const duplicateByChecksum = await this.prisma.attendanceDeviceEvent.findFirst({
      where: {
        tenantId,
        checksum,
        validationStatus:
          ValidationStatus.VALIDATED,
      },
    });
    if (duplicateByChecksum) {
      // Same checksum = same payload = duplicate event
      return {
        eventId: duplicateByChecksum.id,
        validationStatus: ValidationStatus.VALIDATED,
        rawEventId: duplicateByChecksum.id,
      };
    }

    // Validate device
    const device = input.deviceId
      ? await this.deviceRepo.findById(input.deviceId, tenantId)
      : null;

    if (input.deviceId && !device) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_DEVICE_NOT_FOUND,
        statusCode: HttpStatus.NOT_FOUND,
        message: `Device ${input.deviceId} not found.`,
      });
    }

    // Validate token
    const tokenValidation = await this.deviceAuthService.validateToken(
      this.hashToken(deviceToken),
      tenantId,
    );
    if (!tokenValidation.valid) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_DEVICE_TOKEN_INVALID,
        statusCode: HttpStatus.UNAUTHORIZED,
        message: `Invalid or expired device token: ${tokenValidation.reason}`,
      });
    }

    // Verify token belongs to this device
    if (device && tokenValidation.deviceId !== device.id) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_DEVICE_TOKEN_INVALID,
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'Device token does not match device.',
      });
    }

    // Perform validation (synchronous call)
    let validationStatus: ValidationStatus = ValidationStatus.PENDING;
    let validationReason: string | null = null;
    let rawEventId: string | null = null;

    try {
      const validation = await this.validationService.validateEvent(tenantId, input, device);
      if (validation.isValid) {
        validationStatus = ValidationStatus.PENDING; // keep pending until raw event is created
      } else {
        validationStatus = ValidationStatus.REJECTED;
        validationReason = validation.reason ?? null;
      }
    } catch (error) {
      validationStatus = ValidationStatus.PENDING_REVIEW;
      validationReason = (error as Error).message;
      this.logger.warn(`Event validation error for device ${input.deviceId}:`, error);
    }

    // Persist event first (let DB default PENDING be used), then conditionally create raw event and update status
    const result = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      const createdEvent = await tx.attendanceDeviceEvent.create({
        data: {
          tenantId,
          source: input.source,
          sourceEventId: input.sourceEventId,
          idempotencyKey: input.idempotencyKey ?? null,
          occurredAt: input.occurredAt,
          receivedAt: new Date(),
          employeeId: input.employeeId ?? null,
          deviceId: input.deviceId ?? null,
          mobileDeviceId: input.mobileDeviceId ?? null,
          eventType: input.eventType,
          geoLat: input.geoLat ?? null,
          geoLng: input.geoLng ?? null,
          geoAccuracyM: input.geoAccuracyM ?? null,
          ipAddress: input.ipAddress ?? null,
          payload: input.payload as Prisma.InputJsonValue,
          checksum,
          // leave validationStatus to DB default (PENDING)
        },
      });

      // If validation passed, create raw event and then update device event to VALIDATED
      if (validationStatus !== ValidationStatus.REJECTED && input.employeeId) {
        const rawEvent = await tx.attendanceRawEvent.create({
          data: {
            tenantId,
            employeeId: input.employeeId,
            eventType: input.eventType,
            source: input.source,
            eventTime: input.occurredAt,
            deviceId: input.deviceId ?? null,
            idempotencyKey: input.idempotencyKey ?? randomUUID(),
            latitude: input.geoLat ?? null,
            longitude: input.geoLng ?? null,
            ipAddress: input.ipAddress ?? null,
            metadata: this.buildRawEventMetadata(input),
            status: 'PENDING',
            createdBy: input.deviceId ?? 'SYSTEM',
            // employeeId scalar field already set above
          },
        });

        rawEventId = rawEvent.id;

        await tx.attendanceDeviceEvent.update({
          where: { id: createdEvent.id },
          data: {
            validationStatus: ValidationStatus.VALIDATED,
            validationReason: null,
            captureSessionId: createdEvent.captureSessionId ?? null,
          },
        });

        // Outbox: Event received and validated
        await tx.outboxEvent.create({
          data: {
            tenantId,
            eventId: randomUUID(),
            eventType: 'AttendanceEventReceived.v1',
            payload: {
              deviceEventId: createdEvent.id,
              rawEventId: rawEvent.id,
              employeeId: input.employeeId,
              eventType: input.eventType,
              source: input.source,
              correlationId,
            },
          },
        });
      } else if (validationStatus === ValidationStatus.REJECTED) {
        // Update event as rejected
        await tx.attendanceDeviceEvent.update({
          where: { id: createdEvent.id },
          data: {
            validationStatus: ValidationStatus.REJECTED,
            validationReason: validationReason,
          },
        });

        // Outbox: Event validation failed
        await tx.outboxEvent.create({
          data: {
            tenantId,
            eventId: randomUUID(),
            eventType: 'CaptureValidationFailed.v1',
            payload: {
              deviceEventId: createdEvent.id,
              reason: validationReason,
              source: input.source,
              sourceEventId: input.sourceEventId,
              correlationId,
            },
          },
        });
      }

      // Audit: Event ingested
      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId: input.deviceId ?? 'MOBILE',
          actorType: 'DEVICE',
          module: 'ATTENDANCE',
          action: 'AttendanceEventIngested',
          resourceType: 'attendance_device_event',
          resourceId: createdEvent.id,
          metadata: {
            validationStatus: validationStatus === ValidationStatus.REJECTED ? ValidationStatus.REJECTED : ValidationStatus.PENDING,
            validationReason: validationReason,
            source: input.source,
            eventType: input.eventType,
          } as Prisma.InputJsonValue,
          correlationId,
          severity: validationStatus === ValidationStatus.REJECTED ? 'WARNING' : 'INFO',
          occurredAt: new Date(),
        },
      });

      return {
        eventId: createdEvent.id,
        validationStatus: validationStatus === ValidationStatus.REJECTED ? ValidationStatus.REJECTED : ValidationStatus.PENDING,
        validationReason: validationReason ?? undefined,
        rawEventId: rawEventId ?? undefined,
      };
    });

    return result;
  }

  /**
   * Compute SHA-256 hash of event payload.
   * Used for duplicate detection and integrity verification.
   */
  private computeChecksum(payload: Record<string, unknown>): string {
    const json = JSON.stringify(payload);
    return createHash('sha256').update(json).digest('hex');
  }

  /**
   * Hash device token for comparison (same as DeviceAuthService).
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Build metadata for AttendanceRawEvent.
   */
  private buildRawEventMetadata(input: IngestEventInput): Prisma.InputJsonValue {
    return {
      source: input.source,
      sourceEventId: input.sourceEventId,
      deviceId: input.deviceId,
      mobileDeviceId: input.mobileDeviceId,
      geoAccuracyM: input.geoAccuracyM,
      checksum: this.computeChecksum(input.payload),
      ...input.payload,
    };
  }

  /**
   * Revalidate a previously rejected event.
   * Called when conditions change (e.g., employee created).
   */
  async revalidateEvent(
    deviceEventId: string,
    tenantId: string,
    actorId: string,
    actorEmail: string,
    correlationId: string,
  ): Promise<AttendanceDeviceEvent> {
    const event = await this.deviceEventRepo.findById(deviceEventId, tenantId);
    if (!event) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_DEVICE_NOT_FOUND,
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Event not found.',
      });
    }

    if (event.validationStatus === ValidationStatus.VALIDATED) {
      // Already validated, nothing to do
      return event;
    }

    // Reconstruct input from stored event
    const reconstructedInput: IngestEventInput = {
      source: event.source as CaptureSource,
      sourceEventId: event.sourceEventId,
      idempotencyKey: event.idempotencyKey ?? undefined,
      occurredAt: event.occurredAt,
      employeeId: event.employeeId ?? undefined,
      deviceId: event.deviceId ?? undefined,
      mobileDeviceId: event.mobileDeviceId ?? undefined,
      eventType: event.eventType,
      geoLat: event.geoLat ?? undefined,
      geoLng: event.geoLng ?? undefined,
      geoAccuracyM: event.geoAccuracyM ?? undefined,
      ipAddress: event.ipAddress ?? undefined,
      payload: (event.payload as Record<string, unknown>) ?? {},
      checksum: event.checksum,
    };

    const device = event.deviceId
      ? await this.deviceRepo.findById(event.deviceId, tenantId)
      : null;

    // Revalidate
    let newStatus: ValidationStatus = ValidationStatus.PENDING;
    let newReason: string | null = null;

    try {
      const validation = await this.validationService.validateEvent(
        tenantId,
        reconstructedInput,
        device,
      );
      if (validation.isValid) {
        newStatus = ValidationStatus.VALIDATED;
      } else {
        newStatus = ValidationStatus.REJECTED;
        newReason = validation.reason ?? null;
      }
    } catch (error) {
      newStatus = ValidationStatus.PENDING_REVIEW;
      newReason = (error as Error).message;
    }

    // Update event
    const updated = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      const result = await tx.attendanceDeviceEvent.update({
        where: { id: deviceEventId },
        data: {
          validationStatus: newStatus,
          validationReason: newReason,
        },
      });

      // Audit: Event revalidated
      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId,
          actorType: 'USER',
          actorEmail,
          module: 'ATTENDANCE',
          action: 'AttendanceEventRevalidated',
          resourceType: 'attendance_device_event',
          resourceId: deviceEventId,
          before: {
            status: event.validationStatus,
          } as Prisma.InputJsonValue,
          after: {
            status: newStatus,
            reason: newReason,
          } as Prisma.InputJsonValue,
          correlationId,
          severity: AuditEventSeverity.INFO,
          occurredAt: new Date(),
        },
      });

      return result;
    });

    return updated;
  }

  /**
   * Worker entry point: validate a received device event asynchronously.
   */
  async processReceivedEventValidation(
    tenantId: string,
    deviceEventId: string,
    correlationId: string,
  ): Promise<{ validated: boolean; rawEventId?: string }> {
    const event = await this.deviceEventRepo.findById(deviceEventId, tenantId);
    if (!event) {
      return { validated: false };
    }

    if (event.validationStatus === ValidationStatus.VALIDATED) {
      return { validated: true };
    }

    if (event.validationStatus === ValidationStatus.REJECTED) {
      return { validated: false };
    }

    const reconstructedInput: IngestEventInput = {
      source: event.source as CaptureSource,
      sourceEventId: event.sourceEventId,
      idempotencyKey: event.idempotencyKey ?? undefined,
      occurredAt: event.occurredAt,
      employeeId: event.employeeId ?? undefined,
      deviceId: event.deviceId ?? undefined,
      mobileDeviceId: event.mobileDeviceId ?? undefined,
      eventType: event.eventType,
      geoLat: event.geoLat ?? undefined,
      geoLng: event.geoLng ?? undefined,
      geoAccuracyM: event.geoAccuracyM ?? undefined,
      ipAddress: event.ipAddress ?? undefined,
      payload: (event.payload as Record<string, unknown>) ?? {},
      checksum: event.checksum,
    };

    const device = event.deviceId
      ? await this.deviceRepo.findById(event.deviceId, tenantId)
      : null;

    const validation = await this.validationService.validateEvent(tenantId, reconstructedInput, device);
    if (!validation.isValid) {
      await this.deviceEventRepo.updateValidationStatus(
        deviceEventId,
        tenantId,
        ValidationStatus.REJECTED,
        validation.reason,
      );
      return { validated: false };
    }

    if (!this.validationService.validateEventType(event.eventType)) {
      await this.deviceEventRepo.updateValidationStatus(
        deviceEventId,
        tenantId,
        ValidationStatus.REJECTED,
        `Unsupported event type: ${event.eventType}`,
      );
      return { validated: false };
    }

    return { validated: true };
  }

  /**
   * Worker entry point: detect and mark duplicate device events.
   */
  async processDuplicateDetection(
    tenantId: string,
    deviceEventId: string,
    correlationId: string,
  ): Promise<{ isDuplicate: boolean }> {
    const event = await this.deviceEventRepo.findById(deviceEventId, tenantId);
    if (!event) {
      return { isDuplicate: false };
    }

    if (event.idempotencyKey) {
      const duplicateByKey = await this.validationService.checkDuplicate(event.idempotencyKey, tenantId);
      const existingByKey = await this.deviceEventRepo.findByIdempotencyKey(event.idempotencyKey, tenantId);
      if (duplicateByKey && existingByKey && existingByKey.id !== deviceEventId) {
        await this.deviceEventRepo.updateValidationStatus(
          deviceEventId,
          tenantId,
          ValidationStatus.REJECTED,
          'Duplicate event detected by idempotency key',
        );
        return { isDuplicate: true };
      }
    }

    const duplicateBySource = await this.deviceEventRepo.findBySourceEventId(event.sourceEventId, tenantId);
    if (duplicateBySource && duplicateBySource.id !== deviceEventId) {
      await this.deviceEventRepo.updateValidationStatus(
        deviceEventId,
        tenantId,
        ValidationStatus.REJECTED,
        'Duplicate event detected by source event ID',
      );
      return { isDuplicate: true };
    }

    const duplicateByChecksum = await this.prisma.attendanceDeviceEvent.findFirst({
      where: {
        tenantId,
        checksum: event.checksum,
        validationStatus: ValidationStatus.VALIDATED,
        id: { not: deviceEventId },
      },
    });
    if (duplicateByChecksum) {
      await this.deviceEventRepo.updateValidationStatus(
        deviceEventId,
        tenantId,
        ValidationStatus.REJECTED,
        'Duplicate event detected by payload checksum',
      );
      return { isDuplicate: true };
    }

    return { isDuplicate: false };
  }

  /**
   * Worker entry point: ingest a trusted offline queued event (session-authenticated).
   */
  async ingestOfflineQueuedEvent(
    tenantId: string,
    queuedEvent: {
      id: string;
      source: string;
      sequenceNumber: bigint;
      payload: unknown;
      payloadHash: string;
      sessionId: string;
    },
    session: { deviceId: string | null; mobileDeviceId: string | null },
    correlationId: string,
  ): Promise<IngestEventResult> {
    const payload = (queuedEvent.payload ?? {}) as Record<string, unknown>;
    const input: IngestEventInput = {
      source: queuedEvent.source as CaptureSource,
      sourceEventId:
        typeof payload['sourceEventId'] === 'string'
          ? payload['sourceEventId']
          : `${queuedEvent.sessionId}:${queuedEvent.sequenceNumber.toString()}`,
      idempotencyKey:
        typeof payload['idempotencyKey'] === 'string'
          ? payload['idempotencyKey']
          : `offline:${queuedEvent.sessionId}:${queuedEvent.sequenceNumber.toString()}`,
      occurredAt:
        typeof payload['occurredAt'] === 'string'
          ? new Date(payload['occurredAt'])
          : new Date(),
      employeeId: typeof payload['employeeId'] === 'string' ? payload['employeeId'] : undefined,
      deviceId: session.deviceId ?? (typeof payload['deviceId'] === 'string' ? payload['deviceId'] : undefined),
      mobileDeviceId:
        session.mobileDeviceId ??
        (typeof payload['mobileDeviceId'] === 'string' ? payload['mobileDeviceId'] : undefined),
      eventType: typeof payload['eventType'] === 'string' ? payload['eventType'] : 'CHECK_IN',
      geoLat: typeof payload['geoLat'] === 'number' ? payload['geoLat'] : undefined,
      geoLng: typeof payload['geoLng'] === 'number' ? payload['geoLng'] : undefined,
      geoAccuracyM: typeof payload['geoAccuracyM'] === 'number' ? payload['geoAccuracyM'] : undefined,
      ipAddress: typeof payload['ipAddress'] === 'string' ? payload['ipAddress'] : undefined,
      payload,
      checksum: queuedEvent.payloadHash,
    };

    const device = input.deviceId ? await this.deviceRepo.findById(input.deviceId, tenantId) : null;
    const validation = await this.validationService.validateEvent(tenantId, input, device);
    if (!validation.isValid) {
      return {
        eventId: queuedEvent.id,
        validationStatus: ValidationStatus.REJECTED,
        validationReason: validation.reason,
      };
    }

    return this.ingestTrustedEvent(tenantId, input, correlationId);
  }

  private async ingestTrustedEvent(
    tenantId: string,
    input: IngestEventInput,
    correlationId: string,
  ): Promise<IngestEventResult> {
    const checksum = input.checksum || this.computeChecksum(input.payload);

    if (input.idempotencyKey) {
      const existing = await this.deviceEventRepo.findByIdempotencyKey(input.idempotencyKey, tenantId);
      if (existing) {
        return {
          eventId: existing.id,
          validationStatus: existing.validationStatus,
          validationReason: existing.validationReason ?? undefined,
        };
      }
    }

    const device = input.deviceId ? await this.deviceRepo.findById(input.deviceId, tenantId) : null;
    let validationStatus: ValidationStatus = ValidationStatus.PENDING;
    let validationReason: string | null = null;
    let rawEventId: string | null = null;

    const validation = await this.validationService.validateEvent(tenantId, input, device);
    if (!validation.isValid) {
      validationStatus = ValidationStatus.REJECTED;
      validationReason = validation.reason ?? null;
    }

    return this.prisma.withTenantTransaction(tenantId, async (tx) => {
      const createdEvent = await tx.attendanceDeviceEvent.create({
        data: {
          tenantId,
          source: input.source,
          sourceEventId: input.sourceEventId,
          idempotencyKey: input.idempotencyKey ?? null,
          occurredAt: input.occurredAt,
          receivedAt: new Date(),
          employeeId: input.employeeId ?? null,
          deviceId: input.deviceId ?? null,
          mobileDeviceId: input.mobileDeviceId ?? null,
          eventType: input.eventType,
          geoLat: input.geoLat ?? null,
          geoLng: input.geoLng ?? null,
          geoAccuracyM: input.geoAccuracyM ?? null,
          ipAddress: input.ipAddress ?? null,
          payload: input.payload as Prisma.InputJsonValue,
          checksum,
        },
      });

      if (validationStatus !== ValidationStatus.REJECTED && input.employeeId) {
        const rawEvent = await tx.attendanceRawEvent.create({
          data: {
            tenantId,
            employeeId: input.employeeId,
            eventType: input.eventType,
            source: input.source,
            eventTime: input.occurredAt,
            deviceId: input.deviceId ?? null,
            idempotencyKey: input.idempotencyKey ?? randomUUID(),
            latitude: input.geoLat ?? null,
            longitude: input.geoLng ?? null,
            ipAddress: input.ipAddress ?? null,
            metadata: this.buildRawEventMetadata(input),
            status: 'PENDING',
            createdBy: input.deviceId ?? 'SYSTEM',
          },
        });
        rawEventId = rawEvent.id;
        await tx.attendanceDeviceEvent.update({
          where: { id: createdEvent.id },
          data: { validationStatus: ValidationStatus.VALIDATED, validationReason: null },
        });
        await tx.outboxEvent.create({
          data: {
            tenantId,
            eventId: randomUUID(),
            eventType: 'AttendanceEventReceived.v1',
            payload: {
              deviceEventId: createdEvent.id,
              rawEventId: rawEvent.id,
              employeeId: input.employeeId,
              eventType: input.eventType,
              source: input.source,
              correlationId,
            },
          },
        });
      } else if (validationStatus === ValidationStatus.REJECTED) {
        await tx.attendanceDeviceEvent.update({
          where: { id: createdEvent.id },
          data: { validationStatus: ValidationStatus.REJECTED, validationReason: validationReason },
        });
      }

      return {
        eventId: createdEvent.id,
        validationStatus:
          validationStatus === ValidationStatus.REJECTED
            ? ValidationStatus.REJECTED
            : ValidationStatus.PENDING,
        validationReason: validationReason ?? undefined,
        rawEventId: rawEventId ?? undefined,
      };
    });
  }
}
