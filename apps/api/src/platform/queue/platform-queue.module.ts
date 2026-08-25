import { Global, Module } from '@nestjs/common';
import { QueueFactory } from './queue.factory';
import { QueueRegistrationService } from './queue-registration.service';
import { RedisService } from '../redis/redis.service';
import { RetryPolicyService } from '../retry/retry-policy.service';

@Global()
@Module({
  providers: [RedisService, RetryPolicyService, QueueFactory, QueueRegistrationService],
  exports: [RedisService, RetryPolicyService, QueueFactory, QueueRegistrationService],
})
export class PlatformQueueModule {}
