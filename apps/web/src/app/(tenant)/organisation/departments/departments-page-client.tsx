'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../../components/common/page-header';
import { DepartmentsTable } from '../../../../modules/organisation/components/departments-table';
import { useDepartments } from '../../../../modules/organisation/hooks/use-departments';
import { useLegalEntities } from '../../../../modules/organisation/hooks/use-legal-entities';
import { usePagination } from '../../../../hooks/use-pagination';
import { useDebounce } from '../../../../hooks/use-debounce';
import type { OrgEntityStatus } from '../../../../modules/organisation/types/organisation.types';
import { ROUTES } from '../../../../constants/routes.constants';

interface DepartmentsPageClientProps {
  title: string;
  description: string;
}

export function DepartmentsPageClient({ title, description }: DepartmentsPageClientProps) {
  const t = useTranslations();
  const [search, setSearch] = useState('');
  // Debounced so typing does not fire one request per keystroke.
  const debouncedSearch = useDebounce(search);
  const [statusFilter, setStatusFilter] = useState<OrgEntityStatus | ''>('');
  const [legalEntityId, setLegalEntityId] = useState('');
  const { page, pageSize, goToPage: setPage } = usePagination();

  const { data: leData } = useLegalEntities();
  const { data, isLoading, isError, refetch } = useDepartments({
    page,
    pageSize,
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
    legalEntityId: legalEntityId || undefined,
    sortBy: 'name',
    sortOrder: 'asc',
  });

  const totalPages = data?.meta?.totalPages ?? 1;
  const total = data?.meta?.total ?? 0;
  const legalEntities = leData?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[
          { label: t('tenant.nav.dashboard'), href: ROUTES.TENANT.DASHBOARD },
          { label: t('tenant.nav.organisation'), href: ROUTES.TENANT.ORGANISATION.ROOT },
          { label: title },
        ]}
        actions={
          <Link
            href={ROUTES.TENANT.ORGANISATION.DEPARTMENT_NEW}
            className="rounded-md bg-brand-blue-600 px-4 py-2 text-body-md font-semibold text-white hover:bg-brand-blue-500 transition-colors"
          >
            + {t('organisation.departments.createButton')}
          </Link>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1">
          <input
            type="search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={t('organisation.departments.searchPlaceholder')}
            className="w-full rounded-md border border-border-default bg-surface-primary py-2 pl-4 pr-10 text-body-md placeholder:text-text-secondary focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20"
          />
          <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 15.803a7.5 7.5 0 0 0 10.607 0z" />
          </svg>
        </div>
        <select value={legalEntityId} onChange={(e) => { setLegalEntityId(e.target.value); setPage(1); }}
          className="rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none">
          <option value="">{t('organisation.filters.allLegalEntities')}</option>
          {legalEntities.map((le) => <option key={le.id} value={le.id}>{le.name}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as OrgEntityStatus | ''); setPage(1); }}
          className="rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none">
          <option value="">{t('organisation.filters.allStatuses')}</option>
          <option value="ACTIVE">{t('organisation.status.active')}</option>
          <option value="INACTIVE">{t('organisation.status.inactive')}</option>
        </select>
      </div>

      {!isLoading && !isError && (
        <p className="text-body-sm text-text-secondary">
          {t('pagination.showing', { from: Math.min((page - 1) * pageSize + 1, total), to: Math.min(page * pageSize, total), total })}
        </p>
      )}

      <DepartmentsTable
        data={data?.data ?? []}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => { void refetch(); }}
      />

      {!isError && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button type="button" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
            className="flex h-11 min-w-11 items-center justify-center rounded-md border border-border-default px-3 text-body-sm disabled:opacity-40"
            aria-label={t('pagination.previousPage')}>←</button>
          <span className="text-body-sm text-text-secondary">{page} / {totalPages}</span>
          <button type="button" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
            className="flex h-11 min-w-11 items-center justify-center rounded-md border border-border-default px-3 text-body-sm disabled:opacity-40"
            aria-label={t('pagination.nextPage')}>→</button>
        </div>
      )}
    </div>
  );
}
