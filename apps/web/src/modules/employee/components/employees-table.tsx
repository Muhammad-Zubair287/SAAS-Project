'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { DataTable, type Column } from '../../../components/common/data-table';
import { EmployeeStatusBadge } from './employee-status-badge';
import { EmployeeAvatar } from './employee-avatar';
import type { Employee } from '../types/employee.types';
import { ROUTES } from '../../../constants/routes.constants';

interface EmployeesTableProps {
  data: Employee[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export function EmployeesTable({ data, isLoading, isError, onRetry }: EmployeesTableProps) {
  const t = useTranslations();
  const router = useRouter();

  const columns: Column<Employee>[] = [
    {
      key: 'displayName',
      header: t('employees.columns.name'),
      render: (row) => (
        <div className="flex items-center gap-3">
          <EmployeeAvatar displayName={row.displayName} size="sm" />
          <div>
            <p className="font-medium text-text-primary">{row.displayName}</p>
            <p className="text-caption text-text-secondary">{row.employeeNumber}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'emailWork',
      header: t('employees.columns.email'),
      render: (row) => (
        <span className="text-body-sm text-text-secondary">{row.emailWork}</span>
      ),
    },
    {
      key: 'employmentType',
      header: t('employees.columns.type'),
      width: '130px',
      render: (row) => (
        <span className="text-body-sm">{t(`employees.employmentType.${row.employmentType}`)}</span>
      ),
    },
    {
      key: 'hireDate',
      header: t('employees.columns.hireDate'),
      width: '120px',
      render: (row) => (
        <span className="text-body-sm text-text-secondary">
          {new Date(row.hireDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('employees.columns.status'),
      width: '120px',
      render: (row) => <EmployeeStatusBadge status={row.status} />,
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
      caption={t('employees.directory.title')}
      emptyTitle={t('employees.empty.title')}
      emptyDescription={t('employees.empty.description')}
      onRowClick={(row) => router.push(ROUTES.TENANT.EMPLOYEES.DETAIL(row.id))}
    />
  );
}
