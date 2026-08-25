'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/common/page-header';
import { LoadingSpinner } from '@/components/feedback/loading-spinner';
import { usePermissions } from '@/lib/permissions/use-permissions';
import { ROUTES } from '@/constants/routes.constants';
import { ATTENDANCE_CAPTURE_PERMISSIONS } from '@/modules/attendance/constants/attendance-capture.constants';
import { useAttendanceDevice } from '@/modules/attendance/hooks/use-attendance-devices';
import { ProvisionDeviceForm } from '@/modules/attendance/components/provision-device-form';

interface ProvisionDeviceClientProps {
  deviceId: string;
}

export function ProvisionDeviceClient({ deviceId }: ProvisionDeviceClientProps) {
  const t = useTranslations('attendance.devices');
  const tn = useTranslations('tenant.nav');
  const router = useRouter();
  const { hasPermission, status: authStatus } = usePermissions();
  const canManage = hasPermission(ATTENDANCE_CAPTURE_PERMISSIONS.DEVICE_MANAGE);

  const { data, isLoading, isError } = useAttendanceDevice(deviceId);
  const device = data?.data;

  useEffect(() => {
    if (authStatus !== 'loading' && !canManage) {
      router.replace(ROUTES.AUTH.FORBIDDEN);
    }
  }, [authStatus, canManage, router]);

  if (authStatus === 'loading' || isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!canManage) {
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('provision.title')}
        description={t('provision.description')}
        breadcrumbs={[
          { label: tn('dashboard'), href: ROUTES.TENANT.DASHBOARD },
          { label: tn('timeAttendance'), href: ROUTES.TENANT.ATTENDANCE.ROOT },
          { label: t('title'), href: ROUTES.TENANT.ATTENDANCE.DEVICES },
          {
            label: device.name,
            href: ROUTES.TENANT.ATTENDANCE.DEVICE_DETAIL(device.id),
          },
          { label: t('provision.breadcrumb') },
        ]}
      />
      <ProvisionDeviceForm deviceId={device.id} deviceName={device.name} />
    </div>
  );
}
