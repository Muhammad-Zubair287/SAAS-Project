import axios from 'axios';
import { ApiError } from './types';

/**
 * Shape the API rejects with. The backend wraps failures in an ApiErrorResponse
 * envelope; axios buries that at `error.response.data`, so without this the
 * caller only ever sees axios's own "Request failed with status code 400".
 */
interface ErrorEnvelope {
  error?: { code?: string; message?: string; details?: unknown };
  correlationId?: string;
  message?: string;
}

function readEnvelope(data: unknown): ErrorEnvelope | undefined {
  return data !== null && typeof data === 'object'
    ? (data as ErrorEnvelope)
    : undefined;
}

/**
 * Convert anything thrown by the api client into an ApiError.
 *
 * This also makes the `error instanceof ApiError` guard in providers.tsx live —
 * previously nothing constructed ApiError, so that check never matched and
 * every 4xx was retried twice.
 */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (axios.isAxiosError(error)) {
    if (axios.isCancel(error)) {
      return new ApiError('CANCELLED', 'Request cancelled');
    }

    const { response, config } = error;
    const correlationHeader = config?.headers?.['X-Correlation-ID'];
    const correlationId =
      typeof correlationHeader === 'string' ? correlationHeader : undefined;

    // No response at all — the request never completed.
    if (!response) {
      const isTimeout =
        error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
      return new ApiError(
        isTimeout ? 'TIMEOUT' : 'NETWORK',
        isTimeout
          ? 'The request timed out. Please try again.'
          : 'Unable to reach the server. Check your connection and try again.',
        undefined,
        undefined,
        correlationId,
      );
    }

    const envelope = readEnvelope(response.data);
    return new ApiError(
      envelope?.error?.code ?? `HTTP_${response.status}`,
      envelope?.error?.message ?? envelope?.message ?? error.message,
      envelope?.error?.details,
      response.status,
      envelope?.correlationId ?? correlationId,
    );
  }

  if (error instanceof Error) {
    return new ApiError('UNKNOWN', error.message);
  }

  return new ApiError('UNKNOWN', 'An unexpected error occurred');
}
