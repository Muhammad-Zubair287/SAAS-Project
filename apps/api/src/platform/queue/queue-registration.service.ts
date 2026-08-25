import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueFactory } from './queue.factory';
import { PlatformMetricsService } from '../telemetry/platform-metrics.service';

@Injectable()
export class QueueRegistrationService implements OnModuleInit {
  private readonly logger = new Logger('QUEUE');

  constructor(
    private readonly queues: QueueFactory,
    private readonly config: ConfigService,
    private readonly metrics: PlatformMetricsService,
  ) {}

  onModuleInit(): void {
    const names = [
      this.config.getOrThrow<string>('queue.eventQueueName'),
      this.config.getOrThrow<string>('queue.deadLetterQueueName'),
    ];
    for (const name of names) {
      this.queues.get(name);
      this.metrics.increment('queue.registered');
      this.logger.log(`${name} ready`);
    }
  }
}
