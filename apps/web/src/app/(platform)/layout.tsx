import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { PlatformShell } from '../../components/layout/platform-shell';
import { PLATFORM_NAV_ITEMS } from '../../modules/platform/constants/platform.constants';
import { ROUTES } from '../../constants/routes.constants';
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
  }));

  return (
    <PlatformShell navItems={navItems}>
      {children}
    </PlatformShell>
  );
}
