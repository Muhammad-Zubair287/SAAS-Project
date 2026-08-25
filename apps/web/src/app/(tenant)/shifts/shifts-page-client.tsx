'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/common/page-header';
import { LoadingSpinner } from '@/components/feedback/loading-spinner';
import { Button, buttonVariants } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { PermissionGate } from '@/lib/permissions';
import { usePermissions } from '@/lib/permissions/use-permissions';
import { toast } from '@/lib/toast/store';
import { toApiError } from '@/lib/api/errors';
import { ROUTES } from '@/constants/routes.constants';
import { useAttendancePolicies } from '@/modules/attendance/hooks/use-attendance-policies';
import {
  ROSTER_PERMISSIONS,
  SHIFT_PERMISSIONS,
} from '@/modules/shifts/constants/shift.constants';
import { ShiftsTable } from '@/modules/shifts/components/shifts-table';
import { useShifts, useUpdateShift } from '@/modules/shifts/hooks/use-shifts';
import type { Shift } from '@/modules/shifts/types/shift.types';
import { isVersionConflict } from '@/modules/shifts/utils/shift-format';

export function ShiftsPageClient() {
  const t = useTranslations('shifts');
  const tn = useTranslations('tenant.nav');
  const router = useRouter();
  const { hasPermission, status: authStatus } = usePermissions();
  const canRead = hasPermission(SHIFT_PERMISSIONS.READ);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [deactivateTarget, setDeactivateTarget] = useState<Shift | null>(null);

  const params = {
    page,
    pageSize: 20,
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(statusFilter ? { status: statusFilter as 'ACTIVE' | 'INACTIVE' } : {}),
    sortBy: 'name' as const,
    sortOrder: 'asc' as const,
  };

  const listQuery = useShifts(params);
  const policiesQuery = useAttendancePolicies({ page: 1, limit: 50 });
  const deactivate = useUpdateShift(deactivateTarget?.id ?? '');

  useEffect(() => {
    if (authStatus !== 'loading' && !canRead) {
      router.replace(ROUTES.AUTH.FORBIDDEN);
    }
  }, [authStatus, canRead, router]);

  const shifts = listQuery.data?.data ?? [];
  const total = listQuery.data?.meta?.total ?? 0;
  const totalPages = listQuery.data?.meta?.totalPages ?? 1;
  const policyNames = useMemo(() => {
    const raw = policiesQuery.data as { data?: unknown } | undefined;
    const body = raw?.data;
    const list = Array.isArray(body)
      ? body
      : body &&
          typeof body === 'object' &&
          Array.isArray((body as { data?: unknown }).data)
        ? ((body as { data: { id: string; name: string }[] }).data)
        : [];
    return Object.fromEntries(list.map((p) => [p.id, p.name]));
  }, [policiesQuery.data]);

  async function confirmDeactivate() {
    if (!deactivateTarget) return;
    try {
      await deactivate.mutateAsync({
        payload: { status: 'INACTIVE' },
        ifMatch: deactivateTarget.rowVersion,
      });
      toast.success(t('success.deactivated'));
      setDeactivateTarget(null);
      void listQuery.refetch();
    } catch (err) {
      if (isVersionConflict(err)) {
        toast.error(t('conflict.description'));
        setDeactivateTarget(null);
        void listQuery.refetch();
        return;
      }
      toast.error(toApiError(err).message || t('errors.deactivateFailed'));
    }
  }

  if (authStatus === 'loading') {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!canRead) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <p className="text-body-md text-text-secondary">{t('forbidden')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
        breadcrumbs={[
          { label: tn('dashboard'), href: ROUTES.TENANT.DASHBOARD },
          { label: tn('timeAttendance'), href: ROUTES.TENANT.ATTENDANCE.ROOT },
          { label: t('title') },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <PermissionGate permission={ROSTER_PERMISSIONS.READ}>
              <Link
                href={ROUTES.TENANT.SHIFTS.ROSTER}
                className={buttonVariants({ variant: 'secondary' })}
              >
                {t('actions.viewRoster')}
              </Link>
            </PermissionGate>
            <PermissionGate permission={ROSTER_PERMISSIONS.READ}>
              <Link
                href={ROUTES.TENANT.SHIFTS.ASSIGNMENTS}
                className={buttonVariants({ variant: 'secondary' })}
              >
                {t('actions.viewAssignments')}
              </Link>
            </PermissionGate>
            <PermissionGate permission={ROSTER_PERMISSIONS.ASSIGN}>
              <Link
                href={ROUTES.TENANT.SHIFTS.ASSIGN}
                className={buttonVariants({ variant: 'secondary' })}
              >
                {t('actions.assign')}
              </Link>
            </PermissionGate>
            <PermissionGate permission={SHIFT_PERMISSIONS.CREATE}>
              <Link
                href={ROUTES.TENANT.SHIFTS.NEW}
                className={buttonVariants({ variant: 'primary' })}
              >
                {t('actions.create')}
              </Link>
            </PermissionGate>
          </div>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-[12rem] flex-1">
          <label htmlFor="shift-search" className="sr-only">
            {t('filters.search')}
          </label>
          <input
            id="shift-search"
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t('filters.searchPlaceholder')}
            className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2.5 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20"
          />
        </div>
        <div>
          <label
            htmlFor="shift-status"
            className="mb-1 block text-label-md text-text-secondary"
          >
            {t('filters.status')}
          </label>
          <select
            id="shift-status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-border-default bg-surface-primary px-3 py-2.5 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20"
          >
            <option value="">{t('filters.allStatuses')}</option>
            <option value="ACTIVE">{t('status.ACTIVE')}</option>
            <option value="INACTIVE">{t('status.INACTIVE')}</option>
          </select>
        </div>
      </div>

      {total > 0 && (
        <p className="text-body-sm text-text-secondary">
          {t('pagination.showing', {
            from: Math.min((page - 1) * 20 + 1, total),
            to: Math.min(page * 20, total),
            total,
          })}
        </p>
      )}

      <ShiftsTable
        data={shifts}
        isLoading={listQuery.isLoading}
        isError={listQuery.isError}
        onRetry={() => void listQuery.refetch()}
        policyNames={policyNames}
        onDeactivate={setDeactivateTarget}
      />

      {totalPages > 1 && (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            {t('pagination.previous')}
          </Button>
          <span className="self-center text-body-sm text-text-secondary">
            {page} / {totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            {t('pagination.next')}
          </Button>
        </div>
      )}

      <Dialog
        open={deactivateTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeactivateTarget(null);
        }}
        title={t('deactivate.title')}
        description={t('deactivate.description', {
          name: deactivateTarget?.name ?? '',
        })}
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDeactivateTarget(null)}
              disabled={deactivate.isPending}
            >
              {t('actions.cancel')}
            </Button>
            <Button
              variant="danger"
              isLoading={deactivate.isPending}
              onClick={() => void confirmDeactivate()}
            >
              {t('actions.deactivate')}
            </Button>
          </>
        }
      />
    </div>
  );
}
