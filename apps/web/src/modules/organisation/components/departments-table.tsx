'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { DataTable, type Column } from '../../../components/common/data-table';
import { OrgStatusBadge } from './org-status-badge';
import type { Department } from '../types/organisation.types';
import { ROUTES } from '../../../constants/routes.constants';

interface DepartmentsTableProps {
  data: Department[];
  isLoading?: boolean;
}

export function DepartmentsTable({ data, isLoading }: DepartmentsTableProps) {
  const t = useTranslations();
  const router = useRouter();

  const columns: Column<Department>[] = [
    {
      key: 'name',
      header: t('organisation.departments.columns.name'),
      render: (row) => <span className="font-medium text-text-primary">{row.name}</span>,
    },
    {
      key: 'code',
      header: t('organisation.departments.columns.code'),
      width: '100px',
      render: (row) => <span className="font-mono text-body-sm">{row.code}</span>,
    },
    {
      key: 'parentId',
      header: t('organisation.departments.columns.parent'),
      render: (row) => (
        <span className="text-body-sm text-text-secondary">{row.parentId ? '—' : t('organisation.departments.topLevel')}</span>
      ),
    },
    {
      key: 'status',
      header: t('organisation.departments.columns.status'),
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
      emptyTitle={t('organisation.departments.empty.title')}
      emptyDescription={t('organisation.departments.empty.description')}
      onRowClick={(row) => router.push(ROUTES.TENANT.ORGANISATION.DEPARTMENT_DETAIL(row.id))}
    />
  );
}
