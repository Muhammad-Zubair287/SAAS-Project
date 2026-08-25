import { Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { ConsumerInboxRepository } from '../../../platform/inbox/consumer-inbox.repository';
import { DeadLetterService } from '../../../platform/dead-letter/dead-letter.service';
import { WorkerExecutionContextService } from '../../../platform/execution-context/worker-execution-context.service';
import type { EventEnvelope } from '../../../platform/outbox/event-envelope.interface';
import { PlatformMetricsService } from '../../../platform/telemetry/platform-metrics.service';
import { WorkerTelemetryService } from '../../../platform/telemetry/worker-telemetry.service';
import { AbstractConsumer } from '../../../platform/worker/abstract-consumer';
import { DeviceEventIngestService } from '../services/device-event-ingest.service';
import type { AttendanceEventReceivedPayload } from './attendance-outbox.consumer';
import { logWorkerExecution } from './attendance-worker-logging';

@Injectable()
export class AttendanceDuplicateDetectionWorker extends AbstractConsumer<AttendanceEventReceivedPayload> {
  protected readonly consumerName = 'attendance-duplicate-detection';
  private readonly logger = new Logger(AttendanceDuplicateDetectionWorker.name);

  constructor(
    inbox: ConsumerInboxRepository,
    context: WorkerExecutionContextService,
    telemetry: WorkerTelemetryService,
    metrics: PlatformMetricsService,
    deadLetter: DeadLetterService,
    private readonly deviceEventIngest: DeviceEventIngestService,
  ) {
    super(inbox, context, telemetry, metrics, deadLetter);
  }

  protected async handle(
    event: EventEnvelope<AttendanceEventReceivedPayload>,
    _job: Job<EventEnvelope<AttendanceEventReceivedPayload>>,
  ): Promise<void> {
    const startedAt = Date.now();
    const tenantId = event.tenantId;
    if (!tenantId) {
      throw new Error('Tenant context is required for duplicate detection');
    }

    const deviceEventId = event.payload.deviceEventId;
    if (!deviceEventId) {
      logWorkerExecution(this.logger, this.consumerName, event, startedAt, {
        status: 'skipped',
        detail: 'Missing deviceEventId in payload',
      });
      return;
    }

    const correlationId = event.correlationId ?? event.eventId;
    const result = await this.deviceEventIngest.processDuplicateDetection(
      tenantId,
      deviceEventId,
      correlationId,
    );

    if (result.isDuplicate) {
      logWorkerExecution(this.logger, this.consumerName, event, startedAt, {
        status: 'success',
        detail: 'Duplicate event marked',
      });
      return;
    }

    logWorkerExecution(this.logger, this.consumerName, event, startedAt, {
      status: 'success',
      detail: 'No duplicate detected',
    });
  }
}
