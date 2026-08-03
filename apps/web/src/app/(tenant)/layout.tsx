import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { TenantShell } from '../../components/layout/tenant-shell';
import { TENANT_NAV_ITEMS } from '../../modules/organisation/constants/organisation.constants';
import type { NavItem } from '../../components/layout/sidebar-nav';

interface TenantLayoutProps {
  children: ReactNode;
}

export default async function TenantLayout({ children }: TenantLayoutProps) {
  const t = await getTranslations();

  interface RawNavItem {
    key: string;
    labelKey: string;
    href: string;
    status: string;
    children?: readonly RawNavItem[];
  }

  const toNavItem = (item: RawNavItem): NavItem => ({
    key: item.key,
    label: t(item.labelKey as Parameters<typeof t>[0]),
    href: item.href,
    status: item.status as NavItem['status'],
    ...(item.status === 'coming-soon' ? { badge: t('nav.comingSoon') } : {}),
    ...(item.children ? { children: item.children.map(toNavItem) } : {}),
  });

  const navItems: NavItem[] = TENANT_NAV_ITEMS.map((item) =>
    toNavItem(item as RawNavItem),
  );

  return (
    <TenantShell navItems={navItems}>
      {children}
    </TenantShell>
  );
}
