'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../components/common/page-header';
import { TenantsTable } from '../../../modules/platform/components/tenants-table';
import { useTenants } from '../../../modules/platform/hooks/use-tenants';
import { usePagination } from '../../../hooks/use-pagination';
import { useDebounce } from '../../../hooks/use-debounce';
import type { TenantStatus } from '../../../modules/platform/types/platform.types';
import { ROUTES } from '../../../constants/routes.constants';

interface TenantsPageClientProps {
  title: string;
  description: string;
}

export function TenantsPageClient({ title, description }: TenantsPageClientProps) {
  const t = useTranslations();
  const [search, setSearch] = useState('');
  // Debounced so typing does not fire one request per keystroke.
  const debouncedSearch = useDebounce(search);
  const [statusFilter, setStatusFilter] = useState<TenantStatus | ''>('');
  const { page, pageSize, goToPage: setPage } = usePagination();

  const { data, isLoading, isError, refetch } = useTenants({
    page,
    pageSize,
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const totalPages = data?.meta.totalPages ?? 1;
  const total = data?.meta.total ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[{ label: t('platform.nav.overview'), href: ROUTES.PLATFORM.DASHBOARD }, { label: title }]}
        actions={
          <Link
            href={ROUTES.PLATFORM.TENANTS_NEW}
            className="rounded-md bg-brand-blue-600 px-4 py-2 text-body-md font-semibold text-white hover:bg-blue-700"
          >
            + {t('platform.tenants.createButton')}
          </Link>
        }
      />

      {/* Search + Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1">
          <input
            type="search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={t('platform.tenants.searchPlaceholder')}
            className="w-full rounded-md border border-border-default bg-surface-primary py-2 pl-4 pr-10 text-body-md placeholder:text-text-secondary focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20"
          />
          <svg
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 15.803a7.5 7.5 0 0 0 10.607 0z" />
          </svg>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as TenantStatus | ''); setPage(1); }}
          className="rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20"
        >
          <option value="">{t('platform.tenants.filters.allStatuses')}</option>
          <option value="DRAFT">{t('platform.tenants.status.draft')}</option>
          <option value="TRIAL">{t('platform.tenants.status.trial')}</option>
          <option value="ACTIVE">{t('platform.tenants.status.active')}</option>
          <option value="GRACE">{t('platform.tenants.status.grace')}</option>
          <option value="SUSPENDED">{t('platform.tenants.status.suspended')}</option>
          <option value="CLOSED">{t('platform.tenants.status.closed')}</option>
          <option value="ARCHIVED">{t('platform.tenants.status.archived')}</option>
        </select>
      </div>

      {/* Results count */}
      {!isLoading && !isError && (
        <p className="text-body-sm text-text-secondary">
          {t('pagination.showing', {
            from: Math.min((page - 1) * pageSize + 1, total),
            to: Math.min(page * pageSize, total),
            total,
          })}
        </p>
      )}

      <TenantsTable
        data={data?.data ?? []}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => { void refetch(); }}
      />

      {/* Pagination */}
      {!isError && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="flex h-11 min-w-11 items-center justify-center rounded-md border border-border-default px-3 text-body-sm disabled:opacity-40"
            aria-label={t('pagination.previousPage')}
          >
            ←
          </button>
          <span className="text-body-sm text-text-secondary">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="flex h-11 min-w-11 items-center justify-center rounded-md border border-border-default px-3 text-body-sm disabled:opacity-40"
            aria-label={t('pagination.nextPage')}
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
