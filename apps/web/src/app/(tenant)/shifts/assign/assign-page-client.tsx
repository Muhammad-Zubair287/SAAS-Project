'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/common/page-header';
import { LoadingSpinner } from '@/components/feedback/loading-spinner';
import { usePermissions } from '@/lib/permissions/use-permissions';
import { ROUTES } from '@/constants/routes.constants';
import { ROSTER_PERMISSIONS } from '@/modules/shifts/constants/shift.constants';
import { AssignShiftForm } from '@/modules/shifts/components/assign-shift-form';

export function AssignShiftPageClient() {
  const t = useTranslations('shifts.assign');
  const tn = useTranslations('tenant.nav');
  const ts = useTranslations('shifts');
  const router = useRouter();
  const { hasPermission, status } = usePermissions();
  const canAssign = hasPermission(ROSTER_PERMISSIONS.ASSIGN);

  useEffect(() => {
    if (status !== 'loading' && !canAssign) {
      router.replace(ROUTES.AUTH.FORBIDDEN);
    }
  }, [status, canAssign, router]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  if (!canAssign) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
        breadcrumbs={[
          { label: tn('dashboard'), href: ROUTES.TENANT.DASHBOARD },
          { label: tn('timeAttendance'), href: ROUTES.TENANT.ATTENDANCE.ROOT },
          { label: ts('title'), href: ROUTES.TENANT.SHIFTS.ROOT },
          { label: t('breadcrumb') },
        ]}
      />
      <AssignShiftForm />
    </div>
  );
}
