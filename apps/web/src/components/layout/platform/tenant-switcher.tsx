'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useTenants } from '../../../modules/platform/hooks/use-tenants';
import { ROUTES } from '../../../constants/routes.constants';

function setTenantContext(tenantId: string, displayName: string) {
  try {
    sessionStorage.setItem('platformTenantContext', JSON.stringify({ tenantId, displayName }));
    document.cookie = `platformTenantContext=${encodeURIComponent(tenantId)}; path=/; SameSite=Lax`;
  } catch {
    // ignore storage errors
  }
}

export function TenantSwitcher() {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<{ tenantId: string; displayName: string } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const { data } = useTenants({ search: search || undefined, pageSize: 10 });
  const tenants = data?.data ?? [];

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('platformTenantContext');
      if (raw) setSelected(JSON.parse(raw) as { tenantId: string; displayName: string });
    } catch {
      // ignore
    }
  }, []);

  const handleSelect = useCallback((tenantId: string, displayName: string) => {
    setTenantContext(tenantId, displayName);
    setSelected({ tenantId, displayName });
    setOpen(false);
    setSearch('');
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex max-w-[200px] items-center gap-1.5 rounded-md border border-border-default bg-surface-canvas px-2.5 py-1.5 text-body-sm text-text-primary hover:bg-surface-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-600"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <span className="truncate">
          {selected ? selected.displayName : t('platform.chrome.tenantSwitcher.placeholder')}
        </span>
        <svg className="h-3 w-3 flex-shrink-0 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-72 rounded-xl border border-border-default bg-surface-primary shadow-elevation-3">
          <div className="p-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('platform.chrome.tenantSwitcher.search')}
              className="w-full rounded-md border border-border-default bg-surface-canvas px-3 py-1.5 text-body-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-blue-600"
              autoFocus
            />
          </div>
          <ul role="listbox" className="max-h-60 overflow-y-auto">
            {tenants.length === 0 && (
              <li className="px-3 py-2 text-body-sm text-text-secondary">{t('platform.chrome.tenantSwitcher.noResults')}</li>
            )}
            {tenants.map((tenant) => (
              <li key={tenant.id} role="option" aria-selected={selected?.tenantId === tenant.id}>
                <button
                  type="button"
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-start text-body-sm transition-colors hover:bg-surface-canvas ${
                    selected?.tenantId === tenant.id ? 'font-semibold text-brand-blue-600' : 'text-text-primary'
                  }`}
                  onClick={() => handleSelect(tenant.id, tenant.displayName)}
                >
                  <span className="truncate">{tenant.displayName}</span>
                  <span className="flex-shrink-0 text-caption text-text-secondary">{tenant.status}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-border-default p-2">
            <Link
              href={ROUTES.PLATFORM.TENANTS}
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-1.5 text-body-sm font-medium text-brand-blue-600 hover:bg-surface-canvas"
            >
              {t('platform.chrome.tenantSwitcher.viewAll')} →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
