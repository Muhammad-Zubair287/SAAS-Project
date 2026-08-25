'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../../components/common/page-header';
import { LoadingSpinner } from '../../../../components/feedback/loading-spinner';
import { EmptyState } from '../../../../components/feedback/empty-state';
import { usePermissions } from '../../../../lib/permissions/use-permissions';
import { usePagination } from '../../../../hooks/use-pagination';
import { ROUTES } from '../../../../constants/routes.constants';
import {
  ATTENDANCE_CAPTURE_PERMISSIONS,
  OFFLINE_SESSION_STATUSES,
} from '../../../../modules/attendance/constants/attendance-capture.constants';
import { useOfflineSessions } from '../../../../modules/attendance/hooks/use-attendance-offline';
import { useAttendanceDevices } from '../../../../modules/attendance/hooks/use-attendance-devices';
import { OfflineSessionsTable } from '../../../../modules/attendance/components/offline-sessions-table';
import type { ListOfflineSessionsParams } from '../../../../modules/attendance/types/attendance-capture.types';

/** Convert date input (YYYY-MM-DD) to ISO8601 bounds for ListOfflineSessionsDto. */
function toIsoStart(date: string): string {
  return `${date}T00:00:00.000Z`;
}

function toIsoEnd(date: string): string {
  return `${date}T23:59:59.999Z`;
}

export function OfflineSessionsPageClient() {
  const t = useTranslations('attendance.offline');
  const tn = useTranslations('tenant.nav');
  const router = useRouter();
  const { hasPermission, status: authStatus } = usePermissions();
  const canRead = hasPermission(ATTENDANCE_CAPTURE_PERMISSIONS.OFFLINE_READ);
  const canReadDevices = hasPermission(
    ATTENDANCE_CAPTURE_PERMISSIONS.DEVICE_READ,
  );

  const [statusFilter, setStatusFilter] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const { page, pageSize, goToPage: setPage } = usePagination();

  const dateRangeInvalid =
    Boolean(dateFrom && dateTo) && dateTo < dateFrom;

  const params: ListOfflineSessionsParams | undefined = dateRangeInvalid
    ? undefined
    : {
        page,
        pageSize,
        sortOrder: 'desc',
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(deviceId ? { deviceId } : {}),
        ...(dateFrom ? { dateFrom: toIsoStart(dateFrom) } : {}),
        ...(dateTo ? { dateTo: toIsoEnd(dateTo) } : {}),
      };

  const { data, isLoading, isError, refetch } = useOfflineSessions(params, {
    enabled: canRead && !dateRangeInvalid && !!params,
  });

  const devicesQuery = useAttendanceDevices(
    { page: 1, pageSize: 100, sortBy: 'name', sortOrder: 'asc' },
    { enabled: canRead && canReadDevices },
  );

  useEffect(() => {
    if (authStatus !== 'loading' && !canRead) {
      router.replace(ROUTES.AUTH.FORBIDDEN);
    }
  }, [authStatus, canRead, router]);

  const sessions = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = data?.meta?.totalPages ?? 1;

  const deviceNames = useMemo(() => {
    if (!canReadDevices) return {} as Record<string, string>;
    const list = devicesQuery.data?.data ?? [];
    return Object.fromEntries(list.map((d) => [d.id, d.name]));
  }, [canReadDevices, devicesQuery.data?.data]);

  const devices = devicesQuery.data?.data ?? [];

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
    !isLoading &&
    !isError &&
    !dateRangeInvalid &&
    sessions.length === 0 &&
    !statusFilter &&
    !deviceId &&
    !dateFrom &&
    !dateTo;

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
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div>
          <label
            htmlFor="offline-status"
            className="mb-1 block text-label-md text-text-secondary"
          >
            {t('filters.status')}
          </label>
          <select
            id="offline-status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-border-default bg-surface-primary px-3 py-2.5 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20"
          >
            <option value="">{t('filters.allStatuses')}</option>
            {OFFLINE_SESSION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`sessionStatus.${s}`)}
              </option>
            ))}
          </select>
        </div>

        {canReadDevices && (
          <div>
            <label
              htmlFor="offline-device"
              className="mb-1 block text-label-md text-text-secondary"
            >
              {t('filters.device')}
            </label>
            <select
              id="offline-device"
              value={deviceId}
              onChange={(e) => {
                setDeviceId(e.target.value);
                setPage(1);
              }}
              className="min-w-[12rem] rounded-md border border-border-default bg-surface-primary px-3 py-2.5 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20"
            >
              <option value="">{t('filters.allDevices')}</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label
            htmlFor="offline-from"
            className="mb-1 block text-label-md text-text-secondary"
          >
            {t('filters.dateFrom')}
          </label>
          <input
            id="offline-from"
            type="date"
            dir="ltr"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-border-default bg-surface-primary px-3 py-2.5 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20"
          />
        </div>

        <div>
          <label
            htmlFor="offline-to"
            className="mb-1 block text-label-md text-text-secondary"
          >
            {t('filters.dateTo')}
          </label>
          <input
            id="offline-to"
            type="date"
            dir="ltr"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-border-default bg-surface-primary px-3 py-2.5 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20"
            aria-invalid={dateRangeInvalid}
          />
        </div>
      </div>

      {dateRangeInvalid && (
        <p role="alert" className="text-body-sm text-semantic-danger">
          {t('errors.dateRange')}
        </p>
      )}

      {!isLoading && !isError && !dateRangeInvalid && total > 0 && (
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
          />
        </div>
      ) : (
        !dateRangeInvalid && (
          <OfflineSessionsTable
            data={sessions}
            deviceNames={deviceNames}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => void refetch()}
          />
        )
      )}

      {!isError && !dateRangeInvalid && totalPages > 1 && (
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
