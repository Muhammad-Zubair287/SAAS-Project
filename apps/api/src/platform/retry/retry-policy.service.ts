import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RetryPolicyService {
  constructor(private readonly config: ConfigService) {}

  maxAttempts(): number {
    return this.config.get<number>('queue.defaultAttempts', 5);
  }

  baseDelayMs(): number {
    return this.config.get<number>('queue.retryDelayMs', 1000);
  }

  maxDelayMs(): number {
    return this.config.get<number>('queue.retryMaxDelayMs', 300000);
  }

  exponentialDelay(attempt: number): number {
    const base = this.baseDelayMs();
    const max = this.maxDelayMs();
    return Math.min(base * 2 ** Math.max(0, attempt - 1), max);
  }

  /** Exponential backoff with up to 25% random jitter (TSA / API contract). */
  delayWithJitter(attempt: number): number {
    const exponential = this.exponentialDelay(attempt);
    const jitter = Math.floor(Math.random() * exponential * 0.25);
    return exponential + jitter;
  }
}
