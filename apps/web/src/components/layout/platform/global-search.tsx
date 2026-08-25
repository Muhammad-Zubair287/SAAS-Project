'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useDebounce } from '../../../hooks/use-debounce';
import { platformApi } from '../../../modules/platform/api/platform-api';
import { ROUTES } from '../../../constants/routes.constants';
import type { SearchResponse } from '../../../modules/platform/types/platform.types';

export function GlobalSearch() {
  const t = useTranslations();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
      setResults(null);
      return;
    }
    setIsLoading(true);
    platformApi.search
      .query(debouncedQuery)
      .then((r) => setResults(r.data))
      .catch(() => setResults(null))
      .finally(() => setIsLoading(false));
  }, [debouncedQuery]);

  const clear = useCallback(() => {
    setQuery('');
    setResults(null);
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
        setResults(null);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const tenants = results?.tenants ?? [];
  const users = results?.users ?? [];
  const auditEvents = results?.auditEvents ?? [];
  const hasResults = tenants.length + users.length + auditEvents.length > 0;
  const showPanel = open && query.length >= 2;

  function goFirstResult() {
    const first = tenants[0] ?? users[0] ?? auditEvents[0];
    if (!first) return;
    if ('slug' in first || 'displayName' in first && 'status' in first) {
      window.location.href = ROUTES.PLATFORM.TENANT_DETAIL((first as { id: string }).id);
    } else if ('email' in first) {
      window.location.href = ROUTES.PLATFORM.AUDIT;
    } else {
      window.location.href = `${ROUTES.PLATFORM.AUDIT}?eventId=${(first as { id: string }).id}`;
    }
  }

  return (
    <div className="relative w-full max-w-xl" ref={containerRef}>
      <div className="relative flex items-center">
        <svg
          className="pointer-events-none absolute start-3 h-4 w-4 text-text-secondary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              goFirstResult();
            }
          }}
          placeholder={t('platform.chrome.search.placeholder')}
          className="w-full rounded-md border border-border-default bg-surface-canvas py-2 pe-16 ps-9 text-body-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-blue-600"
          aria-label={t('common.search')}
        />
        <div className="absolute end-2 flex items-center gap-1">
          {query ? (
            <button
              type="button"
              onClick={clear}
              className="rounded p-1 text-text-secondary hover:bg-surface-primary hover:text-text-primary"
              aria-label={t('common.clear')}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <kbd className="hidden rounded border border-border-default px-1.5 py-0.5 text-caption text-text-secondary md:inline">
              ⌘K
            </kbd>
          )}
          {isLoading && (
            <svg className="h-4 w-4 animate-spin text-text-secondary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
        </div>
      </div>

      {showPanel && (
        <div className="absolute top-full start-0 z-50 mt-1 max-h-96 w-full overflow-y-auto rounded-xl border border-border-default bg-surface-primary shadow-elevation-3">
          {!hasResults && !isLoading && (
            <p className="px-4 py-3 text-body-sm text-text-secondary">{t('platform.chrome.search.noResults')}</p>
          )}
          {tenants.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1 text-caption font-semibold uppercase tracking-wide text-text-secondary">
                {t('platform.nav.tenants')}
              </p>
              <ul>
                {tenants.slice(0, 5).map((tenant) => (
                  <li key={tenant.id}>
                    <Link
                      href={ROUTES.PLATFORM.TENANT_DETAIL(tenant.id)}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-surface-canvas"
                    >
                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-brand-blue-100 text-caption font-semibold text-brand-blue-600">
                        {tenant.displayName[0]?.toUpperCase() ?? 'T'}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-body-sm font-medium text-text-primary">{tenant.displayName}</p>
                        <p className="text-caption text-text-secondary">
                          {tenant.slug} · {tenant.status}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {users.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1 text-caption font-semibold uppercase tracking-wide text-text-secondary">
                {t('platform.chrome.search.users')}
              </p>
              <ul>
                {users.slice(0, 5).map((user) => (
                  <li key={user.id} className="px-4 py-2 text-body-sm text-text-primary">
                    {user.displayName ?? user.name ?? user.email}
                    <span className="ms-2 text-caption text-text-secondary">{user.email}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {auditEvents.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1 text-caption font-semibold uppercase tracking-wide text-text-secondary">
                {t('platform.chrome.search.audit')}
              </p>
              <ul>
                {auditEvents.slice(0, 5).map((ev) => (
                  <li key={ev.id}>
                    <Link
                      href={`${ROUTES.PLATFORM.AUDIT}`}
                      onClick={() => setOpen(false)}
                      className="block px-4 py-2 hover:bg-surface-canvas"
                    >
                      <p className="text-body-sm font-medium text-text-primary">{ev.action}</p>
                      <p className="text-caption text-text-secondary">
                        {ev.module} · {new Date(ev.occurredAt).toLocaleString()}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
