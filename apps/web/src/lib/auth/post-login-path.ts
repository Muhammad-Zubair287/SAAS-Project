import { ROUTES } from '../../constants/routes.constants';
import { sanitizeReturnTo } from './safe-return-to';

export function resolvePostLoginPath(
  user: { scope: string; permissions?: string[] },
  returnTo?: string | null,
): string {
  const permissions = user.permissions ?? [];
  const hasPermission = (permission: string) =>
    permissions.includes('*') || permissions.includes(permission);
  const shouldDefaultToEmployee =
    user.scope === 'tenant' &&
    hasPermission('ess.dashboard.read') &&
    !hasPermission('hr.dashboard.read') &&
    !hasPermission('read:tenant_profile:tenant');
  const fallback =
    user.scope === 'platform'
      ? ROUTES.PLATFORM.DASHBOARD
      : shouldDefaultToEmployee
        ? ROUTES.EMPLOYEE.DASHBOARD
        : ROUTES.TENANT.DASHBOARD;
  return sanitizeReturnTo(returnTo, fallback);
}
