'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../auth/auth-provider';
import { LoadingSpinner } from '../../components/feedback/loading-spinner';
import { buildLoginHref, sanitizeReturnTo } from '../auth/safe-return-to';
import { ROUTES } from '../../constants/routes.constants';

interface AuthGateProps {
  children: ReactNode;
  /** Required session scope. */
  scope?: 'tenant' | 'platform';
  /** When true, only guests may view (auth routes). */
  guestOnly?: boolean;
}

export function AuthGate({ children, scope, guestOnly = false }: AuthGateProps) {
  const { status, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'loading') return;

    if (guestOnly) {
      if (status === 'authenticated' && user) {
        // Honor safe returnTo so post-login deep-links are not raced to dashboard.
        const returnTo =
          typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get('returnTo')
            : null;
        router.replace(resolvePostLoginPath(user, returnTo));
      }
      return;
    }

    if (status !== 'authenticated' || !user) {
      router.replace(buildLoginHref(pathname));
      return;
    }

    if (scope === 'tenant' && user.scope !== 'tenant') {
      router.replace(ROUTES.PLATFORM.DASHBOARD);
      return;
    }

    if (scope === 'platform' && user.scope !== 'platform') {
      router.replace(ROUTES.AUTH.FORBIDDEN);
    }
  }, [status, user, guestOnly, scope, router, pathname]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-canvas">
        <LoadingSpinner />
      </div>
    );
  }

  if (guestOnly) {
    if (status === 'authenticated') return null;
    return <>{children}</>;
  }

  if (status !== 'authenticated' || !user) return null;
  if (scope === 'tenant' && user.scope !== 'tenant') return null;
  if (scope === 'platform' && user.scope !== 'platform') return null;

  return <>{children}</>;
}

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
