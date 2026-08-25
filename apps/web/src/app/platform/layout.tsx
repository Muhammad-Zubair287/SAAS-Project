import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { PlatformShell } from '../../components/layout/platform-shell';
import { AuthGate } from '../../lib/auth/auth-gate';
import { PLATFORM_NAV_ITEMS } from '../../modules/platform/constants/platform.constants';
import type { NavItem } from '../../components/layout/sidebar-nav';

interface PlatformLayoutProps {
  children: ReactNode;
}

export default async function PlatformLayout({ children }: PlatformLayoutProps) {
  const t = await getTranslations();

  const navItems: NavItem[] = PLATFORM_NAV_ITEMS.map((item) => ({
    key: item.key,
    label: t(item.labelKey as Parameters<typeof t>[0]),
    href: item.href,
    status: item.status,
    permission: 'permission' in item ? item.permission : undefined,
    children:
      'children' in item && item.children
        ? item.children.map((child) => ({
            key: child.key,
            label: t(child.labelKey as Parameters<typeof t>[0]),
            href: child.href,
            status: 'available' as const,
          }))
        : undefined,
  }));

  return (
    <AuthGate scope="platform">
      <PlatformShell navItems={navItems}>{children}</PlatformShell>
    </AuthGate>
  );
}
