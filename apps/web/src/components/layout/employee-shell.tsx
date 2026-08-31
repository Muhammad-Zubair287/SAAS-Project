'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { AppShell } from './app-shell';
import { LanguageSwitcher } from './language-switcher';
import { HelpMenu } from './platform/help-menu';
import { TenantNameBadge } from './tenant/tenant-name-badge';
import { TenantNotificationsBell } from './tenant/tenant-notifications-bell';
import { TenantUserMenu } from './tenant/tenant-user-menu';
import { EmployeeBottomNav } from './employee/employee-bottom-nav';
import type { NavItem } from './sidebar-nav';
import { useAuth } from '../../lib/auth/auth-provider';
import { useTenantBranding } from '../../modules/tenant/hooks/use-tenant-admin';
import { APP_CONSTANTS } from '../../constants/app.constants';
import { ROUTES } from '../../constants/routes.constants';

interface EmployeeShellProps {
  children: ReactNode;
  navItems: NavItem[];
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

const ESS_NAV_ICONS: Record<string, ReactNode> = {
  'employee-home': (
    <NavIcon d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
  ),
  'employee-attendance': (
    <NavIcon d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  ),
  'employee-leave': (
    <NavIcon d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  ),
  'employee-requests': (
    <NavIcon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  ),
  'employee-payslips': (
    <NavIcon d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  ),
  'employee-documents': (
    <NavIcon d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  ),
  'employee-profile': (
    <NavIcon d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  ),
  'employee-notifications': (
    <NavIcon d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  ),
  'employee-policies': (
    <NavIcon d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  ),
  'employee-roster': (
    <NavIcon d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  ),
};

function EmployeeLogo({ compact = false, forSidebar = false }: { compact?: boolean; forSidebar?: boolean }) {
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
      href={ROUTES.EMPLOYEE.DASHBOARD}
      title={name}
      className="flex min-w-0 items-center gap-2"
    >
      {branding?.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={branding.logoUrl} alt="" className="h-8 w-8 flex-shrink-0 rounded-md object-contain" />
      ) : (
        <div
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-body-sm font-bold text-white ${
            color ? '' : 'bg-brand-teal-600'
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

/**
 * SCR-EMP-NAV-01 / SCR-EMP-SID-01 / SCR-EMP-NAV-02
 * Employee chrome: no HR global search or quick-create; mobile-first bottom nav.
 */
export function EmployeeShell({ children, navItems }: EmployeeShellProps) {
  const t = useTranslations();
  const { user, logout } = useAuth();
  const displayName = user?.displayName ?? t('employee.shell.userFallback');
  const roleLabel = user?.roles[0] ?? t('employee.shell.roleLabel');

  const itemsWithIcons = navItems.map((item) => ({
    ...item,
    icon: ESS_NAV_ICONS[item.key] ?? item.icon,
  }));

  return (
    <AppShell
      navItems={itemsWithIcons}
      logo={<EmployeeLogo forSidebar />}
      sidebarLogo={<EmployeeLogo forSidebar />}
      sidebarLogoCollapsed={<EmployeeLogo compact forSidebar />}
      headerLogo={null}
      headerLeading={<TenantNameBadge />}
      roleLabel={roleLabel}
      userLabel={displayName}
      userEmail={user?.email}
      userInitials={initials(displayName)}
      avatarClassName="bg-brand-teal-500"
      hideHeaderAvatar
      hideMobileMenuButton
      mobileBottomNav={<EmployeeBottomNav />}
      navLabel={t('employee.nav.sidebarLabel')}
      skipToContentLabel={t('common.skipToContent')}
      closeSidebarLabel={t('common.closeSidebar')}
      collapseSidebarLabel={t('nav.collapseSidebar')}
      expandSidebarLabel={t('nav.expandSidebar')}
      variant="platform"
      headerActions={
        <>
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
