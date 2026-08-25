import { apiClient } from '../../../lib/api/client';
import type { ApiSuccessResponse } from '../../../lib/api/types';
import type {
  AcceptInvitationPayload,
  AuthTokenResponse,
  LoginPayload,
  LoginResult,
  MfaChallengePayload,
  ResetPasswordPayload,
  SessionUser,
} from '../types/auth.types';

function unwrap<T>(response: { data: ApiSuccessResponse<T> | T }): T {
  const body = response.data as ApiSuccessResponse<T> | T;
  if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
    return (body as ApiSuccessResponse<T>).data;
  }
  return body as T;
}

export const authApi = {
  login: (payload: LoginPayload) =>
    apiClient
      .post<ApiSuccessResponse<LoginResult>>('/auth/login', payload)
      .then(unwrap),

  refresh: () =>
    apiClient
      .post<ApiSuccessResponse<AuthTokenResponse>>('/auth/refresh', {})
      .then(unwrap),

  logout: () => apiClient.post('/auth/logout'),

  me: () =>
    apiClient.get<ApiSuccessResponse<SessionUser>>('/auth/me').then(unwrap),

  requestPasswordReset: (email: string) =>
    apiClient.post('/auth/password-reset/request', { email }),

  confirmPasswordReset: (payload: ResetPasswordPayload) =>
    apiClient.post('/auth/password-reset/confirm', payload),

  acceptInvitation: (payload: AcceptInvitationPayload) =>
    apiClient
      .post<ApiSuccessResponse<AuthTokenResponse>>('/auth/invitations/accept', payload)
      .then(unwrap),

  completeMfaChallenge: (payload: MfaChallengePayload) =>
    apiClient
      .post<ApiSuccessResponse<AuthTokenResponse>>('/auth/mfa/challenge', payload)
      .then(unwrap),
};
