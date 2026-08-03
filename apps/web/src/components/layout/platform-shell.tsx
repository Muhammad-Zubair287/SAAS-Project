'use client';

import { useTranslations } from 'next-intl';
import { AppShell } from './app-shell';
import type { NavItem } from './sidebar-nav';
import type { ReactNode } from 'react';

interface PlatformShellProps {
  children: ReactNode;
  navItems: NavItem[];
}

function PlatformLogo() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-navy-950 text-white text-body-sm font-bold">
        W
      </div>
      <span className="text-title-md font-bold text-brand-navy-950">Workforce OS</span>
    </div>
  );
}

export function PlatformShell({ children, navItems }: PlatformShellProps) {
  const t = useTranslations();

  return (
    <AppShell
      navItems={navItems}
      logo={<PlatformLogo />}
      roleLabel={t('platform.admin.roleLabel')}
      userLabel={t('platform.admin.label')}
      userInitials="SA"
      avatarClassName="bg-brand-blue-600"
      navLabel={t('nav.primaryLabel')}
      skipToContentLabel={t('common.skipToContent')}
      closeSidebarLabel={t('common.closeSidebar')}
    >
      {children}
    </AppShell>
  );
}
