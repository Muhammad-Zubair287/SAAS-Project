'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { DataTable, type Column } from '../../../components/common/data-table';
import { TenantStatusBadge } from './tenant-status-badge';
import { RowActionsMenu } from './row-actions-menu';
import type { TenantSummary } from '../types/platform.types';
import { ROUTES } from '../../../constants/routes.constants';

interface TenantsTableProps {
  data: TenantSummary[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  compact?: boolean;
  onSuspend?: (tenant: TenantSummary) => void;
  onSupport?: (tenant: TenantSummary) => void;
  onChangePlan?: (tenant: TenantSummary) => void;
}

function formatUsage(row: TenantSummary, unavailable: string): string {
  if (row.activeEmployees == null && row.seatLimit == null) return '—';
  const used = row.activeEmployees != null ? row.activeEmployees.toLocaleString() : unavailable;
  const limit = row.seatLimit != null ? row.seatLimit.toLocaleString() : '—';
  return `${used} / ${limit}`;
}

function renewalLabel(row: TenantSummary): string {
  const iso = row.trialEndsAt ?? row.currentPeriodEnd;
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString();
}

export function TenantsTable({
  data,
  isLoading,
  isError,
  onRetry,
  compact,
  onSuspend,
  onSupport,
  onChangePlan,
}: TenantsTableProps) {
  const t = useTranslations();
  const router = useRouter();

  const columns: Column<TenantSummary>[] = [
    {
      key: 'displayName',
      header: t('platform.tenants.columns.name'),
      render: (row) => (
        <Link
          href={ROUTES.PLATFORM.TENANT_DETAIL(row.id)}
          className="font-medium text-brand-blue-600 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.displayName}
        </Link>
      ),
    },
    {
      key: 'slug',
      header: t('platform.tenants.columns.identifier'),
      width: '140px',
      render: (row) => <span className="text-body-sm ltr:font-mono">{row.slug}</span>,
    },
    {
      key: 'countryCode',
      header: t('platform.tenants.columns.country'),
      width: '80px',
      render: (row) => {
        const key = `platform.catalogue.countries.${row.countryCode}`;
        return (
          <span className="text-body-sm">
            {t.has(key) ? t(key) : <span className="ltr">{row.countryCode}</span>}
          </span>
        );
      },
    },
    {
      key: 'planId',
      header: t('platform.tenants.columns.plan'),
      width: '140px',
      render: (row) => (
        <span className="text-body-sm text-text-primary">{row.planName ?? row.planKey ?? '—'}</span>
      ),
    },
    {
      key: 'usage',
      header: t('platform.tenants.columns.usage'),
      width: '140px',
      render: (row) => (
        <span className="tabular-nums text-body-sm" title={row.activeEmployees == null ? t('platform.tenants.usage.noSnapshot') : undefined}>
          {formatUsage(row, t('platform.tenants.usageUnavailable'))}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('platform.tenants.columns.status'),
      width: '120px',
      render: (row) => <TenantStatusBadge status={row.status} />,
    },
    {
      key: 'createdAt',
      header: t('platform.tenants.columns.created'),
      width: '120px',
      render: (row) => (
        <span className="text-body-sm text-text-secondary">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'renewal',
      header: t('platform.tenants.columns.renewal'),
      width: '120px',
      render: (row) => <span className="text-body-sm text-text-secondary">{renewalLabel(row)}</span>,
    },
    {
      key: 'actions',
      header: t('platform.tenants.columns.actions'),
      width: '140px',
      render: (row) => {
        const overflowItems = [
          { key: 'edit', label: t('platform.tenants.rowActions.edit'), href: ROUTES.PLATFORM.TENANT_DETAIL(row.id) },
          ...((row.status === 'ACTIVE' || row.status === 'TRIAL' || row.status === 'GRACE' || row.status === 'DRAFT') && onChangePlan
            ? [{ key: 'plan', label: t('platform.tenants.actions.changePlan'), onSelect: () => onChangePlan(row) }]
            : []),
          ...((row.status === 'ACTIVE' || row.status === 'TRIAL' || row.status === 'GRACE') && onSuspend
            ? [{ key: 'suspend', label: t('platform.tenants.actions.suspend'), onSelect: () => onSuspend(row), tone: 'danger' as const }]
            : []),
          ...(onSupport
            ? [{ key: 'support', label: t('platform.tenants.actions.supportAccess'), onSelect: () => onSupport(row) }]
            : []),
          { key: 'audit', label: t('platform.tenants.actions.viewAudit'), href: `${ROUTES.PLATFORM.AUDIT}?tenantId=${encodeURIComponent(row.id)}` },
        ];
        return (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Link href={ROUTES.PLATFORM.TENANT_DETAIL(row.id)} className="rounded px-2 py-1 text-caption font-medium text-brand-blue-600 hover:underline">
              {t('platform.tenants.rowActions.open')}
            </Link>
            {!compact && <RowActionsMenu label={t('platform.tenants.rowActions.more')} items={overflowItems} />}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <div className="hidden md:block">
        <DataTable
          columns={columns}
          data={data}
          isLoading={isLoading}
          isError={isError}
          onRetry={onRetry}
          errorTitle={t('common.error')}
          retryLabel={t('common.retry')}
          keyExtractor={(row) => row.id}
          caption={t('platform.tenants.title')}
          emptyTitle={t('platform.tenants.empty.title')}
          emptyDescription={t('platform.tenants.empty.description')}
          compact={compact}
          onRowClick={(row) => router.push(ROUTES.PLATFORM.TENANT_DETAIL(row.id))}
        />
      </div>
      <div className="space-y-3 md:hidden">
        {isLoading && (
          <div className="flex min-h-48 items-center justify-center rounded-lg border border-border-default bg-surface-primary">
            <span className="text-body-sm text-text-secondary">{t('common.loading')}</span>
          </div>
        )}
        {isError && (
          <div className="rounded-lg border border-border-default bg-surface-primary p-6 text-center">
            <p className="text-body-md text-text-secondary">{t('common.error')}</p>
            {onRetry && (
              <button type="button" onClick={onRetry} className="mt-3 text-body-sm font-medium text-brand-blue-600">{t('common.retry')}</button>
            )}
          </div>
        )}
        {!isLoading && !isError && data.length === 0 && (
          <div className="rounded-lg border border-border-default bg-surface-primary p-6 text-center text-body-md text-text-secondary">
            {t('platform.tenants.empty.title')}
          </div>
        )}
        {!isLoading && !isError && data.map((row) => (
          <article key={row.id} className="rounded-xl border border-border-default bg-surface-primary p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={ROUTES.PLATFORM.TENANT_DETAIL(row.id)} className="font-semibold text-text-primary hover:text-brand-blue-600">
                  {row.displayName}
                </Link>
                <p className="mt-1 text-caption text-text-secondary ltr:font-mono">{row.slug}</p>
              </div>
              <TenantStatusBadge status={row.status} />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-body-sm">
              <div>
                <dt className="text-text-secondary">{t('platform.tenants.columns.plan')}</dt>
                <dd className="font-medium">{row.planName ?? row.planKey ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-text-secondary">{t('platform.tenants.columns.usage')}</dt>
                <dd className="font-medium tabular-nums">{formatUsage(row, t('platform.tenants.usageUnavailable'))}</dd>
              </div>
              <div>
                <dt className="text-text-secondary">{t('platform.tenants.columns.country')}</dt>
                <dd className="font-medium">{t.has(`platform.catalogue.countries.${row.countryCode}`) ? t(`platform.catalogue.countries.${row.countryCode}`) : row.countryCode}</dd>
              </div>
              <div>
                <dt className="text-text-secondary">{t('platform.tenants.columns.renewal')}</dt>
                <dd className="font-medium">{renewalLabel(row)}</dd>
              </div>
            </dl>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Link href={ROUTES.PLATFORM.TENANT_DETAIL(row.id)} className="text-caption font-medium text-brand-blue-600 hover:underline">
                {t('platform.tenants.rowActions.open')}
              </Link>
              <RowActionsMenu
                label={t('platform.tenants.rowActions.more')}
                items={[
                  { key: 'edit', label: t('platform.tenants.rowActions.edit'), href: ROUTES.PLATFORM.TENANT_DETAIL(row.id) },
                  ...((row.status === 'ACTIVE' || row.status === 'TRIAL' || row.status === 'GRACE' || row.status === 'DRAFT') && onChangePlan
                    ? [{ key: 'plan', label: t('platform.tenants.actions.changePlan'), onSelect: () => onChangePlan(row) }]
                    : []),
                  ...((row.status === 'ACTIVE' || row.status === 'TRIAL' || row.status === 'GRACE') && onSuspend
                    ? [{ key: 'suspend', label: t('platform.tenants.actions.suspend'), onSelect: () => onSuspend(row), tone: 'danger' as const }]
                    : []),
                  ...(onSupport
                    ? [{ key: 'support', label: t('platform.tenants.actions.supportAccess'), onSelect: () => onSupport(row) }]
                    : []),
                  { key: 'audit', label: t('platform.tenants.actions.viewAudit'), href: `${ROUTES.PLATFORM.AUDIT}?tenantId=${encodeURIComponent(row.id)}` },
                ]}
              />
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
