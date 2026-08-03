'use client';

import { useTranslations } from 'next-intl';
import { AppShell } from './app-shell';
import type { NavItem } from './sidebar-nav';
import type { ReactNode } from 'react';

interface TenantShellProps {
  children: ReactNode;
  navItems: NavItem[];
}

function TenantLogo() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-teal-500 text-white text-body-sm font-bold">
        W
      </div>
      <span className="text-title-md font-bold text-brand-navy-950">Workforce OS</span>
    </div>
  );
}

export function TenantShell({ children, navItems }: TenantShellProps) {
  const t = useTranslations();

  return (
    <AppShell
      navItems={navItems}
      logo={<TenantLogo />}
      roleLabel={t('tenant.admin.roleLabel')}
      userLabel={t('tenant.admin.label')}
      userInitials="TA"
      avatarClassName="bg-brand-teal-500"
      navLabel={t('nav.primaryLabel')}
      skipToContentLabel={t('common.skipToContent')}
      closeSidebarLabel={t('common.closeSidebar')}
    >
      {children}
    </AppShell>
  );
}
