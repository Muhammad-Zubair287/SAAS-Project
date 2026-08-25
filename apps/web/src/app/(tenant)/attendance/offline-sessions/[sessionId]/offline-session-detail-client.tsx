'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/common/page-header';
import { LoadingSpinner } from '@/components/feedback/loading-spinner';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/lib/permissions/use-permissions';
import { ROUTES } from '@/constants/routes.constants';
import { ATTENDANCE_CAPTURE_PERMISSIONS } from '@/modules/attendance/constants/attendance-capture.constants';
import {
  useOfflineSession,
  usePendingOfflineEvents,
} from '@/modules/attendance/hooks/use-attendance-offline';
import { useAttendanceDevices } from '@/modules/attendance/hooks/use-attendance-devices';
import { OfflineSessionStatusBadge } from '@/modules/attendance/components/offline-session-status-badge';
import { OfflinePendingEventsTable } from '@/modules/attendance/components/offline-pending-events-table';
import { OfflineReplayDialog } from '@/modules/attendance/components/offline-replay-dialog';
import { OfflineCloseDialog } from '@/modules/attendance/components/offline-close-dialog';
import { getOfflineSessionActions } from '@/modules/attendance/utils/offline-session-lifecycle';
import { shortenDeviceId } from '@/modules/attendance/utils/capture-health';
import {
  formatDisplayDateTime,
  TECH_VALUE_CLASS,
} from '@/modules/attendance/utils/geofence-format';

interface OfflineSessionDetailClientProps {
  sessionId: string;
}

function DetailField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <dt className="text-label-md font-medium text-text-secondary">{label}</dt>
      <dd className="mt-0.5 text-body-md text-text-primary">{children}</dd>
    </div>
  );
}

export function OfflineSessionDetailClient({
  sessionId,
}: OfflineSessionDetailClientProps) {
  const t = useTranslations('attendance.offline');
  const tn = useTranslations('tenant.nav');
  const router = useRouter();
  const { hasPermission, status: authStatus } = usePermissions();
  const canRead = hasPermission(ATTENDANCE_CAPTURE_PERMISSIONS.OFFLINE_READ);
  const canManage = hasPermission(
    ATTENDANCE_CAPTURE_PERMISSIONS.OFFLINE_MANAGE,
  );
  const canReadDevices = hasPermission(
    ATTENDANCE_CAPTURE_PERMISSIONS.DEVICE_READ,
  );

  const sessionQuery = useOfflineSession(sessionId, { enabled: canRead });
  const pendingQuery = usePendingOfflineEvents(sessionId, { enabled: canRead });
  const devicesQuery = useAttendanceDevices(
    { page: 1, pageSize: 100, sortBy: 'name', sortOrder: 'asc' },
    { enabled: canRead && canReadDevices },
  );

  const [replayOpen, setReplayOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);

  useEffect(() => {
    if (authStatus !== 'loading' && !canRead) {
      router.replace(ROUTES.AUTH.FORBIDDEN);
    }
  }, [authStatus, canRead, router]);

  const session = sessionQuery.data?.data;
  const pendingEvents = pendingQuery.data?.data ?? [];

  const deviceName = useMemo(() => {
    if (!session?.deviceId || !canReadDevices) return null;
    const list = devicesQuery.data?.data ?? [];
    return list.find((d) => d.id === session.deviceId)?.name ?? null;
  }, [session?.deviceId, canReadDevices, devicesQuery.data?.data]);

  const available = useMemo(
    () => getOfflineSessionActions(session?.status),
    [session?.status],
  );

  function handleRefresh() {
    void sessionQuery.refetch();
    void pendingQuery.refetch();
  }

  if (authStatus === 'loading' || sessionQuery.isLoading) {
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

  if (sessionQuery.isError || !session) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-xl border border-border-default bg-surface-primary">
        <p className="text-body-md text-text-secondary">{t('detail.notFound')}</p>
      </div>
    );
  }

  const showReplay = canManage && available.includes('replay');
  const showClose = canManage && available.includes('close');

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('detail.title')}
        description={t('detail.description')}
        breadcrumbs={[
          { label: tn('dashboard'), href: ROUTES.TENANT.DASHBOARD },
          { label: tn('timeAttendance'), href: ROUTES.TENANT.ATTENDANCE.ROOT },
          {
            label: t('title'),
            href: ROUTES.TENANT.ATTENDANCE.OFFLINE_SESSIONS,
          },
          { label: t('detail.breadcrumb') },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <OfflineSessionStatusBadge status={session.status} size="md" />
            <Button variant="secondary" onClick={handleRefresh}>
              {t('actions.refresh')}
            </Button>
            {showReplay && (
              <Button variant="primary" onClick={() => setReplayOpen(true)}>
                {t('actions.replay')}
              </Button>
            )}
            {showClose && (
              <Button variant="danger" onClick={() => setCloseOpen(true)}>
                {t('actions.close')}
              </Button>
            )}
          </div>
        }
      />

      <section className="rounded-xl border border-border-default bg-surface-primary p-6">
        <h2 className="text-heading-h3 font-semibold text-text-primary">
          {t('sections.overview')}
        </h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DetailField label={t('fields.status')}>
            <OfflineSessionStatusBadge status={session.status} />
          </DetailField>
          <DetailField label={t('fields.sessionId')}>
            <span
              dir="ltr"
              className={`${TECH_VALUE_CLASS} break-all`}
              title={session.id}
              aria-label={t('a11y.sessionId', { id: session.id })}
            >
              {session.id}
            </span>
          </DetailField>
          <DetailField label={t('fields.clientTimezone')}>
            <span dir="ltr">{session.clientTimezone || '—'}</span>
          </DetailField>
        </dl>
      </section>

      <section className="rounded-xl border border-border-default bg-surface-primary p-6">
        <h2 className="text-heading-h3 font-semibold text-text-primary">
          {t('sections.timing')}
        </h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <DetailField label={t('fields.startedAt')}>
            <span dir="ltr" className="tabular-nums">
              {formatDisplayDateTime(session.startedAt)}
            </span>
          </DetailField>
          <DetailField label={t('fields.endedAt')}>
            <span dir="ltr" className="tabular-nums">
              {session.endedAt
                ? formatDisplayDateTime(session.endedAt)
                : t('fields.stillOpen')}
            </span>
          </DetailField>
        </dl>
      </section>

      <section className="rounded-xl border border-border-default bg-surface-primary p-6">
        <h2 className="text-heading-h3 font-semibold text-text-primary">
          {t('sections.source')}
        </h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <DetailField label={t('fields.device')}>
            {session.deviceId ? (
              <div>
                {deviceName && (
                  <p className="font-medium text-text-primary">{deviceName}</p>
                )}
                <span
                  dir="ltr"
                  className={TECH_VALUE_CLASS}
                  title={session.deviceId}
                >
                  {deviceName
                    ? shortenDeviceId(session.deviceId)
                    : session.deviceId}
                </span>
              </div>
            ) : (
              '—'
            )}
          </DetailField>
          <DetailField label={t('fields.mobileDeviceId')}>
            {session.mobileDeviceId ? (
              <span
                dir="ltr"
                className={`${TECH_VALUE_CLASS} break-all`}
                title={session.mobileDeviceId}
              >
                {session.mobileDeviceId}
              </span>
            ) : (
              '—'
            )}
          </DetailField>
        </dl>
      </section>

      <section className="space-y-4 rounded-xl border border-border-default bg-surface-primary p-6">
        <h2 className="text-heading-h3 font-semibold text-text-primary">
          {t('sections.pending')}
        </h2>
        <OfflinePendingEventsTable
          data={pendingEvents}
          isLoading={pendingQuery.isLoading}
          isError={pendingQuery.isError}
          onRetry={() => void pendingQuery.refetch()}
        />
      </section>

      {canManage && (showReplay || showClose) && (
        <section className="rounded-xl border border-border-default bg-surface-primary p-6">
          <h2 className="text-heading-h3 font-semibold text-text-primary">
            {t('sections.actions')}
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {showReplay && (
              <Button variant="primary" onClick={() => setReplayOpen(true)}>
                {t('actions.replay')}
              </Button>
            )}
            {showClose && (
              <Button variant="danger" onClick={() => setCloseOpen(true)}>
                {t('actions.close')}
              </Button>
            )}
          </div>
        </section>
      )}

      <OfflineReplayDialog
        open={replayOpen}
        onOpenChange={setReplayOpen}
        sessionId={session.id}
      />

      <OfflineCloseDialog
        open={closeOpen}
        onOpenChange={setCloseOpen}
        sessionId={session.id}
        deviceName={deviceName}
        hasPendingEvents={pendingEvents.length > 0}
      />
    </div>
  );
}
