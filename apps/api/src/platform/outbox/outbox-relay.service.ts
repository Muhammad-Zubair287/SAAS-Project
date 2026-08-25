import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OutboxDispatcherService } from './outbox-dispatcher.service';
import { OutboxRepository } from './outbox.repository';
import { RetryPolicyService } from '../retry/retry-policy.service';
import { PlatformMetricsService } from '../telemetry/platform-metrics.service';

@Injectable()
export class OutboxRelayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxRelayService.name);
  private timer?: NodeJS.Timeout;
  private active = false;

  constructor(
    private readonly outbox: OutboxRepository,
    private readonly dispatcher: OutboxDispatcherService,
    private readonly retryPolicy: RetryPolicyService,
    private readonly metrics: PlatformMetricsService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    if (!this.config.get<boolean>('queue.outboxRelayEnabled', true)) return;
    const interval = this.config.get<number>('queue.outboxRelayIntervalMs', 5000);
    this.timer = setInterval(() => void this.relay(), interval);
    void this.relay();
  }

  async relay(): Promise<void> {
    if (this.active) return;
    this.active = true;
    try {
      const events = await this.outbox.findDispatchable(
        this.config.get<number>('queue.outboxRelayBatchSize', 100),
      );
      this.metrics.increment('outbox.relay.batch_size', events.length);
      for (const event of events) {
        try {
          await this.dispatcher.dispatch(event);
          await this.outbox.markPublished(event.id);
          this.metrics.increment('outbox.relay.published');
        } catch (error) {
          const failure = error instanceof Error ? error : new Error(String(error));
          const attempts = event.attempts + 1;
          const deadLetter = attempts >= this.retryPolicy.maxAttempts();
          await this.outbox.recordFailure(event.id, failure, deadLetter);
          this.metrics.increment(deadLetter ? 'outbox.relay.dead_lettered' : 'outbox.relay.failed');
          this.logger.error(`Outbox event ${event.eventId} dispatch failed`, failure.stack);
        }
      }
    } finally {
      this.active = false;
    }
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
}
