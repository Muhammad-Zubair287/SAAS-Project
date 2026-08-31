'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AppShell } from './app-shell';
import { LanguageSwitcher } from './language-switcher';
import { TenantSwitcher } from './platform/tenant-switcher';
import { GlobalSearch } from './platform/global-search';
import { NotificationsBell } from './platform/notifications-bell';
import { QuickCreateMenu } from './platform/quick-create-menu';
import { HelpMenu } from './platform/help-menu';
import { UserMenu } from './platform/user-menu';
import type { NavItem } from './sidebar-nav';
import type { ReactNode } from 'react';
import { useAuth } from '../../lib/auth/auth-provider';
import { ROUTES } from '../../constants/routes.constants';
import { platformApi } from '../../modules/platform/api/platform-api';

interface PlatformShellProps {
  children: ReactNode;
  navItems: NavItem[];
}

function SidebarBrand({ compact = false }: { compact?: boolean }) {
  const t = useTranslations();
  return (
    <Link
      href={ROUTES.PLATFORM.DASHBOARD}
      title={t('platform.brand.fullName')}
      className="flex min-w-0 items-center gap-2"
    >
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-brand-blue-600 text-body-sm font-bold text-white">
        W
      </div>
      {!compact && (
        <span className="truncate text-title-sm font-bold text-white">
          {t('platform.brand.shortName')}
        </span>
      )}
    </Link>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

function NavIcon({ d }: { d: string }) {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const NAV_ICONS: Record<string, ReactNode> = {
  dashboard: <NavIcon d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />,
  tenants: <NavIcon d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />,
  plans: <NavIcon d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />,
  usage: <NavIcon d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
  support: <NavIcon d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />,
  audit: <NavIcon d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
  config: <NavIcon d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />,
  integrationHealth: <NavIcon d="M13 10V3L4 14h7v7l9-11h-7z" />,
};

function roleTranslationKey(platformRole: string | null, roles: string[]): string {
  const raw = platformRole ?? roles[0] ?? '';
  if (raw === 'PLATFORM_SUPER_ADMIN' || raw === 'SUPER_ADMIN') return 'platform.admin.roles.superAdmin';
  if (raw === 'PLATFORM_SUPPORT_ENGINEER' || raw === 'SUPPORT_ENGINEER') return 'platform.admin.roles.supportEngineer';
  if (raw === 'PLATFORM_AUDITOR' || raw === 'AUDITOR') return 'platform.admin.roles.auditor';
  return 'platform.admin.roles.operator';
}

export function PlatformShell({ children, navItems }: PlatformShellProps) {
  const t = useTranslations();
  const { user, logout } = useAuth();
  const displayName = user?.displayName ?? user?.email ?? t('platform.admin.label');
  const roleKey = roleTranslationKey(user?.platformRole ?? null, user?.roles ?? []);
  const roleLabel = t(roleKey as Parameters<typeof t>[0]);

  const itemsWithIcons = navItems.map((item) => ({
    ...item,
    icon: NAV_ICONS[item.key] ?? item.icon,
    children: item.children?.map((child) => ({
      ...child,
      icon: NAV_ICONS[child.key],
    })),
  }));

  return (
    <AppShell
      navItems={itemsWithIcons}
      logo={<SidebarBrand />}
      sidebarLogo={<SidebarBrand />}
      sidebarLogoCollapsed={<SidebarBrand compact />}
      headerLogo={null}
      headerLeading={<TenantSwitcher />}
      headerCenter={<GlobalSearch />}
      roleLabel={roleLabel}
      userLabel={displayName}
      userEmail={user?.email}
      userInitials={initials(displayName)}
      hideHeaderAvatar
      navLabel={t('nav.primaryLabel')}
      skipToContentLabel={t('common.skipToContent')}
      closeSidebarLabel={t('common.closeSidebar')}
      collapseSidebarLabel={t('nav.collapseSidebar')}
      expandSidebarLabel={t('nav.expandSidebar')}
      variant="platform"
      headerActions={
        <>
          <QuickCreateMenu />
          <NotificationsBell />
          <LanguageSwitcher
            variant="compact"
            onLocaleChange={(locale) => {
              void platformApi.me.updatePreferences({ locale });
            }}
          />
          <HelpMenu />
          <UserMenu
            displayName={displayName}
            initials={initials(displayName)}
            onLogout={() => void logout()}
          />
        </>
      }
    >
      {children}
    </AppShell>
  );
}
