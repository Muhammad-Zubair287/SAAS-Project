'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { DataTable, type Column } from '../../../components/common/data-table';
import { OrgStatusBadge } from './org-status-badge';
import type { Position } from '../types/organisation.types';
import { ROUTES } from '../../../constants/routes.constants';

interface PositionsTableProps {
  data: Position[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export function PositionsTable({ data, isLoading, isError, onRetry }: PositionsTableProps) {
  const t = useTranslations();
  const router = useRouter();

  const columns: Column<Position>[] = [
    {
      key: 'title',
      header: t('organisation.positions.columns.title'),
      render: (row) => (
        <div>
          <p className="font-medium text-text-primary">{row.title}</p>
          {row.isManager && (
            <span className="text-caption text-brand-blue-600">{t('organisation.positions.managerRole')}</span>
          )}
        </div>
      ),
    },
    {
      key: 'code',
      header: t('organisation.positions.columns.code'),
      width: '100px',
      render: (row) => <span className="font-mono text-body-sm">{row.code}</span>,
    },
    {
      key: 'grade',
      header: t('organisation.positions.columns.grade'),
      width: '100px',
      render: (row) => <span className="text-body-sm text-text-secondary">{row.grade ?? '—'}</span>,
    },
    {
      key: 'status',
      header: t('organisation.positions.columns.status'),
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
      caption={t('organisation.positions.title')}
      emptyTitle={t('organisation.positions.empty.title')}
      emptyDescription={t('organisation.positions.empty.description')}
      onRowClick={(row) => router.push(ROUTES.TENANT.ORGANISATION.POSITION_DETAIL(row.id))}
    />
  );
}
