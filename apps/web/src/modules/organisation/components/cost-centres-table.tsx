'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { DataTable, type Column } from '../../../components/common/data-table';
import { OrgStatusBadge } from './org-status-badge';
import type { CostCentre } from '../types/organisation.types';
import { ROUTES } from '../../../constants/routes.constants';

interface CostCentresTableProps {
  data: CostCentre[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export function CostCentresTable({ data, isLoading, isError, onRetry }: CostCentresTableProps) {
  const t = useTranslations();
  const router = useRouter();

  const columns: Column<CostCentre>[] = [
    {
      key: 'name',
      header: t('organisation.costCentres.columns.name'),
      render: (row) => <span className="font-medium text-text-primary">{row.name}</span>,
    },
    {
      key: 'code',
      header: t('organisation.costCentres.columns.code'),
      width: '120px',
      render: (row) => <span className="font-mono text-body-sm">{row.code}</span>,
    },
    {
      key: 'description',
      header: t('organisation.costCentres.columns.description'),
      render: (row) => (
        <span className="text-body-sm text-text-secondary line-clamp-1">{row.description ?? '—'}</span>
      ),
    },
    {
      key: 'status',
      header: t('organisation.costCentres.columns.status'),
      width: '110px',
      render: (row) => <OrgStatusBadge status={row.status} />,
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
      caption={t('organisation.costCentres.title')}
      emptyTitle={t('organisation.costCentres.empty.title')}
      emptyDescription={t('organisation.costCentres.empty.description')}
      onRowClick={(row) => router.push(ROUTES.TENANT.ORGANISATION.COST_CENTRE_DETAIL(row.id))}
    />
  );
}
