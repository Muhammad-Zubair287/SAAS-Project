'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ROUTES } from '../../../constants/routes.constants';

interface UserMenuProps {
  displayName: string;
  initials: string;
  onLogout: () => void;
}

const ICON_BTN =
  'flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:bg-surface-canvas hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-600';

export function UserMenu({ displayName, initials, onLogout }: UserMenuProps) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const items: Array<{ key: string; href?: string; onClick?: () => void; danger?: boolean }> = [
    { key: 'profile', href: ROUTES.PLATFORM.PROFILE },
    { key: 'myAccount', href: ROUTES.PLATFORM.PROFILE },
    { key: 'mfa', href: ROUTES.AUTH.MFA_SETUP },
    { key: 'notificationPreferences', href: ROUTES.PLATFORM.CONFIG_NOTIFICATIONS },
    { key: 'language', href: ROUTES.PLATFORM.PROFILE },
    { key: 'help', href: 'https://help.workforcecloudos.com' },
    { key: 'logout', onClick: onLogout, danger: true },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${ICON_BTN} gap-0 overflow-hidden p-0`}
        aria-label={displayName}
        aria-expanded={open}
        aria-haspopup="menu"
        title={displayName}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue-600 text-caption font-semibold text-white">
          {initials}
        </span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute end-0 top-full z-50 mt-1 w-56 rounded-xl border border-border-default bg-surface-primary py-1 shadow-elevation-3"
        >
          <div className="border-b border-border-default px-4 py-2">
            <p className="truncate text-body-sm font-semibold text-text-primary">{displayName}</p>
          </div>
          {items.map((item) => {
            const label = t(`platform.chrome.userMenu.${item.key}` as Parameters<typeof t>[0]);
            if (item.href?.startsWith('http')) {
              return (
                <a
                  key={item.key}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  role="menuitem"
                  className="block px-4 py-2 text-body-sm text-text-primary hover:bg-surface-canvas"
                  onClick={() => setOpen(false)}
                >
                  {label}
                </a>
              );
            }
            if (item.href) {
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  role="menuitem"
                  className="block px-4 py-2 text-body-sm text-text-primary hover:bg-surface-canvas"
                  onClick={() => setOpen(false)}
                >
                  {label}
                </Link>
              );
            }
            return (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                className={`block w-full px-4 py-2 text-start text-body-sm hover:bg-surface-canvas ${
                  item.danger ? 'text-semantic-danger' : 'text-text-primary'
                }`}
                onClick={() => {
                  setOpen(false);
                  item.onClick?.();
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
