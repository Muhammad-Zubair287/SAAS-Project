'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { SidebarNav, type NavItem } from './sidebar-nav';
import { TopBar } from './top-bar';
import type { ReactNode } from 'react';

const PLATFORM_SIDEBAR_COLLAPSED_KEY = 'platform.sidebar.collapsed';
const SIDEBAR_EXPANDED_PX = 244;
const SIDEBAR_COLLAPSED_PX = 80;

interface AppShellProps {
  children: ReactNode;
  navItems: NavItem[];
  logo: ReactNode;
  /** Compact mark when sidebar is collapsed. */
  sidebarLogoCollapsed?: ReactNode;
  sidebarLogo?: ReactNode;
  roleLabel: string;
  userLabel?: string;
  userEmail?: string;
  userInitials?: string;
  avatarClassName?: string;
  navLabel: string;
  skipToContentLabel: string;
  closeSidebarLabel: string;
  collapseSidebarLabel?: string;
  expandSidebarLabel?: string;
  headerActions?: ReactNode;
  headerLeading?: ReactNode;
  headerCenter?: ReactNode;
  headerLogo?: ReactNode;
  hideHeaderAvatar?: boolean;
  variant?: 'default' | 'platform';
  /** Optional fixed mobile bottom navigation (ESS). */
  mobileBottomNav?: ReactNode;
  /** Hide hamburger when bottom nav replaces the drawer on mobile. */
  hideMobileMenuButton?: boolean;
  /** Extra main content classes (e.g. bottom padding for sticky nav). */
  mainClassName?: string;
}

export function AppShell({
  children,
  navItems,
  logo,
  sidebarLogo,
  sidebarLogoCollapsed,
  roleLabel,
  userLabel,
  userEmail,
  userInitials,
  avatarClassName = 'bg-brand-blue-600',
  navLabel,
  skipToContentLabel,
  closeSidebarLabel,
  collapseSidebarLabel = 'Collapse sidebar',
  expandSidebarLabel = 'Expand sidebar',
  headerActions,
  headerLeading,
  headerCenter,
  headerLogo,
  hideHeaderAvatar = false,
  variant = 'default',
  mobileBottomNav,
  hideMobileMenuButton = false,
  mainClassName,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const isPlatform = variant === 'platform';
  const sidebarCls = isPlatform
    ? 'bg-brand-navy-950 border-brand-navy-800 text-white'
    : 'bg-surface-primary border-border-default';
  const sidebarFooterCls = isPlatform ? 'text-slate-300' : 'text-text-secondary';
  const sidebarHeaderBorder = isPlatform ? 'border-brand-navy-800' : 'border-border-default';
  const asideLogo =
    isPlatform && collapsed ? (sidebarLogoCollapsed ?? sidebarLogo ?? logo) : (sidebarLogo ?? logo);

  useEffect(() => {
    if (!isPlatform) return;
    try {
      const raw = localStorage.getItem(PLATFORM_SIDEBAR_COLLAPSED_KEY);
      if (raw === '1') setCollapsed(true);
    } catch {
      // ignore
    }
  }, [isPlatform]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(PLATFORM_SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!sidebarOpen) return;
    closeButtonRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [sidebarOpen]);

  const desktopWidth = isPlatform
    ? collapsed
      ? `w-[${SIDEBAR_COLLAPSED_PX}px]`
      : `w-[${SIDEBAR_EXPANDED_PX}px]`
    : 'w-60';

  // Tailwind needs full class names at build time — use style for dynamic width.
  const desktopWidthStyle = isPlatform
    ? { width: collapsed ? SIDEBAR_COLLAPSED_PX : SIDEBAR_EXPANDED_PX }
    : undefined;

  const footerUser = (
    <div className={`flex items-center gap-2 ${collapsed && isPlatform ? 'justify-center' : ''}`}>
      {userInitials ? (
        <div
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-caption font-semibold text-white ${avatarClassName}`}
          title={userLabel}
          aria-hidden="true"
        >
          {userInitials}
        </div>
      ) : null}
      {!(collapsed && isPlatform) && (
        <div className="min-w-0 flex-1">
          {userLabel ? (
            <p className={`truncate text-body-sm font-medium ${isPlatform ? 'text-white' : 'text-text-primary'}`}>
              {userLabel}
            </p>
          ) : null}
          {userEmail ? (
            <p className={`truncate text-caption ${sidebarFooterCls}`}>{userEmail}</p>
          ) : (
            <p className={`truncate text-caption ${sidebarFooterCls}`}>{roleLabel}</p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div
      data-app-shell
      className="flex h-full min-h-0 overflow-hidden bg-surface-canvas supports-[height:100dvh]:h-[100dvh] supports-[height:100dvh]:min-h-[100dvh]"
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand-blue-600 focus:px-4 focus:py-2 focus:text-body-md focus:font-medium focus:text-white"
      >
        {skipToContentLabel}
      </a>

      <aside
        className={`hidden flex-shrink-0 flex-col border-r lg:flex ${isPlatform ? '' : desktopWidth} ${sidebarCls}`}
        style={desktopWidthStyle}
      >
        <div className={`flex h-16 flex-shrink-0 items-center border-b px-3 ${sidebarHeaderBorder} ${collapsed ? 'justify-center' : 'px-4'}`}>
          {asideLogo}
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <SidebarNav items={navItems} label={navLabel} variant={variant} collapsed={isPlatform && collapsed} />
        </div>
        <div className={`border-t p-3 ${sidebarHeaderBorder}`}>
          {footerUser}
          {isPlatform && (
            <button
              type="button"
              onClick={toggleCollapsed}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-md px-2 py-2 text-caption text-slate-300 hover:bg-brand-navy-800 hover:text-white"
              aria-label={collapsed ? expandSidebarLabel : collapseSidebarLabel}
              title={collapsed ? expandSidebarLabel : collapseSidebarLabel}
            >
              <svg
                className={`h-4 w-4 transition-transform ${collapsed ? '' : 'rotate-180'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
              {!collapsed && <span>{collapseSidebarLabel}</span>}
            </button>
          )}
        </div>
      </aside>

      {sidebarOpen && !hideMobileMenuButton && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={navLabel}
            className={`absolute left-0 top-0 flex h-full w-[244px] flex-col border-r ${sidebarCls}`}
          >
            <div className={`flex h-16 items-center justify-between border-b px-4 ${sidebarHeaderBorder}`}>
              {sidebarLogo ?? logo}
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setSidebarOpen(false)}
                className={`-me-2 flex h-11 w-11 items-center justify-center rounded-md hover:bg-white/10 ${
                  isPlatform ? 'text-slate-300' : 'text-text-secondary hover:bg-surface-canvas'
                }`}
                aria-label={closeSidebarLabel}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarNav items={navItems} label={navLabel} variant={variant} />
            </div>
            <div className={`border-t p-4 ${sidebarHeaderBorder}`}>{footerUser}</div>
          </aside>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden min-w-0">
        <TopBar
          onToggleSidebar={hideMobileMenuButton ? undefined : () => setSidebarOpen(true)}
          sidebarOpen={sidebarOpen}
          showMobileMenuButton={!hideMobileMenuButton}
          logo={headerLogo}
          leading={headerLeading}
          center={headerCenter}
          actions={
            <div className="flex items-center gap-1.5 lg:gap-2">
              {headerActions}
              {!hideHeaderAvatar && userLabel ? (
                <>
                  <span className="hidden text-body-sm text-text-secondary sm:block">{userLabel}</span>
                  {userInitials ? (
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-body-sm font-semibold text-white ${avatarClassName}`}
                      aria-hidden="true"
                    >
                      {userInitials}
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          }
        />
        <main
          id="main"
          tabIndex={-1}
          className={`min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 md:p-6 lg:p-8 ${mobileBottomNav ? 'pb-24 lg:pb-8' : ''} ${mainClassName ?? ''}`}
        >
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
        {mobileBottomNav ? (
          <div className="lg:hidden">{mobileBottomNav}</div>
        ) : null}
      </div>
    </div>
  );
}
