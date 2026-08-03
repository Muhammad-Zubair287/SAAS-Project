'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { SidebarNav, type NavItem } from './sidebar-nav';
import { TopBar } from './top-bar';
import type { ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
  navItems: NavItem[];
  /** Product mark shown in the sidebar header and mobile drawer. */
  logo: ReactNode;
  /** Role string in the sidebar footer, e.g. "Super Admin". */
  roleLabel: string;
  /** User label beside the avatar, e.g. "Platform Admin". */
  userLabel: string;
  /** Avatar initials, e.g. "SA". */
  userInitials: string;
  /** Tailwind background class for the avatar, to distinguish the two shells. */
  avatarClassName: string;
  navLabel: string;
  skipToContentLabel: string;
  closeSidebarLabel: string;
}

/**
 * Shared chrome for the platform and tenant shells, which previously existed as
 * two near-identical files. Owns the responsive sidebar, the mobile drawer and
 * its focus behaviour, and the skip link.
 */
export function AppShell({
  children,
  navItems,
  logo,
  roleLabel,
  userLabel,
  userInitials,
  avatarClassName,
  navLabel,
  skipToContentLabel,
  closeSidebarLabel,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Navigating from inside the drawer previously left it open over the new page.
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Move focus into the drawer when it opens, and let Escape close it.
  useEffect(() => {
    if (!sidebarOpen) return;

    closeButtonRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [sidebarOpen]);

  return (
    // 100dvh where supported, falling back to 100vh. On mobile 100vh is the
    // *large* viewport, so with this element overflow-hidden the bottom
    // ~60-110px of <main> sat under the browser chrome permanently, with no way
    // to scroll it into view.
    <div className="flex h-screen supports-[height:100dvh]:h-[100dvh] overflow-hidden bg-surface-canvas">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand-blue-600 focus:px-4 focus:py-2 focus:text-body-md focus:font-medium focus:text-white"
      >
        {skipToContentLabel}
      </a>

      {/* Sidebar — desktop */}
      <aside className="hidden w-60 flex-shrink-0 flex-col border-r border-border-default bg-surface-primary lg:flex">
        <div className="flex h-16 flex-shrink-0 items-center border-b border-border-default px-4">
          {logo}
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav items={navItems} label={navLabel} />
        </div>
        <div className="border-t border-border-default p-4">
          <p className="text-caption text-text-secondary truncate">{roleLabel}</p>
        </div>
      </aside>

      {/* Mobile sidebar drawer */}
      {sidebarOpen && (
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
            className="absolute left-0 top-0 flex h-full w-60 flex-col border-r border-border-default bg-surface-primary"
          >
            <div className="flex h-16 items-center justify-between border-b border-border-default px-4">
              {logo}
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setSidebarOpen(false)}
                // -mr-2 keeps the 44px hit area from shifting the icon visually.
                className="-mr-2 flex h-11 w-11 items-center justify-center rounded-md text-text-secondary hover:bg-surface-canvas"
                aria-label={closeSidebarLabel}
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarNav items={navItems} label={navLabel} />
            </div>
            <div className="border-t border-border-default p-4">
              <p className="text-caption text-text-secondary truncate">{roleLabel}</p>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          onToggleSidebar={() => setSidebarOpen(true)}
          sidebarOpen={sidebarOpen}
          actions={
            <div className="flex items-center gap-3">
              <span className="hidden text-body-sm text-text-secondary sm:block">
                {userLabel}
              </span>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-body-sm font-semibold text-white ${avatarClassName}`}
                aria-hidden="true"
              >
                {userInitials}
              </div>
            </div>
          }
        />
        <main id="main" tabIndex={-1} className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {/* Caps line length on ultrawide; `main` was previously unbounded, so
              tables and dashboards stretched past 1100px next to the sidebar. */}
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
