'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/common/page-header';
import { DataTable, type Column } from '@/components/common/data-table';
import { LoadingSpinner } from '@/components/feedback/loading-spinner';
import { buttonVariants } from '@/components/ui/button';
import { PermissionGate } from '@/lib/permissions';
import { usePermissions } from '@/lib/permissions/use-permissions';
import { ROUTES } from '@/constants/routes.constants';
import {
  ROSTER_PERMISSIONS,
} from '@/modules/shifts/constants/shift.constants';
import { useShiftAssignments } from '@/modules/shifts/hooks/use-shift-assignments';
import type { ShiftAssignment } from '@/modules/shifts/types/shift-assignment.types';

export function AssignmentsPageClient() {
  const t = useTranslations('shifts.assignments');
  const ts = useTranslations('shifts');
  const tn = useTranslations('tenant.nav');
  const tc = useTranslations('common');
  const router = useRouter();
  const { hasPermission, status } = usePermissions();
  const canRead = hasPermission(ROSTER_PERMISSIONS.READ);
  const [page, setPage] = useState(1);

  const listQuery = useShiftAssignments({ page, pageSize: 20 });

  useEffect(() => {
    if (status !== 'loading' && !canRead) {
      router.replace(ROUTES.AUTH.FORBIDDEN);
    }
  }, [status, canRead, router]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  if (!canRead) return null;

  const rows = listQuery.data?.data ?? [];
  const totalPages = listQuery.data?.meta?.totalPages ?? 1;

  const columns: Column<ShiftAssignment>[] = [
    {
      key: 'employee',
      header: t('columns.employee'),
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-body-sm text-text-primary">
            {row.employeeName?.trim() || '—'}
          </p>
          <p dir="ltr" className="truncate font-mono text-caption text-text-secondary">
            {row.employeeId}
          </p>
        </div>
      ),
    },
    {
      key: 'shift',
      header: t('columns.shift'),
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-body-sm text-text-primary">
            {row.shiftName?.trim() || '—'}
          </p>
          <p dir="ltr" className="truncate font-mono text-caption text-text-secondary">
            {row.shiftCode?.trim() || row.shiftId}
          </p>
        </div>
      ),
    },
    {
      key: 'range',
      header: t('columns.range'),
      render: (row) => (
        <span dir="ltr" className="tabular-nums text-body-sm">
          {row.effectiveFrom}
          {' → '}
          {row.effectiveTo ?? t('openEnded')}
        </span>
      ),
    },
    {
      key: 'source',
      header: t('columns.source'),
      render: (row) => row.assignmentSource,
    },
    {
      key: 'location',
      header: t('columns.location'),
      render: (row) =>
        row.branchName?.trim() || row.branchId ? (
          <div className="min-w-0">
            <p className="truncate text-body-sm text-text-primary">
              {row.branchName?.trim() || '—'}
            </p>
            {row.branchId ? (
              <p
                dir="ltr"
                className="truncate font-mono text-caption text-text-secondary"
              >
                {row.branchId}
              </p>
            ) : null}
          </div>
        ) : (
          '—'
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
        breadcrumbs={[
          { label: tn('dashboard'), href: ROUTES.TENANT.DASHBOARD },
          { label: tn('timeAttendance'), href: ROUTES.TENANT.ATTENDANCE.ROOT },
          { label: ts('title'), href: ROUTES.TENANT.SHIFTS.ROOT },
          { label: t('breadcrumb') },
        ]}
        actions={
          <PermissionGate permission={ROSTER_PERMISSIONS.ASSIGN}>
            <Link
              href={ROUTES.TENANT.SHIFTS.ASSIGN}
              className={buttonVariants({ variant: 'primary' })}
            >
              {t('actions.assign')}
            </Link>
          </PermissionGate>
        }
      />

      <DataTable
        columns={columns}
        data={rows}
        isLoading={listQuery.isLoading}
        isError={listQuery.isError}
        onRetry={() => void listQuery.refetch()}
        keyExtractor={(row) => row.id}
        caption={t('a11y.table')}
        emptyTitle={t('empty.title')}
        emptyDescription={t('empty.description')}
        errorTitle={t('errors.loadFailed')}
        retryLabel={tc('retry')}
      />

      {totalPages > 1 && (
        <div className="flex gap-2">
          <button
            type="button"
            className={buttonVariants({ variant: 'secondary' })}
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            {tc('previous')}
          </button>
          <span className="self-center text-body-sm text-text-secondary">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            className={buttonVariants({ variant: 'secondary' })}
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            {tc('next')}
          </button>
        </div>
      )}
    </div>
  );
}
