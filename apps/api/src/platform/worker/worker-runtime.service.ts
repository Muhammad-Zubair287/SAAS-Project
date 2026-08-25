import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { Worker, type Processor } from 'bullmq';
import { RedisService } from '../redis/redis.service';
import { RetryPolicyService } from '../retry/retry-policy.service';

@Injectable()
export class WorkerRuntimeService implements OnModuleDestroy {
  private readonly logger = new Logger(WorkerRuntimeService.name);
  private readonly workers = new Map<string, Worker>();
  private shuttingDown = false;

  constructor(
    private readonly redis: RedisService,
    private readonly retryPolicy: RetryPolicyService,
  ) {}

  register<T>(queueName: string, processor: Processor<T>): Worker<T> {
    const existing = this.workers.get(queueName) as Worker<T> | undefined;
    if (existing) return existing;

    const worker = new Worker<T>(queueName, processor, {
      connection: this.redis.connection,
      settings: {
        backoffStrategy: (attemptsMade: number) =>
          this.retryPolicy.delayWithJitter(attemptsMade + 1),
      },
    });

    worker.on('error', (error: Error) =>
      this.logger.error(`Queue worker ${queueName} failed`, error.stack),
    );

    this.workers.set(queueName, worker);
    this.logger.debug(`Worker registered for queue: ${queueName}`);
    return worker;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.shuttingDown) return;
    this.shuttingDown = true;
    this.logger.log('Gracefully shutting down platform workers');
    await Promise.all([...this.workers.values()].map((worker) => worker.close()));
  }
}
