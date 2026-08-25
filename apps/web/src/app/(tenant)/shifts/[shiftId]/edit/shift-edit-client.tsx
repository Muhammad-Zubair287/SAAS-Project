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
import { ShiftStatusBadge } from '@/modules/shifts/components/shift-status-badge';
import { useShift } from '@/modules/shifts/hooks/use-shifts';

interface ShiftEditClientProps {
  shiftId: string;
}

export function ShiftEditClient({ shiftId }: ShiftEditClientProps) {
  const t = useTranslations('shifts');
  const tn = useTranslations('tenant.nav');
  const router = useRouter();
  const { hasPermission, status: authStatus } = usePermissions();
  const canUpdate = hasPermission(SHIFT_PERMISSIONS.UPDATE);
  const canRead = hasPermission(SHIFT_PERMISSIONS.READ);

  const shiftQuery = useShift(shiftId, { enabled: canRead });

  useEffect(() => {
    if (authStatus !== 'loading' && !canUpdate) {
      router.replace(ROUTES.AUTH.FORBIDDEN);
    }
  }, [authStatus, canUpdate, router]);

  if (authStatus === 'loading' || shiftQuery.isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!canUpdate) return null;

  const shift = shiftQuery.data?.data;
  if (shiftQuery.isError || !shift) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <p className="text-body-md text-text-secondary">{t('detail.notFound')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('edit.title')}
        description={t('edit.description', { name: shift.name })}
        breadcrumbs={[
          { label: tn('dashboard'), href: ROUTES.TENANT.DASHBOARD },
          { label: tn('timeAttendance'), href: ROUTES.TENANT.ATTENDANCE.ROOT },
          { label: t('title'), href: ROUTES.TENANT.SHIFTS.ROOT },
          { label: t('edit.breadcrumb') },
        ]}
        actions={<ShiftStatusBadge status={shift.status} size="md" />}
      />
      <p className="text-body-sm text-text-secondary">
        <span dir="ltr" className="font-mono">
          {shift.code}
        </span>
        {' · '}
        {t('fields.version')}{' '}
        <span dir="ltr">v{shift.version}</span>
      </p>
      <ShiftForm mode="edit" shift={shift} rowVersion={shift.rowVersion} />
    </div>
  );
}
