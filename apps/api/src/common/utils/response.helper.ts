import type {
  ApiSuccessResponse,
  ResponseMeta,
} from '../interfaces/api-response.interface';

export function createSuccessResponse<T>(
  data: T,
  correlationId?: string,
  meta?: ResponseMeta,
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    ...(meta !== undefined ? { meta } : {}),
    ...(correlationId !== undefined ? { correlationId } : {}),
    timestamp: new Date().toISOString(),
  };
}

export function createPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
  correlationId?: string,
): ApiSuccessResponse<T[]> {
  const totalPages = Math.ceil(total / pageSize);
  return createSuccessResponse(items, correlationId, {
    page,
    pageSize,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  });
}
