export const APP_CONSTANTS = {
  CORRELATION_ID_HEADER: 'x-correlation-id',
  TENANT_ID_HEADER: 'x-tenant-id',
  IDEMPOTENCY_KEY_HEADER: 'idempotency-key',
  IF_MATCH_HEADER: 'if-match',
  ETAG_HEADER: 'etag',
  API_VERSION: 'v1',
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 1,
  DEFAULT_PAGE: 1,
} as const;

export const METADATA_KEYS = {
  SKIP_RESPONSE_TRANSFORM: 'skip_response_transform',
  IS_PUBLIC: 'is_public',
} as const;
