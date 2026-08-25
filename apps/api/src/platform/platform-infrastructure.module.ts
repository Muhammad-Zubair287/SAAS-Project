import { Global, Module } from '@nestjs/common';
import { PlatformOutboxModule } from './outbox/platform-outbox.module';
import { PlatformQueueModule } from './queue/platform-queue.module';
import { PlatformWorkerModule } from './worker/platform-worker.module';

@Global()
@Module({
  imports: [PlatformQueueModule, PlatformOutboxModule, PlatformWorkerModule],
  exports: [PlatformQueueModule, PlatformOutboxModule, PlatformWorkerModule],
})
export class PlatformInfrastructureModule {}
