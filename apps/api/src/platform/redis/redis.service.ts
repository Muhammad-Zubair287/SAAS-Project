import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('REDIS');
  private client!: IORedis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const maxDelay = this.config.get<number>('redis.maxReconnectDelayMs', 30000);
    this.client = new IORedis({
      host: this.config.getOrThrow<string>('redis.host'),
      port: this.config.getOrThrow<number>('redis.port'),
      password: this.config.get<string>('redis.password'),
      db: this.config.get<number>('redis.database', 0),
      tls: this.config.get<boolean>('redis.tls') ? {} : undefined,
      maxRetriesPerRequest: null,
      retryStrategy: (attempt) => Math.min(attempt * 250, maxDelay),
    });
    this.client.on('ready', () => this.logger.log('Redis connected'));
    this.client.on('error', (error: Error) =>
      this.logger.error('Redis connection error', error.stack),
    );
  }

  get connection(): IORedis {
    return this.client;
  }

  async ping(): Promise<void> {
    await this.client.ping();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.quit();
  }
}
