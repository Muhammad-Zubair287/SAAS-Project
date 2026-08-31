export interface SessionUser {
  userId: string;
  email: string;
  displayName: string;
  tenantId: string | null;
  scope: 'tenant' | 'platform' | string;
  platformRole: string | null;
  roles: string[];
  permissions: string[];
  sessionId: string;
  mfaEnabled: boolean;
}

export interface AuthTokenResponse {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn: number;
  sessionId: string;
}

export interface InvitationAcceptResponse extends AuthTokenResponse {
  tenantSlug: string;
  tenantLoginPath: string;
}

export interface MfaChallengeResult {
  mfaRequired: true;
  challengeToken: string;
}

export type LoginResult = AuthTokenResponse | MfaChallengeResult;

export interface LoginPayload {
  email: string;
  password: string;
  /** API/script path — prefer tenantSlug for browser tenant login. */
  tenantId?: string;
  /** Public tenant slug from /t/{slug}/login. */
  tenantSlug?: string;
}

export interface AcceptInvitationPayload {
  token: string;
  password: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

export interface MfaChallengePayload {
  challengeToken: string;
  code: string;
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';
