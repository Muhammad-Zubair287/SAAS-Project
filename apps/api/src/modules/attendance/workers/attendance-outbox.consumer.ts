import { Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { ConsumerInboxRepository } from '../../../platform/inbox/consumer-inbox.repository';
import { DeadLetterService } from '../../../platform/dead-letter/dead-letter.service';
import { WorkerExecutionContextService } from '../../../platform/execution-context/worker-execution-context.service';
import type { EventEnvelope } from '../../../platform/outbox/event-envelope.interface';
import { PlatformMetricsService } from '../../../platform/telemetry/platform-metrics.service';
import { WorkerTelemetryService } from '../../../platform/telemetry/worker-telemetry.service';
import { AbstractConsumer } from '../../../platform/worker/abstract-consumer';
import { ATTENDANCE_EVENTS } from '../constants/attendance-events.constants';
import { AttendanceDuplicateDetectionWorker } from './attendance-duplicate-detection.worker';
import { AttendanceEventValidationWorker } from './attendance-event-validation.worker';
import { AttendanceOfflineReplayWorker } from './attendance-offline-replay.worker';
import { AttendanceDeviceHealthWorker } from './attendance-device-health.worker';
import { logWorkerExecution } from './attendance-worker-logging';

interface AttendanceEventReceivedPayload extends Record<string, unknown> {
  deviceEventId?: string;
  rawEventId?: string;
  employeeId?: string;
  eventType?: string;
  source?: string;
}

interface OfflineReplayRequestedPayload extends Record<string, unknown> {
  sessionId?: string;
  actorId?: string;
  actorEmail?: string;
}

interface DeviceHeartbeatPayload extends Record<string, unknown> {
  deviceId?: string;
  health?: string;
  cpu?: number;
  memory?: number;
  disk?: number;
  queueLength?: number;
}

interface DeviceHealthScanPayload extends Record<string, unknown> {
  tenantId?: string;
}

@Injectable()
export class AttendanceOutboxConsumer extends AbstractConsumer {
  protected readonly consumerName = 'attendance-outbox-consumer';
  private readonly logger = new Logger(AttendanceOutboxConsumer.name);

  constructor(
    inbox: ConsumerInboxRepository,
    context: WorkerExecutionContextService,
    telemetry: WorkerTelemetryService,
    metrics: PlatformMetricsService,
    deadLetter: DeadLetterService,
    private readonly duplicateDetectionWorker: AttendanceDuplicateDetectionWorker,
    private readonly eventValidationWorker: AttendanceEventValidationWorker,
    private readonly offlineReplayWorker: AttendanceOfflineReplayWorker,
    private readonly deviceHealthWorker: AttendanceDeviceHealthWorker,
  ) {
    super(inbox, context, telemetry, metrics, deadLetter);
  }

  protected async handle(
    event: EventEnvelope,
    job: Job<EventEnvelope>,
  ): Promise<void> {
    const startedAt = Date.now();

    switch (event.eventType) {
      case ATTENDANCE_EVENTS.ATTENDANCE_EVENT_RECEIVED:
        await this.duplicateDetectionWorker.process(job);
        await this.eventValidationWorker.process(job);
        break;
      case ATTENDANCE_EVENTS.OFFLINE_REPLAY_REQUESTED:
        await this.offlineReplayWorker.process(job);
        break;
      case ATTENDANCE_EVENTS.ATTENDANCE_DEVICE_HEARTBEAT:
      case ATTENDANCE_EVENTS.DEVICE_HEALTH_SCAN_REQUESTED:
        await this.deviceHealthWorker.process(job);
        break;
      case ATTENDANCE_EVENTS.ATTENDANCE_RECORD_CALCULATED:
      case ATTENDANCE_EVENTS.ATTENDANCE_EXCEPTION_RAISED:
      case ATTENDANCE_EVENTS.DEVICE_HEALTH_CHANGED:
        // Outbound domain notifications — already produced after attendance work.
        // Ack/observe only; do not reprocess (avoids health-scan republish loops).
        logWorkerExecution(this.logger, this.consumerName, event, startedAt, {
          status: 'success',
          detail: `Observed ${event.eventType}`,
        });
        break;
      case ATTENDANCE_EVENTS.DUPLICATE_DETECTION_REQUESTED:
        await this.duplicateDetectionWorker.process(job);
        break;
      default:
        logWorkerExecution(this.logger, this.consumerName, event, startedAt, {
          status: 'skipped',
          detail: `Unhandled attendance event type: ${event.eventType}`,
        });
    }
  }
}

export type {
  AttendanceEventReceivedPayload,
  OfflineReplayRequestedPayload,
  DeviceHeartbeatPayload,
  DeviceHealthScanPayload,
};
