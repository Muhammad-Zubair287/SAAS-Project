'use client';

import { useState, useRef, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { localeConfig, locales, type Locale } from '../../lib/i18n/config';

function setLocaleCookie(locale: Locale) {
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax`;
  window.location.reload();
}

interface LanguageSwitcherProps {
  onLocaleChange?: (locale: Locale) => void;
  /** Compact icon-button dropdown (platform chrome). Default is inline text buttons. */
  variant?: 'inline' | 'compact';
}

export function LanguageSwitcher({
  onLocaleChange,
  variant = 'inline',
}: LanguageSwitcherProps = {}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
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

  function selectLocale(code: Locale) {
    if (locale === code) {
      setOpen(false);
      return;
    }
    onLocaleChange?.(code);
    setLocaleCookie(code);
  }

  if (variant === 'compact') {
    return (
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex h-8 items-center gap-1 rounded-md px-2 text-text-secondary hover:bg-surface-canvas hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-600"
          aria-label={t('common.language')}
          aria-expanded={open}
          aria-haspopup="listbox"
          title={t('common.language')}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 21a9 9 0 100-18 9 9 0 000 18zm0 0c2.5 0 4.5-4 4.5-9S14.5 3 12 3 7.5 7 7.5 12s2 9 4.5 9zm-8.5-9h17"
            />
          </svg>
          <span className="hidden text-body-sm font-medium sm:inline">
            {localeConfig[locale].nativeLabel}
          </span>
        </button>
        {open && (
          <ul
            role="listbox"
            className="absolute end-0 top-full z-50 mt-1 min-w-[9rem] rounded-xl border border-border-default bg-surface-primary py-1 shadow-elevation-3"
          >
            {locales.map((code) => (
              <li key={code} role="option" aria-selected={locale === code}>
                <button
                  type="button"
                  className={`block w-full px-4 py-2 text-start text-body-sm hover:bg-surface-canvas ${
                    locale === code ? 'font-semibold text-brand-blue-600' : 'text-text-primary'
                  }`}
                  onClick={() => selectLocale(code)}
                >
                  {localeConfig[code].nativeLabel}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1" role="group" aria-label={t('common.language')}>
      {locales.map((code) => (
        <button
          key={code}
          type="button"
          className={`rounded-md px-2 py-1 text-body-sm ${
            locale === code
              ? 'font-semibold text-text-primary'
              : 'text-text-secondary hover:text-brand-blue-600'
          }`}
          aria-pressed={locale === code}
          onClick={() => selectLocale(code)}
        >
          {localeConfig[code].nativeLabel}
        </button>
      ))}
    </div>
  );
}
