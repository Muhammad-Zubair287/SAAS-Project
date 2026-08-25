import { UnrecoverableError, type Job } from 'bullmq';
import { ConsumerInboxStatus } from '@prisma/client';
import { ConsumerInboxRepository } from '../inbox/consumer-inbox.repository';
import type { EventEnvelope } from '../outbox/event-envelope.interface';
import { DeadLetterService } from '../dead-letter/dead-letter.service';
import { WorkerExecutionContextService } from '../execution-context/worker-execution-context.service';
import { PlatformMetricsService } from '../telemetry/platform-metrics.service';
import { WorkerTelemetryService } from '../telemetry/worker-telemetry.service';

export abstract class AbstractConsumer<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  protected abstract readonly consumerName: string;

  constructor(
    private readonly inbox: ConsumerInboxRepository,
    private readonly context: WorkerExecutionContextService,
    private readonly telemetry: WorkerTelemetryService,
    private readonly metrics: PlatformMetricsService,
    private readonly deadLetter: DeadLetterService,
  ) {}

  async process(job: Job<EventEnvelope<TPayload>>): Promise<void> {
    const event = job.data;
    const inbox = await this.inbox.claim(event.eventId, this.consumerName, event.tenantId);
    if (inbox.status === ConsumerInboxStatus.PROCESSED) return;

    const startedAt = Date.now();
    try {
      await this.telemetry.trace(this.consumerName, event, () =>
        this.context.execute(event, () => this.handle(event, job)),
      );
      await this.inbox.complete(inbox.id);
      this.metrics.increment('worker.jobs.succeeded');
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      const exhausted = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
      await this.inbox.fail(inbox.id, error, exhausted);
      this.metrics.increment(exhausted ? 'worker.jobs.dead_lettered' : 'worker.jobs.failed');
      if (exhausted) {
        await this.deadLetter.publish(this.consumerName, event, error);
        throw new UnrecoverableError(error.message);
      }
      throw error;
    } finally {
      this.metrics.observe('worker.jobs.duration_ms', Date.now() - startedAt);
    }
  }

  protected abstract handle(
    event: EventEnvelope<TPayload>,
    job: Job<EventEnvelope<TPayload>>,
  ): Promise<void>;
}
