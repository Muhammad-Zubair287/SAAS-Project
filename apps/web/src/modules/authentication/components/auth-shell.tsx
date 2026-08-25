'use client';

import type { ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { locales, type Locale } from '../../../lib/i18n/config';
import { cn } from '../../../lib/utils/cn';

interface AuthShellProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  /** Optional organisation label for tenant-specific login (no UUID). */
  organisationLabel?: string;
  /**
   * `signIn` matches SCR-AUTH-01 hi-fi (white canvas, no card chrome).
   * `card` keeps the bordered surface used by the rest of the auth family.
   */
  surface?: 'signIn' | 'card';
}

function setLocaleCookie(locale: Locale) {
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax`;
  window.location.reload();
}

/**
 * SCR-AUTH two-panel shell — Design System high-fidelity (SCR-AUTH-01 family).
 * Desktop 1440: brand panel left, ~420–440px auth form right.
 * Tablet: reduced brand strip. Mobile: single-column with product mark.
 */
export function AuthShell({
  children,
  title,
  subtitle,
  organisationLabel,
  surface = 'card',
}: AuthShellProps) {
  const t = useTranslations('auth');
  const locale = useLocale() as Locale;
  const isSignIn = surface === 'signIn';

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Brand / trust panel — Design System SCR-AUTH-01 */}
      <aside
        className={cn(
          'relative hidden overflow-hidden text-white md:flex md:min-h-[240px] md:flex-col md:px-10 md:py-10 lg:min-h-screen lg:w-1/2 lg:px-14 lg:py-14',
        )}
        style={{
          background:
            'linear-gradient(165deg, #0B1F3A 0%, #0F2A4A 42%, #0D3D45 72%, #0A4A46 100%)',
        }}
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div
            className="absolute -left-16 top-8 h-[28rem] w-[28rem] rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(37,99,235,0.28) 0%, rgba(37,99,235,0.08) 42%, transparent 70%)',
            }}
          />
          <div
            className="absolute -bottom-24 -right-20 h-[32rem] w-[32rem] rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(20,184,166,0.32) 0%, rgba(13,148,136,0.12) 45%, transparent 72%)',
            }}
          />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-md text-[1.25rem] font-bold leading-none text-white"
              style={{
                background: 'linear-gradient(135deg, #2563EB 0%, #0D9488 100%)',
              }}
            >
              w
            </div>
            <div>
              <p className="text-[1.25rem] font-bold leading-tight tracking-tight">
                {t('brand.name')}
              </p>
              <p className="mt-0.5 text-body-sm text-white/70">{t('brand.tagline')}</p>
            </div>
          </div>
          {organisationLabel ? (
            <p className="mt-4 text-body-sm text-white/65">
              {t('brand.organisationSignIn', { name: organisationLabel })}
            </p>
          ) : null}
        </div>

        <div className="relative z-10 flex flex-1 flex-col justify-center py-10 lg:py-0">
          <div className="max-w-xl">
            <h1 className="text-[2rem] font-bold leading-tight tracking-tight text-white lg:text-[2.35rem] lg:leading-[1.15]">
              {t('brand.headline')}
            </h1>
            <p className="mt-5 max-w-md text-body-md leading-relaxed text-white/75">
              {t('brand.trust')}
            </p>
          </div>
        </div>
      </aside>

      {/* Authentication area */}
      <main
        className={cn(
          'flex flex-1 flex-col px-4 py-8 sm:px-8 lg:items-center lg:justify-center lg:px-12',
          isSignIn ? 'bg-white' : 'bg-surface-canvas',
        )}
      >
        <div className="mb-8 flex items-center gap-3 md:hidden">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-md text-[1.25rem] font-bold leading-none text-white"
            style={{
              background: 'linear-gradient(135deg, #2563EB 0%, #0D9488 100%)',
            }}
          >
            w
          </div>
          <div>
            <p className="text-title-md font-bold text-brand-navy-950">{t('brand.name')}</p>
            <p className="text-body-sm text-text-secondary">{t('brand.tagline')}</p>
            {organisationLabel ? (
              <p className="text-body-sm text-text-secondary">
                {t('brand.organisationSignIn', { name: organisationLabel })}
              </p>
            ) : null}
          </div>
        </div>

        <div
          className={cn(
            'w-full max-w-[440px]',
            isSignIn
              ? 'bg-transparent p-0'
              : 'rounded-lg border border-border-default bg-surface-primary p-6 shadow-elevation-1 sm:p-8',
          )}
        >
          <h2 className="text-[1.75rem] font-bold tracking-tight text-brand-navy-950">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-2 text-body-md text-text-secondary">{subtitle}</p>
          ) : null}

          <div className="mt-8">{children}</div>
        </div>

        {/* Footer — SCR-AUTH-01: English · اردو | Privacy · Help */}
        <div
          className={cn(
            'mt-10 flex w-full max-w-[440px] flex-wrap items-center justify-center gap-x-2 gap-y-2 text-body-sm text-text-secondary',
          )}
        >
          <div className="inline-flex items-center gap-2" role="group" aria-label={t('language')}>
            {locales.map((code, index) => (
              <span key={code} className="inline-flex items-center gap-2">
                {index > 0 ? <span aria-hidden="true">·</span> : null}
                <button
                  type="button"
                  className={
                    locale === code
                      ? 'font-medium text-brand-navy-950'
                      : 'hover:text-brand-blue-600'
                  }
                  aria-pressed={locale === code}
                  onClick={() => {
                    if (locale !== code) setLocaleCookie(code);
                  }}
                >
                  {code === 'en' ? 'English' : 'اردو'}
                </button>
              </span>
            ))}
          </div>
          <span aria-hidden="true" className="text-text-secondary/60">
            |
          </span>
          <div className="inline-flex items-center gap-2">
            <a className="hover:text-brand-blue-600" href="#privacy">
              {t('links.privacy')}
            </a>
            <span aria-hidden="true">·</span>
            <a className="hover:text-brand-blue-600" href="#support">
              {t('links.support')}
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
