'use client';

import type { ReactNode } from 'react';
import { usePermissions } from './use-permissions';

interface PermissionGateProps {
  children: ReactNode;
  /** Single permission or list (ANY match). */
  permission: string | string[];
  mode?: 'hide' | 'disable';
  fallback?: ReactNode;
}

/**
 * UX-only gate. Backend PermissionGuard remains authoritative.
 */
export function PermissionGate({
  children,
  permission,
  mode = 'hide',
  fallback = null,
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission } = usePermissions();
  const allowed = Array.isArray(permission)
    ? hasAnyPermission(permission)
    : hasPermission(permission);

  if (allowed) return <>{children}</>;

  if (mode === 'disable') {
    return (
      <div className="pointer-events-none opacity-50" aria-disabled="true">
        {children}
      </div>
    );
  }

  return <>{fallback}</>;
}
