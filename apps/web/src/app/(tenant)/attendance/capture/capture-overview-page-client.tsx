'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/common/page-header';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingSpinner } from '@/components/feedback/loading-spinner';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/lib/permissions/use-permissions';
import { ROUTES } from '@/constants/routes.constants';
import { ATTENDANCE_CAPTURE_PERMISSIONS } from '@/modules/attendance/constants/attendance-capture.constants';
import { useAttendanceCaptureHealth } from '@/modules/attendance/hooks/use-attendance-capture-health';
import { useAttendanceDevices } from '@/modules/attendance/hooks/use-attendance-devices';
import { CaptureHealthSummary } from '@/modules/attendance/components/capture-health-summary';
import { AttentionRequiredDevices } from '@/modules/attendance/components/attention-required-devices';
import { CaptureOperationalStatus } from '@/modules/attendance/components/capture-operational-status';
import {
  countCaptureHealth,
  filterAttentionRequired,
} from '@/modules/attendance/utils/capture-health';

export function CaptureOverviewPageClient() {
  const t = useTranslations('attendance.capture');
  const tn = useTranslations('tenant.nav');
  const router = useRouter();
  const { hasPermission, status: authStatus } = usePermissions();
  const canRead = hasPermission(
    ATTENDANCE_CAPTURE_PERMISSIONS.DEVICE_HEARTBEAT_READ,
  );
  const canReadDevices = hasPermission(ATTENDANCE_CAPTURE_PERMISSIONS.DEVICE_READ);

  const healthQuery = useAttendanceCaptureHealth();
  const devicesQuery = useAttendanceDevices(
    { pageSize: 100 },
    { enabled: canReadDevices },
  );

  useEffect(() => {
    if (authStatus !== 'loading' && !canRead) {
      router.replace(ROUTES.AUTH.FORBIDDEN);
    }
  }, [authStatus, canRead, router]);

  const healthRows = healthQuery.data?.data ?? [];
  const counts = useMemo(() => countCaptureHealth(healthRows), [healthRows]);
  const attentionRows = useMemo(
    () => filterAttentionRequired(healthRows),
    [healthRows],
  );

  const deviceNames = useMemo(() => {
    if (!canReadDevices || devicesQuery.isError) {
      return {} as Record<string, string>;
    }
    const devices = devicesQuery.data?.data ?? [];
    return Object.fromEntries(devices.map((d) => [d.id, d.name]));
  }, [canReadDevices, devicesQuery.data?.data, devicesQuery.isError]);

  const lastUpdatedAt =
    healthQuery.dataUpdatedAt > 0
      ? new Date(healthQuery.dataUpdatedAt)
      : null;

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
        <p className="text-body-md text-text-secondary">{t('error')}</p>
      </div>
    );
  }

  const isInitialLoading = healthQuery.isLoading;
  const isEmpty =
    !isInitialLoading && !healthQuery.isError && healthRows.length === 0;

  async function handleRefresh() {
    await healthQuery.refetch();
    if (canReadDevices) {
      await devicesQuery.refetch();
    }
  }

  return (
    <div className="space-y-6" aria-label={t('a11y.page')}>
      <PageHeader
        title={t('title')}
        description={t('description')}
        breadcrumbs={[
          { label: tn('dashboard'), href: ROUTES.TENANT.DASHBOARD },
          { label: tn('timeAttendance'), href: ROUTES.TENANT.ATTENDANCE.ROOT },
          { label: t('title') },
        ]}
        actions={
          <Button
            variant="secondary"
            onClick={() => {
              void handleRefresh();
            }}
            isLoading={healthQuery.isFetching && !healthQuery.isLoading}
            aria-label={t('a11y.refresh')}
          >
            {t('actions.refresh')}
          </Button>
        }
      />

      {healthQuery.isError && (
        <div
          role="alert"
          className="rounded-lg border border-semantic-danger/30 bg-semantic-danger-bg p-4"
        >
          <p className="text-body-md font-medium text-semantic-danger-fg">
            {t('error')}
          </p>
          <Button
            variant="secondary"
            className="mt-3"
            onClick={() => {
              void healthQuery.refetch();
            }}
          >
            {t('retry')}
          </Button>
        </div>
      )}

      {isEmpty ? (
        <div className="rounded-lg border border-border-default bg-surface-primary">
          <EmptyState
            title={t('empty.title')}
            description={t('empty.description')}
          />
        </div>
      ) : (
        <>
          <CaptureHealthSummary
            counts={counts}
            isLoading={isInitialLoading}
          />

          {!healthQuery.isError && (
            <AttentionRequiredDevices
              rows={attentionRows}
              deviceNames={deviceNames}
              isLoading={isInitialLoading}
            />
          )}

          {!isInitialLoading && !healthQuery.isError && (
            <CaptureOperationalStatus
              lastUpdatedAt={lastUpdatedAt}
              rowCount={healthRows.length}
            />
          )}
        </>
      )}
    </div>
  );
}
