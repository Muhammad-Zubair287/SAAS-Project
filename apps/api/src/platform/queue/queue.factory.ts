import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, type JobsOptions } from 'bullmq';
import { RedisService } from '../redis/redis.service';
import { RetryPolicyService } from '../retry/retry-policy.service';

@Injectable()
export class QueueFactory implements OnModuleDestroy {
  private readonly queues = new Map<string, Queue>();

  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    private readonly retryPolicy: RetryPolicyService,
  ) {}

  get(name: string): Queue {
    const current = this.queues.get(name);
    if (current) return current;
    const queue = new Queue(name, {
      connection: this.redis.connection,
      defaultJobOptions: this.defaultJobOptions(),
    });
    this.queues.set(name, queue);
    return queue;
  }

  registeredNames(): string[] {
    return [...this.queues.keys()];
  }

  defaultJobOptions(): JobsOptions {
    return {
      attempts: this.retryPolicy.maxAttempts(),
      backoff: { type: 'custom' },
      removeOnComplete: 1000,
      removeOnFail: false,
    };
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([...this.queues.values()].map((queue) => queue.close()));
  }
}
