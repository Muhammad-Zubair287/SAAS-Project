'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/common/page-header';
import { LoadingSpinner } from '@/components/feedback/loading-spinner';
import { usePermissions } from '@/lib/permissions/use-permissions';
import { ROUTES } from '@/constants/routes.constants';
import { SHIFT_PERMISSIONS } from '@/modules/shifts/constants/shift.constants';
import { ShiftForm } from '@/modules/shifts/components/shift-form';

export function ShiftNewClient() {
  const t = useTranslations('shifts');
  const tn = useTranslations('tenant.nav');
  const router = useRouter();
  const { hasPermission, status } = usePermissions();
  const canCreate = hasPermission(SHIFT_PERMISSIONS.CREATE);

  useEffect(() => {
    if (status !== 'loading' && !canCreate) {
      router.replace(ROUTES.AUTH.FORBIDDEN);
    }
  }, [status, canCreate, router]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!canCreate) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('new.title')}
        description={t('new.description')}
        breadcrumbs={[
          { label: tn('dashboard'), href: ROUTES.TENANT.DASHBOARD },
          { label: tn('timeAttendance'), href: ROUTES.TENANT.ATTENDANCE.ROOT },
          { label: t('title'), href: ROUTES.TENANT.SHIFTS.ROOT },
          { label: t('new.breadcrumb') },
        ]}
      />
      <ShiftForm mode="create" />
    </div>
  );
}
