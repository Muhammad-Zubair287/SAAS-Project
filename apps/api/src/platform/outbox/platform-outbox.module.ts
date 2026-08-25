import { Global, Module } from '@nestjs/common';
import { ConsumerInboxRepository } from '../inbox/consumer-inbox.repository';
import { EventPublisherService } from './event-publisher.service';
import { OutboxDispatcherService } from './outbox-dispatcher.service';
import { OutboxRelayService } from './outbox-relay.service';
import { OutboxRepository } from './outbox.repository';

@Global()
@Module({
  providers: [
    OutboxRepository,
    ConsumerInboxRepository,
    EventPublisherService,
    OutboxDispatcherService,
    OutboxRelayService,
  ],
  exports: [
    OutboxRepository,
    ConsumerInboxRepository,
    EventPublisherService,
    OutboxDispatcherService,
    OutboxRelayService,
  ],
})
export class PlatformOutboxModule {}
