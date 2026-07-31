'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { SidebarNav, type NavItem } from './sidebar-nav';
import { TopBar } from './top-bar';
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const t = useTranslations();

  return (
    <div className="flex h-screen overflow-hidden bg-surface-canvas">
      {/* Sidebar — desktop */}
      <aside className="hidden w-60 flex-shrink-0 flex-col border-r border-border-default bg-surface-primary lg:flex">
        <div className="flex h-16 flex-shrink-0 items-center border-b border-border-default px-4">
          <PlatformLogo />
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav items={navItems} />
        </div>
        <div className="border-t border-border-default p-4">
          <p className="text-caption text-text-secondary truncate">
            {t('platform.admin.roleLabel')}
          </p>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-60 flex-col border-r border-border-default bg-surface-primary">
            <div className="flex h-16 items-center justify-between border-b border-border-default px-4">
              <PlatformLogo />
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="rounded-md p-1 text-text-secondary hover:bg-surface-canvas"
                aria-label="Close sidebar"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarNav items={navItems} />
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          onToggleSidebar={() => setSidebarOpen(true)}
          actions={
            <div className="flex items-center gap-3">
              <span className="hidden text-body-sm text-text-secondary sm:block">
                {t('platform.admin.label')}
              </span>
              <div className="h-8 w-8 rounded-full bg-brand-blue-600 flex items-center justify-center text-white text-body-sm font-semibold">
                SA
              </div>
            </div>
          }
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
