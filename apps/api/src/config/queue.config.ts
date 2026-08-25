import { registerAs } from '@nestjs/config';

export const queueConfig = registerAs('queue', () => ({
  defaultAttempts: parseInt(process.env['QUEUE_DEFAULT_ATTEMPTS'] ?? '5', 10),
  retryDelayMs: parseInt(process.env['QUEUE_RETRY_DELAY_MS'] ?? '1000', 10),
  retryMaxDelayMs: parseInt(process.env['QUEUE_RETRY_MAX_DELAY_MS'] ?? '300000', 10),
  eventQueueName: process.env['QUEUE_EVENT_NAME'] ?? 'platform-domain-events',
  eventJobName: process.env['QUEUE_EVENT_JOB_NAME'] ?? 'domain-event',
  deadLetterQueueName: process.env['QUEUE_DEAD_LETTER_NAME'] ?? 'platform-dead-letter',
  deadLetterJobName: process.env['QUEUE_DEAD_LETTER_JOB_NAME'] ?? 'dead-letter-event',
  outboxRelayIntervalMs: parseInt(process.env['OUTBOX_RELAY_INTERVAL_MS'] ?? '5000', 10),
  outboxRelayBatchSize: parseInt(process.env['OUTBOX_RELAY_BATCH_SIZE'] ?? '100', 10),
  outboxRelayEnabled: (process.env['OUTBOX_RELAY_ENABLED'] ?? 'true') === 'true',
}));
