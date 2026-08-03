'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { DataTable, type Column } from '../../../components/common/data-table';
import { TenantStatusBadge } from './tenant-status-badge';
import type { TenantSummary } from '../types/platform.types';
import { ROUTES } from '../../../constants/routes.constants';

interface TenantsTableProps {
  data: TenantSummary[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export function TenantsTable({ data, isLoading, isError, onRetry }: TenantsTableProps) {
  const t = useTranslations();
  const router = useRouter();

  const columns: Column<TenantSummary>[] = [
    {
      key: 'displayName',
      header: t('platform.tenants.columns.name'),
      render: (row) => (
        <span className="font-medium text-text-primary">{row.displayName}</span>
      ),
    },
    {
      key: 'countryCode',
      header: t('platform.tenants.columns.country'),
      width: '80px',
      render: (row) => <span className="text-body-sm">{row.countryCode}</span>,
    },
    {
      key: 'planId',
      header: t('platform.tenants.columns.plan'),
      width: '120px',
      render: (row) => (
        <span className="capitalize text-body-sm">{row.planId ?? '—'}</span>
      ),
    },
    {
      key: 'seatLimit',
      header: t('platform.tenants.columns.seats'),
      width: '100px',
      render: (row) => (
        <span className="tabular-nums text-body-sm">{row.seatLimit != null ? row.seatLimit.toLocaleString() : '—'}</span>
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
      width: '140px',
      render: (row) => (
        <span className="text-body-sm text-text-secondary">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
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
      onRowClick={(row) => router.push(ROUTES.PLATFORM.TENANT_DETAIL(row.id))}
    />
  );
}
