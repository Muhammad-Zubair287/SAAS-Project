'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AppShell } from './app-shell';
import { LanguageSwitcher } from './language-switcher';
import { HelpMenu } from './platform/help-menu';
import { TenantGlobalSearch } from './tenant/tenant-global-search';
import { TenantNameBadge } from './tenant/tenant-name-badge';
import { TenantNotificationsBell } from './tenant/tenant-notifications-bell';
import { TenantQuickCreate } from './tenant/tenant-quick-create';
import { TenantUserMenu } from './tenant/tenant-user-menu';
import type { NavItem } from './sidebar-nav';
import type { ReactNode } from 'react';
import { useAuth } from '../../lib/auth/auth-provider';
import { useTenantBranding } from '../../modules/tenant/hooks/use-tenant-admin';
import { APP_CONSTANTS } from '../../constants/app.constants';
import { ROUTES } from '../../constants/routes.constants';

interface TenantShellProps {
  children: ReactNode;
  navItems: NavItem[];
}

function TenantLogo({ compact = false, forSidebar = false }: { compact?: boolean; forSidebar?: boolean }) {
  const t = useTranslations();
  const { data } = useTenantBranding();
  const branding = data?.data;
  const name =
    branding?.applicationName?.trim() ||
    APP_CONSTANTS.APP_NAME ||
    t('tenant.brand.shortName');
  const color = branding?.primaryColor;

  return (
    <Link
      href={ROUTES.TENANT.HR.ROOT}
      title={name}
      className="flex min-w-0 items-center gap-2"
    >
      {branding?.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={branding.logoUrl} alt="" className="h-8 w-8 flex-shrink-0 rounded-md object-contain" />
      ) : (
        <div
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-body-sm font-bold text-white ${
            color ? '' : 'bg-brand-blue-600'
          }`}
          style={color ? { backgroundColor: color } : undefined}
        >
          {(name[0] ?? 'W').toUpperCase()}
        </div>
      )}
      {!compact && (
        <span
          className={`truncate text-title-sm font-bold lg:text-title-md ${
            forSidebar ? 'text-white' : 'text-text-primary'
          }`}
        >
          {name}
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
  home: <NavIcon d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />,
  hrDashboard: <NavIcon d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
  organisation: <NavIcon d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />,
  employees: <NavIcon d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
  people: <NavIcon d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
  onboarding: <NavIcon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />,
  documents: <NavIcon d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />,
  attendance: <NavIcon d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
  shifts: <NavIcon d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />,
  leave: <NavIcon d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
  payroll: <NavIcon d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  approvals: <NavIcon d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
  reports: <NavIcon d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
  hrSettings: <NavIcon d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />,
  integrations: <NavIcon d="M13 10V3L4 14h7v7l9-11h-7z" />,
  settings: <NavIcon d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />,
  subscription: <NavIcon d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />,
  audit: <NavIcon d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
};

export function TenantShell({ children, navItems }: TenantShellProps) {
  const t = useTranslations();
  const { user, logout } = useAuth();
  const displayName = user?.displayName ?? t('tenant.admin.label');
  const roleLabel = user?.roles[0] ?? t('tenant.admin.roleLabel');

  const itemsWithIcons = navItems.map((item) => ({
    ...item,
    icon: NAV_ICONS[item.key] ?? item.icon,
    children: item.children?.map((child) => ({
      ...child,
      icon: NAV_ICONS[child.key] ?? child.icon,
    })),
  }));

  return (
    <AppShell
      navItems={itemsWithIcons}
      logo={<TenantLogo forSidebar />}
      sidebarLogo={<TenantLogo forSidebar />}
      sidebarLogoCollapsed={<TenantLogo compact forSidebar />}
      headerLogo={null}
      headerLeading={<TenantNameBadge />}
      headerCenter={<TenantGlobalSearch />}
      roleLabel={roleLabel}
      userLabel={displayName}
      userEmail={user?.email}
      userInitials={initials(displayName)}
      avatarClassName="bg-brand-teal-500"
      hideHeaderAvatar
      navLabel={t('nav.primaryLabel')}
      skipToContentLabel={t('common.skipToContent')}
      closeSidebarLabel={t('common.closeSidebar')}
      collapseSidebarLabel={t('nav.collapseSidebar')}
      expandSidebarLabel={t('nav.expandSidebar')}
      variant="platform"
      headerActions={
        <>
          <TenantQuickCreate />
          <TenantNotificationsBell />
          <LanguageSwitcher variant="compact" />
          <HelpMenu />
          <TenantUserMenu
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
