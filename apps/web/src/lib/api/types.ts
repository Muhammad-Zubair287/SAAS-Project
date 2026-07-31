export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: ResponseMeta;
  correlationId?: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
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

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortOrder?: 'asc' | 'desc';
  cursor?: string;
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
    public readonly statusCode?: number,
    public readonly correlationId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
