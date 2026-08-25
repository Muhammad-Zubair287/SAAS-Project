import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { OutboxEvent } from '@prisma/client';
import { QueueFactory } from '../queue/queue.factory';
import type { EventEnvelope } from './event-envelope.interface';

@Injectable()
export class EventPublisherService {
  constructor(
    private readonly queues: QueueFactory,
    private readonly config: ConfigService,
  ) {}

  async publish(event: OutboxEvent): Promise<void> {
    const payload = event.payload as Record<string, unknown>;
    const envelope: EventEnvelope = {
      eventId: event.eventId,
      eventType: event.eventType,
      tenantId: event.tenantId,
      correlationId:
        typeof payload['correlationId'] === 'string' ? payload['correlationId'] : undefined,
      causationId:
        typeof payload['causationId'] === 'string' ? payload['causationId'] : undefined,
      occurredAt: event.createdAt.toISOString(),
      payload,
    };
    const queue = this.queues.get(this.config.getOrThrow<string>('queue.eventQueueName'));
    await queue.add(this.config.getOrThrow<string>('queue.eventJobName'), envelope, {
      jobId: event.eventId,
    });
  }
}
