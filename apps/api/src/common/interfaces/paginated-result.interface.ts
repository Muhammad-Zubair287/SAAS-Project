import type { ResponseMeta } from './api-response.interface';

export interface PaginatedResult<T> {
  items: T[];
  meta: ResponseMeta;
}

export interface CursorPaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}
