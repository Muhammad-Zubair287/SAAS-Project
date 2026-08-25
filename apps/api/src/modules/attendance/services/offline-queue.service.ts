import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma, type AttendanceOfflineQueue } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { AuditEventSeverity } from '../../../common/enums/platform.enum';
import { APP_CONSTANTS } from '../../../common/constants/app.constants';
import { createPaginatedResponse } from '../../../common/utils/response.helper';
import type { ApiSuccessResponse } from '../../../common/interfaces/api-response.interface';
import { ATTENDANCE_EVENTS } from '../constants/attendance-events.constants';
import { AttendanceOfflineQueueRepository } from '../repositories/attendance-offline-queue.repository';
import { AttendanceCaptureSessionRepository } from '../repositories/attendance-capture-session.repository';
import { DeviceEventIngestService } from './device-event-ingest.service';
import type { ListOfflineSessionsDto } from '../dto/list-offline-sessions.dto';
import {
  toOfflinePendingEventResponse,
  toOfflineSessionResponse,
  type OfflinePendingEventResponseDto,
  type OfflineSessionResponseDto,
} from '../dto/attendance-capture.dto';

export interface CreateOfflineSessionInput {
  deviceId?: string;
  mobileDeviceId?: string;
  clientTimezone?: string;
  ipAddress?: string;
}

export interface EnqueueOfflineEventInput {
  source: string;
  sequenceNumber: bigint;
  payload: Record<string, unknown>;
  payloadHash: string;
}

export interface ReplayQueueResult {
  sessionId: string;
  processedCount: number;
  successCount: number;
  errorCount: number;
  deduplicatedCount: number;
}

/**
 * OfflineQueueService
 *
 * Manages offline event queues for devices.
 * Handles:
 * 1. Creating offline sessions (when device goes offline)
 * 2. Enqueueing events to offline queue
 * 3. Replaying queued events when device comes back online
 * 4. Deduplicating events (by sequence number + hash)
 * 5. Tracking replay status
 *
 * Ensures events are processed in order (sequence number).
 * Prevents data loss during network outages.
 */
@Injectable()
export class OfflineQueueService {
  private readonly logger = new Logger(OfflineQueueService.name);

  constructor(
    private readonly queueRepo: AttendanceOfflineQueueRepository,
    private readonly sessionRepo: AttendanceCaptureSessionRepository,
    private readonly deviceEventIngest: DeviceEventIngestService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Create a new offline capture session.
   * Called when a device goes offline or explicitly requests offline mode.
   */
  async createOfflineSession(
    tenantId: string,
    input: CreateOfflineSessionInput,
    correlationId: string,
  ): Promise<OfflineSessionResponseDto> {
    const session = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      const created = await tx.attendanceCaptureSession.create({
        data: {
          tenantId,
          deviceId: input.deviceId ?? null,
          mobileDeviceId: input.mobileDeviceId ?? null,
          sessionTokenHash: null, // Will be set on first event
          startedAt: new Date(),
          clientTimezone: input.clientTimezone ?? null,
          ipAddress: input.ipAddress ?? null,
          status: 'ACTIVE',
          metadata: undefined,
        },
      });

      // Audit: Offline session created
      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId: input.deviceId ?? 'MOBILE',
          actorType: 'DEVICE',
          module: 'ATTENDANCE',
          action: 'OfflineSessionCreated',
          resourceType: 'attendance_capture_session',
          resourceId: created.id,
          metadata: {
            sessionId: created.id,
            deviceId: input.deviceId,
            mobileDeviceId: input.mobileDeviceId,
          } as Prisma.InputJsonValue,
          correlationId,
          severity: AuditEventSeverity.INFO,
          occurredAt: new Date(),
        },
      });

      // Outbox: Offline session created
      await tx.outboxEvent.create({
        data: {
          tenantId,
          eventId: randomUUID(),
          eventType: 'OfflineSessionCreated.v1',
          payload: {
            sessionId: created.id,
            deviceId: input.deviceId,
            mobileDeviceId: input.mobileDeviceId,
            correlationId,
          },
        },
      });

      return created;
    });

    return toOfflineSessionResponse(session);
  }

  /**
   * Enqueue an offline event.
   * Events are stored with sequence numbers to maintain order.
   * Deduplication by combination of sessionId + sequenceNumber + payloadHash.
   */
  async enqueueEvent(
    sessionId: string,
    tenantId: string,
    input: EnqueueOfflineEventInput,
    correlationId: string,
  ): Promise<AttendanceOfflineQueue> {
    const session = await this.sessionRepo.findById(sessionId, tenantId);
    if (!session) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_SESSION_NOT_FOUND,
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Offline session not found.',
      });
    }

    if (session.status !== 'ACTIVE') {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_SESSION_INVALID,
        statusCode: HttpStatus.CONFLICT,
        message: `Offline session is not active (status: ${session.status}).`,
      });
    }

    // Check for duplicate by sequence number in this session
    const sessionEvents = await this.queueRepo.findBySessionId(sessionId, tenantId);
    const existing = sessionEvents.find((queued) => queued.sequenceNumber === input.sequenceNumber);
    if (existing) {
      // Idempotent: return existing record
      return existing;
    }

    const event = await this.queueRepo.create(tenantId, {
      sessionId,
      source: input.source,
      payload: input.payload as Prisma.InputJsonValue,
      sequenceNumber: input.sequenceNumber,
      payloadHash: input.payloadHash,
      uploadedAt: new Date(),
      status: 'pending',
      attempts: 0,
    });

    // Audit: Event enqueued
    await this.prisma.auditEvent.create({
      data: {
        tenantId,
        actorId: session.deviceId ?? 'MOBILE',
        actorType: 'DEVICE',
        module: 'ATTENDANCE',
        action: 'OfflineEventEnqueued',
        resourceType: 'attendance_offline_queue',
        resourceId: event.id,
        metadata: {
          sessionId,
          sequenceNumber: input.sequenceNumber.toString(),
          source: input.source,
        } as Prisma.InputJsonValue,
        correlationId,
        severity: AuditEventSeverity.INFO,
        occurredAt: new Date(),
      },
    });

    return event;
  }

  /**
   * Replay queued events from an offline session.
   * Called when device comes back online.
   * Processes events in sequence order, stopping on error.
   *
   * Returns summary of processing.
   */
  async replayQueue(
    sessionId: string,
    tenantId: string,
    actorId: string,
    actorEmail: string,
    correlationId: string,
  ): Promise<ReplayQueueResult> {
    return this.executeOfflineReplay(sessionId, tenantId, actorId, actorEmail, correlationId);
  }

  /** Publish async replay request — consumed by AttendanceOfflineReplayWorker. */
  async publishOfflineReplayRequested(
    sessionId: string,
    tenantId: string,
    actorId: string,
    actorEmail: string,
    correlationId: string,
  ): Promise<void> {
    await this.prisma.outboxEvent.create({
      data: {
        tenantId,
        eventId: randomUUID(),
        eventType: ATTENDANCE_EVENTS.OFFLINE_REPLAY_REQUESTED,
        payload: {
          sessionId,
          actorId,
          actorEmail,
          correlationId,
        },
      },
    });
  }

  /** Replay queued events in sequence order via DeviceEventIngestService. */
  async executeOfflineReplay(
    sessionId: string,
    tenantId: string,
    actorId: string,
    actorEmail: string,
    correlationId: string,
  ): Promise<ReplayQueueResult> {
    const session = await this.sessionRepo.findById(sessionId, tenantId);
    if (!session) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_SESSION_NOT_FOUND,
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Offline session not found.',
      });
    }

    // Get all queued events in sequence order
    const queuedEvents = await this.queueRepo.findBySessionId(sessionId, tenantId);

    let successCount = 0;
    let errorCount = 0;
    let deduplicatedCount = 0;
    const processedCount = queuedEvents.length;

    // Replay each event
    for (const queuedEvent of queuedEvents) {
      try {
        // Check if we've already replayed this event
        if (queuedEvent.replayedAt) {
          deduplicatedCount++;
          continue;
        }

        // Replay via trusted offline ingest path
        await this.deviceEventIngest.ingestOfflineQueuedEvent(
          tenantId,
          {
            id: queuedEvent.id,
            source: queuedEvent.source,
            sequenceNumber: queuedEvent.sequenceNumber,
            payload: queuedEvent.payload,
            payloadHash: queuedEvent.payloadHash,
            sessionId,
          },
          { deviceId: session.deviceId, mobileDeviceId: session.mobileDeviceId },
          correlationId,
        );

        await this.queueRepo.update(queuedEvent.id, tenantId, {
          replayedAt: new Date(),
          status: 'completed',
        });

        successCount++;
      } catch (error) {
        errorCount++;
        this.logger.error(`Error replaying event ${queuedEvent.id}:`, error);

        // Increment attempts and mark for retry
        await this.queueRepo.update(queuedEvent.id, tenantId, {
          attempts: (queuedEvent.attempts ?? 0) + 1,
          status: queuedEvent.attempts >= 3 ? 'failed' : 'pending',
        });

        // Stop on first error (process in order)
        break;
      }
    }

    // Close session if all events replayed successfully
    if (errorCount === 0 && processedCount > 0) {
      await this.sessionRepo.update(sessionId, tenantId, {
        status: 'COMPLETED',
        endedAt: new Date(),
      });
    }

    // Audit: Queue replay completed
    await this.prisma.auditEvent.create({
      data: {
        tenantId,
        actorId,
        actorType: 'USER',
        actorEmail,
        module: 'ATTENDANCE',
        action: 'OfflineQueueReplayed',
        resourceType: 'attendance_capture_session',
        resourceId: sessionId,
        metadata: {
          processedCount,
          successCount,
          errorCount,
          deduplicatedCount,
        } as Prisma.InputJsonValue,
        correlationId,
        severity:
          errorCount > 0
            ? AuditEventSeverity.WARNING
            : AuditEventSeverity.INFO,
        occurredAt: new Date(),
      },
    });

    // Outbox: Offline replay completed
    await this.prisma.outboxEvent.create({
      data: {
        tenantId,
        eventId: randomUUID(),
        eventType: 'OfflineReplayCompleted.v1',
        payload: {
          sessionId,
          processedCount,
          successCount,
          errorCount,
          deduplicatedCount,
          correlationId,
        },
      },
    });

    return {
      sessionId,
      processedCount,
      successCount,
      errorCount,
      deduplicatedCount,
    };
  }

  /**
   * Close an offline session.
   * Called when device goes back online or session times out.
   */
  async closeSession(
    sessionId: string,
    tenantId: string,
    reason: string,
    actorId: string,
    actorEmail: string,
    correlationId: string,
  ): Promise<OfflineSessionResponseDto> {
    const session = await this.sessionRepo.findById(sessionId, tenantId);
    if (!session) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_SESSION_NOT_FOUND,
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Offline session not found.',
      });
    }

    const closed = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      const result = await tx.attendanceCaptureSession.update({
        where: { id: sessionId },
        data: {
          status: 'CLOSED',
          endedAt: new Date(),
          metadata: {
            ...(session.metadata as Record<string, unknown> ?? {}),
            closedReason: reason,
          } as Prisma.InputJsonValue,
        },
      });

      // Audit: Session closed
      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId,
          actorType: 'USER',
          actorEmail,
          module: 'ATTENDANCE',
          action: 'OfflineSessionClosed',
          resourceType: 'attendance_capture_session',
          resourceId: sessionId,
          metadata: {
            reason,
          } as Prisma.InputJsonValue,
          correlationId,
          severity: AuditEventSeverity.INFO,
          occurredAt: new Date(),
        },
      });

      return result;
    });

    const pending = await this.getPendingEvents(sessionId, tenantId);
    if (pending.length > 0) {
      await this.publishOfflineReplayRequested(sessionId, tenantId, actorId, actorEmail, correlationId);
    }

    return toOfflineSessionResponse(closed);
  }

  /**
   * Get pending events for a session (safe transport DTO).
   */
  async getPendingEvents(
    sessionId: string,
    tenantId: string,
  ): Promise<OfflinePendingEventResponseDto[]> {
    const session = await this.sessionRepo.findById(sessionId, tenantId);
    if (!session) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_SESSION_NOT_FOUND,
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Offline session not found.',
      });
    }
    const sessionEvents = await this.queueRepo.findBySessionId(sessionId, tenantId);
    return sessionEvents
      .filter((event) => event.status === 'pending')
      .map(toOfflinePendingEventResponse);
  }

  /**
   * List offline capture sessions for a tenant.
   */
  async listSessions(
    query: ListOfflineSessionsDto,
    tenantId: string,
  ): Promise<ApiSuccessResponse<OfflineSessionResponseDto[]>> {
    const page = query.page ?? APP_CONSTANTS.DEFAULT_PAGE;
    const pageSize = query.pageSize ?? APP_CONSTANTS.DEFAULT_PAGE_SIZE;
    const { data, total } = await this.sessionRepo.findMany(tenantId, {
      page,
      pageSize,
      status: query.status,
      deviceId: query.deviceId,
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      sortOrder: query.sortOrder,
    });
    return createPaginatedResponse(
      data.map(toOfflineSessionResponse),
      total,
      page,
      pageSize,
    );
  }

  /**
   * Get session by ID as a safe transport DTO (never exposes sessionTokenHash).
   */
  async getSession(
    sessionId: string,
    tenantId: string,
  ): Promise<OfflineSessionResponseDto> {
    const session = await this.sessionRepo.findById(sessionId, tenantId);
    if (!session) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_SESSION_NOT_FOUND,
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Offline session not found.',
      });
    }
    return toOfflineSessionResponse(session);
  }
}
