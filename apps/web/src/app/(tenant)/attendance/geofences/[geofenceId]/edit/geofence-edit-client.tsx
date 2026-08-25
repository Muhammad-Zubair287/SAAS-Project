'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/common/page-header';
import { LoadingSpinner } from '@/components/feedback/loading-spinner';
import { usePermissions } from '@/lib/permissions/use-permissions';
import { ROUTES } from '@/constants/routes.constants';
import { ATTENDANCE_CAPTURE_PERMISSIONS } from '@/modules/attendance/constants/attendance-capture.constants';
import { useAttendanceGeofence } from '@/modules/attendance/hooks/use-attendance-geofences';
import { GeofenceForm } from '@/modules/attendance/components/geofence-form';

interface GeofenceEditClientProps {
  geofenceId: string;
}

export function GeofenceEditClient({ geofenceId }: GeofenceEditClientProps) {
  const t = useTranslations('attendance.geofences');
  const tn = useTranslations('tenant.nav');
  const router = useRouter();
  const { hasPermission, status: authStatus } = usePermissions();
  const canManage = hasPermission(ATTENDANCE_CAPTURE_PERMISSIONS.GEOFENCE_MANAGE);

  const { data, isLoading, isError, refetch } = useAttendanceGeofence(geofenceId);
  const geofence = data?.data;

  useEffect(() => {
    if (authStatus === 'loading') return;
    if (!canManage) {
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

  if (isError || !geofence) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-xl border border-border-default bg-surface-primary">
        <p className="text-body-md text-text-secondary">{t('detail.notFound')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('edit.title')}
        description={t('edit.description')}
        breadcrumbs={[
          { label: tn('dashboard'), href: ROUTES.TENANT.DASHBOARD },
          { label: tn('timeAttendance'), href: ROUTES.TENANT.ATTENDANCE.ROOT },
          { label: t('title'), href: ROUTES.TENANT.ATTENDANCE.GEOFENCES },
          {
            label: geofence.name,
            href: ROUTES.TENANT.ATTENDANCE.GEOFENCE_DETAIL(geofence.id),
          },
          { label: t('edit.breadcrumb') },
        ]}
      />
      <GeofenceForm
        mode="edit"
        geofence={geofence}
        rowVersion={geofence.rowVersion}
        onVersionConflict={() => {
          void refetch();
        }}
      />
    </div>
  );
}
