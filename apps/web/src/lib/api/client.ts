import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios';
import { v4 as uuidv4 } from 'uuid';

const API_BASE_URL =
  process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1';

function createApiClient(config?: AxiosRequestConfig): AxiosInstance {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30_000,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    ...config,
  });

  // Attach correlation ID and idempotency key on every mutating request
  client.interceptors.request.use((request) => {
    if (!request.headers['X-Correlation-ID']) {
      request.headers['X-Correlation-ID'] = uuidv4();
    }
    if (
      ['post', 'put', 'patch'].includes(
        request.method?.toLowerCase() ?? '',
      ) &&
      !request.headers['Idempotency-Key']
    ) {
      request.headers['Idempotency-Key'] = uuidv4();
    }
    return request;
  });

  // Pass through responses unchanged — callers unwrap the ApiResponse envelope
  client.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: unknown) => Promise.reject(error),
  );

  return client;
}

export const apiClient = createApiClient();

export type { AxiosInstance, AxiosResponse };
