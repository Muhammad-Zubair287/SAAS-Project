'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../components/common/page-header';
import { EmployeesTable } from '../../../modules/employee/components/employees-table';
import { useEmployees } from '../../../modules/employee/hooks/use-employees';
import { usePagination } from '../../../hooks/use-pagination';
import type { EmployeeStatus, EmploymentType } from '../../../modules/employee/types/employee.types';
import { ROUTES } from '../../../constants/routes.constants';

interface EmployeesPageClientProps {
  title: string;
  description: string;
}

export function EmployeesPageClient({ title, description }: EmployeesPageClientProps) {
  const t = useTranslations();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<EmploymentType | ''>('');
  const { page, pageSize, goToPage: setPage } = usePagination();

  const { data, isLoading } = useEmployees({
    page,
    pageSize,
    search: search || undefined,
    status: statusFilter || undefined,
    employmentType: typeFilter || undefined,
    sortBy: 'displayName',
    sortOrder: 'asc',
  });

  const totalPages = data?.meta?.totalPages ?? 1;
  const total = data?.meta?.total ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[
          { label: t('tenant.nav.dashboard'), href: ROUTES.TENANT.DASHBOARD },
          { label: title },
        ]}
        actions={
          <Link
            href={ROUTES.TENANT.EMPLOYEES.NEW}
            className="rounded-md bg-brand-blue-600 px-4 py-2 text-body-md font-semibold text-white hover:bg-brand-blue-500 transition-colors"
          >
            + {t('employees.createButton')}
          </Link>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <input
            type="search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={t('employees.searchPlaceholder')}
            className="w-full rounded-md border border-border-default bg-surface-primary py-2 pl-4 pr-10 text-body-md placeholder:text-text-secondary focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20"
          />
          <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 15.803a7.5 7.5 0 0 0 10.607 0z" />
          </svg>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as EmployeeStatus | ''); setPage(1); }}
          className="rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none"
        >
          <option value="">{t('employees.filters.allStatuses')}</option>
          <option value="ACTIVE">{t('employees.status.ACTIVE')}</option>
          <option value="PROBATION">{t('employees.status.PROBATION')}</option>
          <option value="ON_LEAVE">{t('employees.status.ON_LEAVE')}</option>
          <option value="INACTIVE">{t('employees.status.INACTIVE')}</option>
          <option value="TERMINATED">{t('employees.status.TERMINATED')}</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value as EmploymentType | ''); setPage(1); }}
          className="rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none"
        >
          <option value="">{t('employees.filters.allTypes')}</option>
          <option value="FULL_TIME">{t('employees.employmentType.FULL_TIME')}</option>
          <option value="PART_TIME">{t('employees.employmentType.PART_TIME')}</option>
          <option value="CONTRACT">{t('employees.employmentType.CONTRACT')}</option>
          <option value="INTERN">{t('employees.employmentType.INTERN')}</option>
        </select>
      </div>

      {!isLoading && (
        <p className="text-body-sm text-text-secondary">
          {t('pagination.showing', {
            from: Math.min((page - 1) * pageSize + 1, total),
            to: Math.min(page * pageSize, total),
            total,
          })}
        </p>
      )}

      <EmployeesTable data={data?.data ?? []} isLoading={isLoading} />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button type="button" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
            className="rounded-md border border-border-default px-3 py-1.5 text-body-sm disabled:opacity-40"
            aria-label={t('pagination.previousPage')}>←</button>
          <span className="text-body-sm text-text-secondary">{page} / {totalPages}</span>
          <button type="button" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
            className="rounded-md border border-border-default px-3 py-1.5 text-body-sm disabled:opacity-40"
            aria-label={t('pagination.nextPage')}>→</button>
        </div>
      )}
    </div>
  );
}
