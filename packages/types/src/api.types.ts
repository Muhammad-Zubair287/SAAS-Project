export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: ResponseMeta;
  correlationId?: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: { code: string; message: string; details?: unknown };
  correlationId?: string;
  timestamp: string;
}

export type ApiResponse<T = unknown> =
  | ApiSuccessResponse<T>
  | ApiErrorResponse;

export interface ResponseMeta {
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  cursor?: string;
  nextCursor?: string;
}
