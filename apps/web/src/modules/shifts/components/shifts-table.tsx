'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { DataTable, type Column } from '../../../components/common/data-table';
import { buttonVariants } from '../../../components/ui/button';
import { PermissionGate } from '../../../lib/permissions';
import { ROUTES } from '../../../constants/routes.constants';
import { SHIFT_PERMISSIONS } from '../constants/shift.constants';
import type { Shift } from '../types/shift.types';
import { formatRequiredHours } from '../utils/shift-format';
import { ShiftStatusBadge } from './shift-status-badge';

interface ShiftsTableProps {
  data: Shift[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  policyNames: Record<string, string>;
  onDeactivate: (shift: Shift) => void;
}

export function ShiftsTable({
  data,
  isLoading,
  isError,
  onRetry,
  policyNames,
  onDeactivate,
}: ShiftsTableProps) {
  const t = useTranslations('shifts');
  const tc = useTranslations('common');

  const columns: Column<Shift>[] = [
    {
      key: 'name',
      header: t('columns.shift'),
      render: (row) => (
        <div>
          <p className="font-medium text-text-primary">{row.name}</p>
          <p dir="ltr" className="text-body-sm text-text-secondary">
            v{row.version}
          </p>
        </div>
      ),
    },
    {
      key: 'code',
      header: t('columns.code'),
      render: (row) => (
        <span dir="ltr" className="font-mono text-body-sm">
          {row.code}
        </span>
      ),
    },
    {
      key: 'times',
      header: t('columns.startEnd'),
      render: (row) => (
        <span dir="ltr" className="tabular-nums text-body-sm">
          {row.startLocalTime} – {row.endLocalTime}
        </span>
      ),
    },
    {
      key: 'requiredMinutes',
      header: t('columns.requiredHours'),
      render: (row) => (
        <span dir="ltr" className="tabular-nums">
          {formatRequiredHours(row.requiredMinutes)}
        </span>
      ),
    },
    {
      key: 'break',
      header: t('columns.break'),
      render: (row) => (
        <span dir="ltr" className="text-body-sm">
          {row.breakMinutes}m
          {row.breakPaid ? ` (${t('fields.paid')})` : ` (${t('fields.unpaid')})`}
        </span>
      ),
    },
    {
      key: 'overnight',
      header: t('columns.overnight'),
      render: (row) =>
        row.crossesMidnight ? (
          <BadgeOvernight label={t('overnight.yes')} />
        ) : (
          <span className="text-text-secondary">{t('overnight.no')}</span>
        ),
    },
    {
      key: 'policy',
      header: t('columns.policy'),
      render: (row) => (
        <span className="text-body-sm text-text-primary">
          {policyNames[row.attendancePolicyId] ?? '—'}
        </span>
      ),
    },
    {
      key: 'assigned',
      header: t('columns.assigned'),
      render: (row) => (
        <span dir="ltr" className="tabular-nums text-body-sm">
          {row.activeAssignmentCount ?? '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('columns.status'),
      render: (row) => <ShiftStatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: t('columns.actions'),
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <PermissionGate permission={SHIFT_PERMISSIONS.UPDATE}>
            <Link
              href={ROUTES.TENANT.SHIFTS.EDIT(row.id)}
              className={buttonVariants({ variant: 'secondary', size: 'sm' })}
            >
              {t('actions.edit')}
            </Link>
            {row.status === 'ACTIVE' && (
              <button
                type="button"
                className={buttonVariants({ variant: 'danger', size: 'sm' })}
                onClick={() => onDeactivate(row)}
              >
                {t('actions.deactivate')}
              </button>
            )}
          </PermissionGate>
        </div>
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
      keyExtractor={(row) => row.id}
      caption={t('a11y.table')}
      emptyTitle={t('empty.title')}
      emptyDescription={t('empty.description')}
      errorTitle={t('errors.loadFailed')}
      retryLabel={tc('retry')}
    />
  );
}

function BadgeOvernight({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-body-sm text-text-primary">
      <span
        className="h-2 w-2 rounded-full bg-semantic-info"
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
