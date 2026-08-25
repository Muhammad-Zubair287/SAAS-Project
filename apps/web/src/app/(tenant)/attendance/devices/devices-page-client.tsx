'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../../components/common/page-header';
import { LoadingSpinner } from '../../../../components/feedback/loading-spinner';
import { EmptyState } from '../../../../components/feedback/empty-state';
import { buttonVariants } from '../../../../components/ui/button';
import { PermissionGate } from '../../../../lib/permissions';
import { usePermissions } from '../../../../lib/permissions/use-permissions';
import { usePagination } from '../../../../hooks/use-pagination';
import { useDebounce } from '../../../../hooks/use-debounce';
import { ROUTES } from '../../../../constants/routes.constants';
import {
  ATTENDANCE_CAPTURE_PERMISSIONS,
  ATTENDANCE_DEVICE_STATUSES,
} from '../../../../modules/attendance/constants/attendance-capture.constants';
import { useAttendanceDevices } from '../../../../modules/attendance/hooks/use-attendance-devices';
import { useAttendanceDeviceHealth } from '../../../../modules/attendance/hooks/use-attendance-capture-health';
import { DevicesTable } from '../../../../modules/attendance/components/devices-table';
import type {
  AttendanceDeviceHealth,
  AttendanceDeviceStatus,
  ListAttendanceDevicesParams,
} from '../../../../modules/attendance/types/attendance-capture.types';

export function DevicesPageClient() {
  const t = useTranslations('attendance.devices');
  const tn = useTranslations('tenant.nav');
  const router = useRouter();
  const { hasPermission, status: authStatus } = usePermissions();
  const canRead = hasPermission(ATTENDANCE_CAPTURE_PERMISSIONS.DEVICE_READ);
  const canManage = hasPermission(ATTENDANCE_CAPTURE_PERMISSIONS.DEVICE_MANAGE);
  const canReadHealth = hasPermission(
    ATTENDANCE_CAPTURE_PERMISSIONS.DEVICE_HEARTBEAT_READ,
  );

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [statusFilter, setStatusFilter] = useState<AttendanceDeviceStatus | ''>(
    '',
  );
  const { page, pageSize, goToPage: setPage } = usePagination();

  const params: ListAttendanceDevicesParams = {
    page,
    pageSize,
    sortBy: 'name',
    sortOrder: 'asc',
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
  };

  const { data, isLoading, isError, refetch } = useAttendanceDevices(params, {
    enabled: canRead,
  });
  const healthEnabled = canReadHealth && canRead;
  const healthQuery = useAttendanceDeviceHealth({ enabled: healthEnabled });

  useEffect(() => {
    if (authStatus !== 'loading' && !canRead) {
      router.replace(ROUTES.AUTH.FORBIDDEN);
    }
  }, [authStatus, canRead, router]);

  const devices = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = data?.meta?.totalPages ?? 1;

  const healthByDeviceId = useMemo(() => {
    if (!healthEnabled) return {} as Record<string, AttendanceDeviceHealth>;
    const list = healthQuery.data?.data ?? [];
    return Object.fromEntries(list.map((h) => [h.deviceId, h]));
  }, [healthEnabled, healthQuery.data?.data]);

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

  const showEmpty =
    !isLoading && !isError && devices.length === 0 && !debouncedSearch && !statusFilter;

  return (
    <div className="space-y-6" aria-label={t('a11y.page')}>
      <PageHeader
        title={t('title')}
        description={t('purpose')}
        breadcrumbs={[
          { label: tn('dashboard'), href: ROUTES.TENANT.DASHBOARD },
          { label: tn('timeAttendance'), href: ROUTES.TENANT.ATTENDANCE.ROOT },
          { label: t('title') },
        ]}
        actions={
          <PermissionGate permission={ATTENDANCE_CAPTURE_PERMISSIONS.DEVICE_MANAGE}>
            <Link
              href={ROUTES.TENANT.ATTENDANCE.DEVICE_NEW}
              className={buttonVariants({ variant: 'primary' })}
            >
              {t('actions.register')}
            </Link>
          </PermissionGate>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1">
          <label htmlFor="device-search" className="sr-only">
            {t('filters.search')}
          </label>
          <input
            id="device-search"
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t('filters.searchPlaceholder')}
            className="w-full rounded-md border border-border-default bg-surface-primary py-2.5 pl-4 pr-10 text-body-md placeholder:text-text-secondary focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20"
          />
        </div>
        <label htmlFor="device-status" className="sr-only">
          {t('filters.status')}
        </label>
        <select
          id="device-status"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as AttendanceDeviceStatus | '');
            setPage(1);
          }}
          className="rounded-md border border-border-default bg-surface-primary px-3 py-2.5 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20"
        >
          <option value="">{t('filters.allStatuses')}</option>
          {ATTENDANCE_DEVICE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`status.${s}`)}
            </option>
          ))}
        </select>
      </div>

      {!isLoading && !isError && total > 0 && (
        <p className="text-body-sm text-text-secondary">
          {t('pagination.showing', {
            from: Math.min((page - 1) * pageSize + 1, total),
            to: Math.min(page * pageSize, total),
            total,
          })}
        </p>
      )}

      {showEmpty ? (
        <div className="rounded-xl border border-border-default bg-surface-primary">
          <EmptyState
            title={t('empty.title')}
            description={t('empty.description')}
            action={
              canManage ? (
                <Link
                  href={ROUTES.TENANT.ATTENDANCE.DEVICE_NEW}
                  className={buttonVariants({ variant: 'primary' })}
                >
                  {t('actions.registerFirst')}
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <DevicesTable
          data={devices}
          healthByDeviceId={healthByDeviceId}
          showHealth={healthEnabled}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
          canManage={canManage}
        />
      )}

      {!isError && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="flex h-11 min-w-11 items-center justify-center rounded-md border border-border-default px-3 text-body-sm disabled:opacity-40"
            aria-label={t('pagination.previous')}
          >
            ←
          </button>
          <span className="text-body-sm text-text-secondary">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="flex h-11 min-w-11 items-center justify-center rounded-md border border-border-default px-3 text-body-sm disabled:opacity-40"
            aria-label={t('pagination.next')}
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
