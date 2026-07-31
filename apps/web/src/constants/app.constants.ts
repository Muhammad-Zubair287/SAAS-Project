export const APP_CONSTANTS = {
  APP_NAME: process.env['NEXT_PUBLIC_APP_NAME'] ?? 'Workforce Cloud OS',
  APP_VERSION: process.env['NEXT_PUBLIC_APP_VERSION'] ?? '0.1.0',
  DEFAULT_LOCALE: 'en',
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  QUERY_STALE_TIME_MS: 5 * 60 * 1_000,
  QUERY_GC_TIME_MS: 10 * 60 * 1_000,
} as const;
