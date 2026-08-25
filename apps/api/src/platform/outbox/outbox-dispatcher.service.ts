import { Injectable } from '@nestjs/common';
import type { OutboxEvent } from '@prisma/client';
import { EventPublisherService } from './event-publisher.service';

@Injectable()
export class OutboxDispatcherService {
  constructor(private readonly publisher: EventPublisherService) {}

  dispatch(event: OutboxEvent): Promise<void> {
    return this.publisher.publish(event);
  }
}
