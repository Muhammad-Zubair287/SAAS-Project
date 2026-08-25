'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';

const LINKS = [
  { key: 'helpCenter', href: 'https://help.workforcecloudos.com' },
  { key: 'docs', href: 'https://docs.workforcecloudos.com' },
  { key: 'support', href: 'https://support.workforcecloudos.com' },
  { key: 'status', href: 'https://status.workforcecloudos.com' },
] as const;

export function HelpMenu() {
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

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:bg-surface-canvas hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-600"
        aria-label={t('platform.chrome.help.label')}
        aria-expanded={open}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.228 9c.549-1.165 1.746-2 3.172-2 1.98 0 3.5 1.343 3.5 3 0 1.657-1.52 3-3.5 3-.9 0-1.72-.343-2.328-.9M12 17h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
      {open && (
        <div className="absolute end-0 top-full z-50 mt-1 w-52 rounded-xl border border-border-default bg-surface-primary shadow-elevation-3 py-1">
          {LINKS.map((link) => (
            <a
              key={link.key}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 text-body-sm text-text-primary hover:bg-surface-canvas"
              onClick={() => setOpen(false)}
            >
              {t(`platform.chrome.help.${link.key}`)}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
