import { Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { ConsumerInboxRepository } from '../../../platform/inbox/consumer-inbox.repository';
import { DeadLetterService } from '../../../platform/dead-letter/dead-letter.service';
import { WorkerExecutionContextService } from '../../../platform/execution-context/worker-execution-context.service';
import type { EventEnvelope } from '../../../platform/outbox/event-envelope.interface';
import { PlatformMetricsService } from '../../../platform/telemetry/platform-metrics.service';
import { WorkerTelemetryService } from '../../../platform/telemetry/worker-telemetry.service';
import { AbstractConsumer } from '../../../platform/worker/abstract-consumer';
import { OfflineQueueService } from '../services/offline-queue.service';
import type { OfflineReplayRequestedPayload } from './attendance-outbox.consumer';
import { logWorkerExecution } from './attendance-worker-logging';

@Injectable()
export class AttendanceOfflineReplayWorker extends AbstractConsumer<OfflineReplayRequestedPayload> {
  protected readonly consumerName = 'attendance-offline-replay';
  private readonly logger = new Logger(AttendanceOfflineReplayWorker.name);

  constructor(
    inbox: ConsumerInboxRepository,
    context: WorkerExecutionContextService,
    telemetry: WorkerTelemetryService,
    metrics: PlatformMetricsService,
    deadLetter: DeadLetterService,
    private readonly offlineQueue: OfflineQueueService,
  ) {
    super(inbox, context, telemetry, metrics, deadLetter);
  }

  protected async handle(
    event: EventEnvelope<OfflineReplayRequestedPayload>,
    _job: Job<EventEnvelope<OfflineReplayRequestedPayload>>,
  ): Promise<void> {
    const startedAt = Date.now();
    const tenantId = event.tenantId;
    if (!tenantId) {
      throw new Error('Tenant context is required for offline replay');
    }

    const sessionId = event.payload.sessionId;
    if (!sessionId) {
      logWorkerExecution(this.logger, this.consumerName, event, startedAt, {
        status: 'skipped',
        detail: 'Missing sessionId in payload',
      });
      return;
    }

    const correlationId = event.correlationId ?? event.eventId;
    const actorId = event.payload.actorId ?? 'SYSTEM';
    const actorEmail = event.payload.actorEmail ?? 'system@workforce-cloud-os';

    const result = await this.offlineQueue.executeOfflineReplay(
      sessionId,
      tenantId,
      actorId,
      actorEmail,
      correlationId,
    );

    logWorkerExecution(this.logger, this.consumerName, event, startedAt, {
      status: 'success',
      detail: `Replayed ${result.successCount}/${result.processedCount} events`,
    });
  }
}
