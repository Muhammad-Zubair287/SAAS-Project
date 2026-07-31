// The request-scoped user context attached to request.user by JwtStrategy
// and extracted by the @CurrentUser() decorator in authenticated routes.
// effectivePermissions and resolvedRoles are populated lazily by PermissionGuard
// when @RequirePermissions() is present; otherwise they remain empty arrays.
export interface CurrentUserContext {
  userId: string;
  tenantId: string | null;
  email: string;
  roles: string[];
  permissions: string[];
  effectivePermissions: string[];
  resolvedRoles: string[];
  scope: string;
  platformRole: string | null;
  sessionId: string;
}
