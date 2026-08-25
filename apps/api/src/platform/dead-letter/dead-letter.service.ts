import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueFactory } from '../queue/queue.factory';
import type { EventEnvelope } from '../outbox/event-envelope.interface';

@Injectable()
export class DeadLetterService {
  constructor(
    private readonly queues: QueueFactory,
    private readonly config: ConfigService,
  ) {}

  async publish(
    consumerName: string,
    event: EventEnvelope,
    error: Error,
  ): Promise<void> {
    const queue = this.queues.get(this.config.getOrThrow<string>('queue.deadLetterQueueName'));
    await queue.add(
      this.config.getOrThrow<string>('queue.deadLetterJobName'),
      { consumerName, event, error: error.message },
      { jobId: `${event.eventId}-${consumerName}` },
    );
  }
}
