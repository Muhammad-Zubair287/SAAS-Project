'use client';

import { useAuth } from '../auth/auth-provider';

export function usePermissions() {
  const { user, status, hasPermission, hasAnyPermission } = useAuth();

  return {
    status,
    permissions: user?.permissions ?? [],
    roles: user?.roles ?? [],
    hasPermission,
    hasAnyPermission,
    can: hasPermission,
  };
}
