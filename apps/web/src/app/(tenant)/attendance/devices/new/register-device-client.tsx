'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../../../components/common/page-header';
import { LoadingSpinner } from '../../../../../components/feedback/loading-spinner';
import { usePermissions } from '../../../../../lib/permissions/use-permissions';
import { ROUTES } from '../../../../../constants/routes.constants';
import { ATTENDANCE_CAPTURE_PERMISSIONS } from '../../../../../modules/attendance/constants/attendance-capture.constants';
import { DeviceForm } from '../../../../../modules/attendance/components/device-form';

export function RegisterDeviceClient() {
  const t = useTranslations('attendance.devices');
  const tn = useTranslations('tenant.nav');
  const router = useRouter();
  const { hasPermission, status: authStatus } = usePermissions();
  const canManage = hasPermission(ATTENDANCE_CAPTURE_PERMISSIONS.DEVICE_MANAGE);

  useEffect(() => {
    if (authStatus !== 'loading' && !canManage) {
      router.replace(ROUTES.AUTH.FORBIDDEN);
    }
  }, [authStatus, canManage, router]);

  if (authStatus === 'loading') {
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('new.title')}
        description={t('new.description')}
        breadcrumbs={[
          { label: tn('dashboard'), href: ROUTES.TENANT.DASHBOARD },
          { label: tn('timeAttendance'), href: ROUTES.TENANT.ATTENDANCE.ROOT },
          { label: t('title'), href: ROUTES.TENANT.ATTENDANCE.DEVICES },
          { label: t('new.breadcrumb') },
        ]}
      />
      <DeviceForm />
    </div>
  );
}
