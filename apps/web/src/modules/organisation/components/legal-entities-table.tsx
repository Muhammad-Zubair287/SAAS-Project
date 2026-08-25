'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { DataTable, type Column } from '../../../components/common/data-table';
import { OrgStatusBadge } from './org-status-badge';
import type { LegalEntity } from '../types/organisation.types';
import { ROUTES } from '../../../constants/routes.constants';

interface LegalEntitiesTableProps {
  data: LegalEntity[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export function LegalEntitiesTable({ data, isLoading, isError, onRetry }: LegalEntitiesTableProps) {
  const t = useTranslations();
  const router = useRouter();

  const columns: Column<LegalEntity>[] = [
    {
      key: 'name',
      header: t('organisation.legalEntities.columns.name'),
      render: (row) => (
        <div>
          <p className="font-medium text-text-primary">{row.name}</p>
          {row.isPrimary && (
            <span className="text-caption text-brand-blue-600">{t('organisation.legalEntities.primary')}</span>
          )}
        </div>
      ),
    },
    {
      key: 'countryCode',
      header: t('organisation.legalEntities.columns.country'),
      width: '80px',
      render: (row) => <span className="text-body-sm">{row.countryCode}</span>,
    },
    {
      key: 'currencyCode',
      header: t('organisation.legalEntities.columns.currency'),
      width: '90px',
      render: (row) => <span className="text-body-sm">{row.currencyCode}</span>,
    },
    {
      key: 'registrationNumber',
      header: t('organisation.legalEntities.columns.regNumber'),
      render: (row) => (
        <span className="text-body-sm text-text-secondary">{row.registrationNumber ?? '—'}</span>
      ),
    },
    {
      key: 'status',
      header: t('organisation.legalEntities.columns.status'),
      width: '110px',
      render: (row) => <OrgStatusBadge status={row.status} />,
    },
    {
      key: 'createdAt',
      header: t('organisation.legalEntities.columns.created'),
      width: '130px',
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
      caption={t('organisation.legalEntities.title')}
      emptyTitle={t('organisation.legalEntities.empty.title')}
      emptyDescription={t('organisation.legalEntities.empty.description')}
      onRowClick={(row) => router.push(ROUTES.TENANT.ORGANISATION.LEGAL_ENTITY_DETAIL(row.id))}
    />
  );
}
