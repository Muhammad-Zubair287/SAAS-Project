'use client';

import type { ReactNode } from 'react';

interface TopBarProps {
  title?: string;
  logo?: ReactNode;
  actions?: ReactNode;
  onToggleSidebar?: () => void;
}

export function TopBar({ title, logo, actions, onToggleSidebar }: TopBarProps) {
  return (
    <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-border-default bg-surface-primary px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-md p-1.5 text-text-secondary hover:bg-surface-canvas hover:text-text-primary lg:hidden"
          aria-label="Toggle sidebar"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        {logo}
        {title && (
          <span className="text-title-md font-semibold text-text-primary">{title}</span>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2">{actions}</div>
      )}
    </header>
  );
}
