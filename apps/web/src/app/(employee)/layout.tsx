import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { EmployeeShell } from '../../components/layout/employee-shell';
import { AuthGate } from '../../lib/auth/auth-gate';
import { EMPLOYEE_NAV_ITEMS } from '../../modules/employee-self-service/constants/ess-nav.constants';
import type { NavItem } from '../../components/layout/sidebar-nav';

interface EmployeeLayoutProps {
  children: ReactNode;
}

export default async function EmployeeLayout({ children }: EmployeeLayoutProps) {
  const t = await getTranslations();

  interface RawNavItem {
    key: string;
    labelKey: string;
    href: string;
    status: string;
    permission?: string;
  }

  const navItems: NavItem[] = (EMPLOYEE_NAV_ITEMS as readonly RawNavItem[]).map((item) => ({
    key: item.key,
    label: t(item.labelKey as Parameters<typeof t>[0]),
    href: item.href,
    status: item.status as NavItem['status'],
    ...(item.permission ? { permission: item.permission } : {}),
    ...(item.status === 'coming-soon' ? { badge: t('nav.comingSoon') } : {}),
  }));

  return (
    <AuthGate scope="tenant">
      <EmployeeShell navItems={navItems}>{children}</EmployeeShell>
    </AuthGate>
  );
}
