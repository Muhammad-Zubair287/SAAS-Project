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
import { AttendanceEventService } from '../services/attendance-event.service';
import { DeviceEventIngestService } from '../services/device-event-ingest.service';
import type { AttendanceEventReceivedPayload } from './attendance-outbox.consumer';
import { logWorkerExecution } from './attendance-worker-logging';

@Injectable()
export class AttendanceEventValidationWorker extends AbstractConsumer<AttendanceEventReceivedPayload> {
  protected readonly consumerName = 'attendance-event-validation';
  private readonly logger = new Logger(AttendanceEventValidationWorker.name);

  constructor(
    inbox: ConsumerInboxRepository,
    context: WorkerExecutionContextService,
    telemetry: WorkerTelemetryService,
    metrics: PlatformMetricsService,
    deadLetter: DeadLetterService,
    private readonly deviceEventIngest: DeviceEventIngestService,
    private readonly attendanceEvents: AttendanceEventService,
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
      throw new Error('Tenant context is required for attendance event validation');
    }

    const deviceEventId = event.payload.deviceEventId;
    const rawEventId = event.payload.rawEventId;
    const correlationId = event.correlationId ?? event.eventId;

    if (!deviceEventId) {
      logWorkerExecution(this.logger, this.consumerName, event, startedAt, {
        status: 'skipped',
        detail: 'Missing deviceEventId in payload',
      });
      return;
    }

    const result = await this.deviceEventIngest.processReceivedEventValidation(
      tenantId,
      deviceEventId,
      correlationId,
    );

    if (!result.validated) {
      logWorkerExecution(this.logger, this.consumerName, event, startedAt, {
        status: 'failed',
        detail: 'Event validation rejected',
      });
      return;
    }

    if (rawEventId) {
      await this.attendanceEvents.processRawEventCalculation(tenantId, rawEventId, correlationId);
    }

    logWorkerExecution(this.logger, this.consumerName, event, startedAt, {
      status: 'success',
      detail: rawEventId ? 'Validated and calculated' : 'Validated',
    });
  }
}
