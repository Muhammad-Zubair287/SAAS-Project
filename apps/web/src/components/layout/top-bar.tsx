'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

interface TopBarProps {
  title?: string;
  logo?: ReactNode;
  /** Left cluster after hamburger (logo, tenant switcher, etc.) */
  leading?: ReactNode;
  /** Center cluster — typically global search (grows) */
  center?: ReactNode;
  actions?: ReactNode;
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
  /** When false, hides the mobile hamburger (e.g. ESS bottom-nav shell). */
  showMobileMenuButton?: boolean;
}

export function TopBar({
  title,
  logo,
  leading,
  center,
  actions,
  onToggleSidebar,
  sidebarOpen = false,
  showMobileMenuButton = true,
}: TopBarProps) {
  const t = useTranslations();

  return (
    <header className="flex h-16 flex-shrink-0 items-center gap-3 border-b border-border-default bg-surface-primary px-3 lg:px-5">
      <div className="flex min-w-0 flex-shrink-0 items-center gap-2 lg:gap-3">
        {showMobileMenuButton && onToggleSidebar ? (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="-ms-1 flex h-11 w-11 items-center justify-center rounded-md text-text-secondary hover:bg-surface-canvas hover:text-text-primary lg:hidden"
            aria-label={t('nav.openMenu')}
            aria-expanded={sidebarOpen}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        ) : null}
        {logo}
        {leading}
        {title && (
          <span className="hidden text-title-md font-semibold text-text-primary sm:inline">{title}</span>
        )}
      </div>

      {center && <div className="flex min-w-0 flex-1 justify-center px-2">{center}</div>}

      {actions && (
        <div className={`flex flex-shrink-0 items-center gap-1.5 lg:gap-2 ${center ? '' : 'ms-auto'}`}>
          {actions}
        </div>
      )}
    </header>
  );
}
