'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../components/common/page-header';
import { TenantsTable } from '../../../modules/platform/components/tenants-table';
import { SuspendTenantDialog } from '../../../modules/platform/components/suspend-tenant-dialog';
import { SupportGrantDialog } from '../../../modules/platform/components/support-grant-dialog';
import { ChangePlanDialog } from '../../../modules/platform/components/change-plan-dialog';
import { useTenants, usePlans } from '../../../modules/platform/hooks/use-tenants';
import { usePagination } from '../../../hooks/use-pagination';
import { useDebounce } from '../../../hooks/use-debounce';
import type { TenantStatus, TenantSummary } from '../../../modules/platform/types/platform.types';
import { LAUNCH_COUNTRY_CODES } from '../../../modules/platform/constants/platform.constants';
import { ROUTES } from '../../../constants/routes.constants';
import { PermissionGate } from '../../../lib/permissions/permission-gate';
import { PLATFORM_PERMISSIONS } from '../../../lib/permissions/constants';

interface TenantsPageClientProps {
  title: string;
  description: string;
}

export function TenantsPageClient({ title, description }: TenantsPageClientProps) {
  const t = useTranslations();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [statusFilter, setStatusFilter] = useState<TenantStatus | ''>('');
  const [planFilter, setPlanFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [trialEndingBefore, setTrialEndingBefore] = useState('');
  const [usageThreshold, setUsageThreshold] = useState('');
  const [suspendTarget, setSuspendTarget] = useState<TenantSummary | null>(null);
  const [supportTarget, setSupportTarget] = useState<TenantSummary | null>(null);
  const [planTarget, setPlanTarget] = useState<TenantSummary | null>(null);
  const { page, pageSize, goToPage: setPage } = usePagination();
  const { data: plansData } = usePlans();

  const { data, isLoading, isError, refetch } = useTenants({
    page,
    pageSize,
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
    planKey: planFilter || undefined,
    countryCode: countryFilter || undefined,
    createdFrom: createdFrom || undefined,
    createdTo: createdTo || undefined,
    trialEndingBefore: trialEndingBefore || undefined,
    minSeatUtilisationPct: usageThreshold ? Number(usageThreshold) : undefined,
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
          <PermissionGate permission={PLATFORM_PERMISSIONS.TENANT_CREATE}>
            <Link
              href={ROUTES.PLATFORM.TENANTS_NEW}
              className="rounded-md bg-brand-blue-600 px-4 py-2 text-body-md font-semibold text-white hover:bg-blue-700"
            >
              {t('platform.tenants.createButton')}
            </Link>
          </PermissionGate>
        }
      />

      <div className="space-y-3 rounded-xl border border-border-default bg-surface-primary p-4">
        <div className="min-w-0">
          <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="tenant-search">{t('platform.tenants.searchPlaceholder')}</label>
          <input
            id="tenant-search"
            type="search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={t('platform.tenants.searchPlaceholder')}
            className="w-full rounded-md border border-border-default bg-surface-primary py-2 px-3 text-body-md placeholder:text-text-secondary focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="status-filter">{t('platform.tenants.columns.status')}</label>
            <select id="status-filter" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as TenantStatus | ''); setPage(1); }} className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md">
              <option value="">{t('platform.tenants.filters.allStatuses')}</option>
              <option value="DRAFT">{t('platform.tenants.status.draft')}</option>
              <option value="TRIAL">{t('platform.tenants.status.trial')}</option>
              <option value="ACTIVE">{t('platform.tenants.status.active')}</option>
              <option value="GRACE">{t('platform.tenants.status.grace')}</option>
              <option value="SUSPENDED">{t('platform.tenants.status.suspended')}</option>
              <option value="CLOSED">{t('platform.tenants.status.closed')}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="country-filter">{t('platform.tenants.columns.country')}</label>
            <select id="country-filter" value={countryFilter} onChange={(e) => { setCountryFilter(e.target.value); setPage(1); }} className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md">
              <option value="">{t('platform.tenants.filters.allCountries')}</option>
              {LAUNCH_COUNTRY_CODES.map((code) => (
                <option key={code} value={code}>{t(`platform.catalogue.countries.${code}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="plan-filter">{t('platform.tenants.columns.plan')}</label>
            <select id="plan-filter" value={planFilter} onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }} className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md">
              <option value="">{t('platform.tenants.filters.allPlans')}</option>
              {(plansData?.data ?? []).map((p) => (
                <option key={p.id} value={p.code}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="usage-threshold">{t('platform.tenants.filters.usageThreshold')}</label>
            <select id="usage-threshold" value={usageThreshold} onChange={(e) => { setUsageThreshold(e.target.value); setPage(1); }} className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md">
              <option value="">{t('platform.tenants.filters.usageThresholdAll')}</option>
              <option value="50">{t('platform.tenants.filters.usageThreshold50')}</option>
              <option value="80">{t('platform.tenants.filters.usageThreshold80')}</option>
              <option value="90">{t('platform.tenants.filters.usageThreshold90')}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="created-from">{t('platform.tenants.filters.createdFrom')}</label>
            <input id="created-from" type="date" value={createdFrom} onChange={(e) => { setCreatedFrom(e.target.value); setPage(1); }} className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md" />
          </div>
          <div>
            <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="created-to">{t('platform.tenants.filters.createdTo')}</label>
            <input id="created-to" type="date" value={createdTo} onChange={(e) => { setCreatedTo(e.target.value); setPage(1); }} className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md" />
          </div>
          <div>
            <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="trial-before">{t('platform.tenants.filters.trialEndingBefore')}</label>
            <input id="trial-before" type="date" value={trialEndingBefore} onChange={(e) => { setTrialEndingBefore(e.target.value); setPage(1); }} className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md" />
          </div>
        </div>
      </div>

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
        onSuspend={setSuspendTarget}
        onSupport={setSupportTarget}
        onChangePlan={setPlanTarget}
      />

      {!isError && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button type="button" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="flex h-11 min-w-11 items-center justify-center rounded-md border border-border-default px-3 text-body-sm disabled:opacity-40" aria-label={t('pagination.previousPage')}>←</button>
          <span className="text-body-sm text-text-secondary">{page} / {totalPages}</span>
          <button type="button" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="flex h-11 min-w-11 items-center justify-center rounded-md border border-border-default px-3 text-body-sm disabled:opacity-40" aria-label={t('pagination.nextPage')}>→</button>
        </div>
      )}

      {suspendTarget && (
        <SuspendTenantDialog
          tenantId={suspendTarget.id}
          tenantName={suspendTarget.displayName}
          open
          onClose={() => setSuspendTarget(null)}
        />
      )}
      {supportTarget && (
        <SupportGrantDialog
          tenantId={supportTarget.id}
          open
          onClose={() => setSupportTarget(null)}
        />
      )}
      {planTarget && (
        <ChangePlanDialog
          tenantId={planTarget.id}
          currentPlanKey={planTarget.planKey}
          open
          onClose={() => setPlanTarget(null)}
        />
      )}
    </div>
  );
}
