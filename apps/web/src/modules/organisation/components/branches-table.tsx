'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { DataTable, type Column } from '../../../components/common/data-table';
import { OrgStatusBadge } from './org-status-badge';
import type { Branch } from '../types/organisation.types';
import { ROUTES } from '../../../constants/routes.constants';

interface BranchesTableProps {
  data: Branch[];
  isLoading?: boolean;
}

export function BranchesTable({ data, isLoading }: BranchesTableProps) {
  const t = useTranslations();
  const router = useRouter();

  const columns: Column<Branch>[] = [
    {
      key: 'name',
      header: t('organisation.branches.columns.name'),
      render: (row) => (
        <div>
          <p className="font-medium text-text-primary">{row.name}</p>
          {row.isHeadOffice && (
            <span className="text-caption text-brand-teal-500">{t('organisation.branches.headOffice')}</span>
          )}
        </div>
      ),
    },
    {
      key: 'code',
      header: t('organisation.branches.columns.code'),
      width: '100px',
      render: (row) => <span className="font-mono text-body-sm">{row.code}</span>,
    },
    {
      key: 'city',
      header: t('organisation.branches.columns.city'),
      render: (row) => (
        <span className="text-body-sm text-text-secondary">
          {[row.city, row.countryCode].filter(Boolean).join(', ') || '—'}
        </span>
      ),
    },
    {
      key: 'timezone',
      header: t('organisation.branches.columns.timezone'),
      render: (row) => <span className="text-body-sm text-text-secondary">{row.timezone}</span>,
    },
    {
      key: 'status',
      header: t('organisation.branches.columns.status'),
      width: '110px',
      render: (row) => <OrgStatusBadge status={row.status} />,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      keyExtractor={(row) => row.id}
      emptyTitle={t('organisation.branches.empty.title')}
      emptyDescription={t('organisation.branches.empty.description')}
      onRowClick={(row) => router.push(ROUTES.TENANT.ORGANISATION.BRANCH_DETAIL(row.id))}
    />
  );
}
