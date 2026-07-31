export interface JwtPayload {
  sub: string;
  tenantId?: string;
  email: string;
  roles: string[];
  scope: string;
  sessionId: string;
  platformRole?: string | null;
  iat?: number;
  exp?: number;
}
