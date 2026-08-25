'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/common/page-header';
import { LoadingSpinner } from '@/components/feedback/loading-spinner';
import { Button, buttonVariants } from '@/components/ui/button';
import { usePermissions } from '@/lib/permissions/use-permissions';
import { toast } from '@/lib/toast/store';
import { toApiError } from '@/lib/api/errors';
import { ROUTES } from '@/constants/routes.constants';
import { ATTENDANCE_CAPTURE_PERMISSIONS } from '@/modules/attendance/constants/attendance-capture.constants';
import {
  useActivateAttendanceDevice,
  useAttendanceDevice,
  useDecommissionAttendanceDevice,
  useIssueAttendanceDeviceToken,
  useReplaceAttendanceDevice,
  useSuspendAttendanceDevice,
} from '@/modules/attendance/hooks/use-attendance-devices';
import { useAttendanceDeviceHealth } from '@/modules/attendance/hooks/use-attendance-capture-health';
import { DeviceStatusBadge } from '@/modules/attendance/components/device-status-badge';
import { DeviceLifecycleDialog } from '@/modules/attendance/components/device-lifecycle-dialog';
import type {
  DeviceLifecycleConfirmPayload,
  DeviceLifecycleDialogAction,
} from '@/modules/attendance/components/device-lifecycle-dialog';
import { DeviceTokenRevealDialog } from '@/modules/attendance/components/device-token-reveal-dialog';
import { DeviceHealthPanel } from '@/modules/attendance/components/device-health-panel';
import { DeviceHeartbeatPanel } from '@/modules/attendance/components/device-heartbeat-panel';
import type { AttendanceDeviceTokenIssueResponse } from '@/modules/attendance/types/attendance-capture.types';
import { getAvailableDeviceActions } from '@/modules/attendance/utils/device-lifecycle';
import {
  formatDisplayDateTime,
  TECH_VALUE_CLASS,
} from '@/modules/attendance/utils/geofence-format';

interface DeviceDetailClientProps {
  deviceId: string;
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

export function DeviceDetailClient({ deviceId }: DeviceDetailClientProps) {
  const t = useTranslations('attendance.devices');
  const tt = useTranslations('attendance.deviceToken');
  const tn = useTranslations('tenant.nav');
  const router = useRouter();
  const { hasPermission, status: authStatus } = usePermissions();
  const canRead = hasPermission(ATTENDANCE_CAPTURE_PERMISSIONS.DEVICE_READ);
  const canManage = hasPermission(ATTENDANCE_CAPTURE_PERMISSIONS.DEVICE_MANAGE);
  const canIssueToken = hasPermission(
    ATTENDANCE_CAPTURE_PERMISSIONS.DEVICE_TOKEN_ISSUE,
  );
  const canReadHeartbeat = hasPermission(
    ATTENDANCE_CAPTURE_PERMISSIONS.DEVICE_HEARTBEAT_READ,
  );

  const { data, isLoading, isError, refetch } = useAttendanceDevice(deviceId);
  const healthQuery = useAttendanceDeviceHealth({
    enabled: canRead && canReadHeartbeat,
  });

  const activate = useActivateAttendanceDevice();
  const suspend = useSuspendAttendanceDevice();
  const decommission = useDecommissionAttendanceDevice();
  const replace = useReplaceAttendanceDevice();
  const issueToken = useIssueAttendanceDeviceToken();

  const [lifecycleAction, setLifecycleAction] =
    useState<DeviceLifecycleDialogAction | null>(null);
  const [tokenResult, setTokenResult] =
    useState<AttendanceDeviceTokenIssueResponse | null>(null);

  useEffect(() => {
    if (authStatus !== 'loading' && !canRead) {
      router.replace(ROUTES.AUTH.FORBIDDEN);
    }
  }, [authStatus, canRead, router]);

  const device = data?.data;
  const available = useMemo(
    () => (device ? getAvailableDeviceActions(device.status) : []),
    [device],
  );

  const deviceHealth = useMemo(() => {
    if (!canReadHeartbeat) return undefined;
    const list = healthQuery.data?.data ?? [];
    return list.find((h) => h.deviceId === deviceId);
  }, [canReadHeartbeat, healthQuery.data?.data, deviceId]);

  const lifecyclePending =
    activate.isPending ||
    suspend.isPending ||
    decommission.isPending ||
    replace.isPending;

  async function handleLifecycleConfirm(payload: DeviceLifecycleConfirmPayload) {
    if (!device || !lifecycleAction) return;
    try {
      if (lifecycleAction === 'activate') {
        await activate.mutateAsync(device.id);
        toast.success(t('success.activated'));
      } else if (lifecycleAction === 'suspend') {
        await suspend.mutateAsync({
          deviceId: device.id,
          payload: { reason: payload.reason! },
        });
        toast.success(t('success.suspended'));
      } else if (lifecycleAction === 'decommission') {
        await decommission.mutateAsync({
          deviceId: device.id,
          payload: { reason: payload.reason! },
        });
        toast.success(t('success.decommissioned'));
      } else if (lifecycleAction === 'replace') {
        const res = await replace.mutateAsync({
          deviceId: device.id,
          payload: {
            newSerialNumber: payload.newSerialNumber!,
            ...(payload.newDeviceFingerprint
              ? { newDeviceFingerprint: payload.newDeviceFingerprint }
              : {}),
            ...(payload.newPublicKeyFingerprint
              ? { newPublicKeyFingerprint: payload.newPublicKeyFingerprint }
              : {}),
          },
        });
        toast.success(t('success.replaced'));
        setLifecycleAction(null);
        router.push(ROUTES.TENANT.ATTENDANCE.DEVICE_DETAIL(res.data.id));
        return;
      }
      setLifecycleAction(null);
      void refetch();
    } catch (err) {
      const apiErr = toApiError(err);
      toast.error(apiErr.message || t('error'));
    }
  }

  async function handleIssueToken() {
    if (!device) return;
    try {
      const res = await issueToken.mutateAsync(device.id);
      // Keep raw token only in ephemeral component state.
      setTokenResult(res.data);
    } catch (err) {
      const apiErr = toApiError(err);
      toast.error(apiErr.message || tt('errors.issueFailed'));
    }
  }

  if (authStatus === 'loading' || isLoading) {
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

  if (isError || !device) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-xl border border-border-default bg-surface-primary">
        <p className="text-body-md text-text-secondary">{t('detail.notFound')}</p>
      </div>
    );
  }

  const showProvision = canManage && available.includes('provision');
  const showActivate = canManage && available.includes('activate');
  const showSuspend = canManage && available.includes('suspend');
  const showDecommission = canManage && available.includes('decommission');
  const showReplace = canManage && available.includes('replace');
  const showIssueToken =
    canIssueToken && available.includes('issueToken');

  return (
    <div className="space-y-6">
      <PageHeader
        title={device.name}
        description={t('detail.description')}
        breadcrumbs={[
          { label: tn('dashboard'), href: ROUTES.TENANT.DASHBOARD },
          { label: tn('timeAttendance'), href: ROUTES.TENANT.ATTENDANCE.ROOT },
          { label: t('title'), href: ROUTES.TENANT.ATTENDANCE.DEVICES },
          { label: t('detail.breadcrumb') },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DeviceStatusBadge status={device.status} size="md" />
            {showProvision && (
              <Link
                href={ROUTES.TENANT.ATTENDANCE.DEVICE_PROVISION(device.id)}
                className={buttonVariants({ variant: 'primary' })}
              >
                {t('actions.provision')}
              </Link>
            )}
            {showIssueToken && (
              <Button
                variant="secondary"
                onClick={() => void handleIssueToken()}
                isLoading={issueToken.isPending}
              >
                {issueToken.isPending
                  ? t('actions.issuing')
                  : t('actions.issueToken')}
              </Button>
            )}
          </div>
        }
      />

      {device.status === 'PENDING' && canManage && (
        <p className="rounded-md border border-border-default bg-surface-primary px-4 py-3 text-body-sm text-text-secondary">
          {t('lifecycle.pendingHint')}
        </p>
      )}

      <section className="rounded-xl border border-border-default bg-surface-primary p-6">
        <h2 className="text-heading-h3 font-semibold text-text-primary">
          {t('sections.overview')}
        </h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DetailField label={t('fields.name')}>{device.name}</DetailField>
          <DetailField label={t('fields.deviceType')}>
            {device.deviceType}
          </DetailField>
          <DetailField label={t('fields.serialNumber')}>
            <span dir="ltr" className={TECH_VALUE_CLASS}>
              {device.serialNumber}
            </span>
          </DetailField>
          <DetailField label={t('fields.vendor')}>
            {device.vendor || '—'}
          </DetailField>
          <DetailField label={t('fields.model')}>
            {device.model || '—'}
          </DetailField>
          <DetailField label={t('columns.status')}>
            <DeviceStatusBadge status={device.status} />
          </DetailField>
          <DetailField label={t('fields.timezone')}>
            <span dir="ltr">{device.timezone || '—'}</span>
          </DetailField>
          <DetailField label={t('columns.lastSeenAt')}>
            <span dir="ltr" className="tabular-nums">
              {formatDisplayDateTime(device.lastSeenAt)}
            </span>
          </DetailField>
          <DetailField label={t('columns.createdAt')}>
            <span dir="ltr" className="tabular-nums">
              {formatDisplayDateTime(device.createdAt)}
            </span>
          </DetailField>
          <DetailField label={t('columns.updatedAt')}>
            <span dir="ltr" className="tabular-nums">
              {formatDisplayDateTime(device.updatedAt)}
            </span>
          </DetailField>
        </dl>
      </section>

      {canManage && (
        <section className="rounded-xl border border-border-default bg-surface-primary p-6">
          <h2 className="text-heading-h3 font-semibold text-text-primary">
            {t('lifecycle.title')}
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {showActivate && (
              <Button
                variant="secondary"
                onClick={() => setLifecycleAction('activate')}
                aria-label={t('a11y.editLifecycle', {
                  action: t('actions.activate'),
                  name: device.name,
                })}
              >
                {t('actions.activate')}
              </Button>
            )}
            {showSuspend && (
              <Button
                variant="secondary"
                onClick={() => setLifecycleAction('suspend')}
                aria-label={t('a11y.editLifecycle', {
                  action: t('actions.suspend'),
                  name: device.name,
                })}
              >
                {t('actions.suspend')}
              </Button>
            )}
            {showDecommission && (
              <Button
                variant="danger"
                onClick={() => setLifecycleAction('decommission')}
                aria-label={t('a11y.editLifecycle', {
                  action: t('actions.decommission'),
                  name: device.name,
                })}
              >
                {t('actions.decommission')}
              </Button>
            )}
            {showReplace && (
              <Button
                variant="danger"
                onClick={() => setLifecycleAction('replace')}
                aria-label={t('a11y.editLifecycle', {
                  action: t('actions.replace'),
                  name: device.name,
                })}
              >
                {t('actions.replace')}
              </Button>
            )}
            {!showActivate &&
              !showSuspend &&
              !showDecommission &&
              !showReplace &&
              !showProvision && (
                <p className="text-body-sm text-text-secondary">
                  {t('lifecycle.noActions')}
                </p>
              )}
          </div>
        </section>
      )}

      {canReadHeartbeat && (
        <>
          <DeviceHealthPanel
            health={deviceHealth}
            isLoading={healthQuery.isLoading}
            isError={healthQuery.isError}
            onRetry={() => void healthQuery.refetch()}
          />
          <DeviceHeartbeatPanel deviceId={device.id} enabled />
        </>
      )}

      <DeviceLifecycleDialog
        open={lifecycleAction !== null}
        onOpenChange={(open) => {
          if (!open) setLifecycleAction(null);
        }}
        action={lifecycleAction}
        deviceName={device.name}
        isLoading={lifecyclePending}
        onConfirm={handleLifecycleConfirm}
      />

      <DeviceTokenRevealDialog
        open={tokenResult !== null}
        onOpenChange={(open) => {
          if (!open) {
            setTokenResult(null);
            // Clear mutation cache so the raw token is not retained after dismiss.
            issueToken.reset();
          }
        }}
        tokenResult={tokenResult}
      />
    </div>
  );
}
