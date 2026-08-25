import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { toApiError } from './errors';
import { tokenStore } from '../auth/token-store';

const API_BASE_URL =
  process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1';

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<string | null> | null = null;

type SessionExpiredHandler = () => void;
let onSessionExpired: SessionExpiredHandler | null = null;

export function setSessionExpiredHandler(handler: SessionExpiredHandler | null): void {
  onSessionExpired = handler;
}

async function performRefresh(client: AxiosInstance): Promise<string | null> {
  try {
    const response = await client.post(
      '/auth/refresh',
      {},
      {
        // Avoid interceptor recursion on the refresh call itself
        headers: { 'X-Skip-Auth-Refresh': '1' },
      },
    );
    const body = response.data as
      | { success: true; data: { accessToken: string } }
      | { accessToken: string };
    const accessToken =
      body && typeof body === 'object' && 'success' in body && body.success
        ? body.data.accessToken
        : (body as { accessToken: string }).accessToken;
    if (!accessToken) {
      tokenStore.clearAccessToken();
      return null;
    }
    tokenStore.setAccessToken(accessToken);
    return accessToken;
  } catch {
    tokenStore.clearAccessToken();
    return null;
  }
}

function singleFlightRefresh(client: AxiosInstance): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = performRefresh(client).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function createApiClient(config?: AxiosRequestConfig): AxiosInstance {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30_000,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    ...config,
  });

  client.interceptors.request.use((request) => {
    if (!request.headers['X-Correlation-ID']) {
      request.headers['X-Correlation-ID'] = uuidv4();
    }
    if (
      ['post', 'put', 'patch'].includes(request.method?.toLowerCase() ?? '') &&
      !request.headers['Idempotency-Key']
    ) {
      request.headers['Idempotency-Key'] = uuidv4();
    }

    const token = tokenStore.getAccessToken();
    if (token && !request.headers.Authorization) {
      request.headers.Authorization = `Bearer ${token}`;
    }
    return request;
  });

  client.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: unknown) => {
      if (!axios.isAxiosError(error)) {
        return Promise.reject(toApiError(error));
      }

      const axiosError = error as AxiosError;
      const original = axiosError.config as RetriableConfig | undefined;
      const status = axiosError.response?.status;
      const skipRefresh = original?.headers?.['X-Skip-Auth-Refresh'] === '1';
      const url = original?.url ?? '';
      const isAuthPublic =
        url.includes('/auth/login') ||
        url.includes('/auth/refresh') ||
        url.includes('/auth/password-reset') ||
        url.includes('/auth/invitations/accept') ||
        url.includes('/auth/mfa/challenge') ||
        url.includes('/auth/logout');

      if (
        status === 401 &&
        original &&
        !original._retry &&
        !skipRefresh &&
        !isAuthPublic &&
        !tokenStore.isLoggingOut()
      ) {
        original._retry = true;
        const newToken = await singleFlightRefresh(client);
        if (newToken) {
          original.headers = original.headers ?? {};
          original.headers.Authorization = `Bearer ${newToken}`;
          return client.request(original);
        }
        onSessionExpired?.();
      }

      return Promise.reject(toApiError(error));
    },
  );

  return client;
}

export const apiClient = createApiClient();

/** Exposed for AuthProvider bootstrap — shares the same single-flight queue. */
export function refreshAccessToken(): Promise<string | null> {
  return singleFlightRefresh(apiClient);
}

export type { AxiosInstance, AxiosResponse };
