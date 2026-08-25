'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/common/page-header';
import { LoadingSpinner } from '@/components/feedback/loading-spinner';
import { Button, buttonVariants } from '@/components/ui/button';
import { usePermissions } from '@/lib/permissions/use-permissions';
import { ROUTES } from '@/constants/routes.constants';
import { ATTENDANCE_CAPTURE_PERMISSIONS } from '@/modules/attendance/constants/attendance-capture.constants';
import { useAttendanceGeofence } from '@/modules/attendance/hooks/use-attendance-geofences';
import { useLegalEntities } from '@/modules/organisation/hooks/use-legal-entities';
import { useBranches } from '@/modules/organisation/hooks/use-branches';
import { GeofenceDeleteDialog } from '@/modules/attendance/components/geofence-delete-dialog';
import { GeofenceCheckDialog } from '@/modules/attendance/components/geofence-check-dialog';
import {
  formatCoordinate,
  formatDisplayDate,
  formatDisplayDateTime,
  TECH_VALUE_CLASS,
} from '@/modules/attendance/utils/geofence-format';

interface GeofenceDetailClientProps {
  geofenceId: string;
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

export function GeofenceDetailClient({ geofenceId }: GeofenceDetailClientProps) {
  const t = useTranslations('attendance.geofences');
  const tn = useTranslations('tenant.nav');
  const router = useRouter();
  const { hasPermission, status: authStatus } = usePermissions();
  const canRead = hasPermission(ATTENDANCE_CAPTURE_PERMISSIONS.GEOFENCE_READ);
  const canManage = hasPermission(ATTENDANCE_CAPTURE_PERMISSIONS.GEOFENCE_MANAGE);

  const { data, isLoading, isError, refetch } = useAttendanceGeofence(geofenceId);
  const { data: leData } = useLegalEntities({ pageSize: 100 });
  const { data: branchData } = useBranches({ pageSize: 100 });

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [checkOpen, setCheckOpen] = useState(false);

  useEffect(() => {
    if (authStatus !== 'loading' && !canRead) {
      router.replace(ROUTES.AUTH.FORBIDDEN);
    }
  }, [authStatus, canRead, router]);

  const geofence = data?.data;
  const legalEntityName = useMemo(() => {
    if (!geofence?.legalEntityId) return null;
    return leData?.data?.find((le) => le.id === geofence.legalEntityId)?.name ?? null;
  }, [geofence?.legalEntityId, leData?.data]);

  const branchName = useMemo(() => {
    if (!geofence?.branchId) return null;
    return branchData?.data?.find((b) => b.id === geofence.branchId)?.name ?? null;
  }, [geofence?.branchId, branchData?.data]);

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
        title={geofence.name}
        breadcrumbs={[
          { label: tn('dashboard'), href: ROUTES.TENANT.DASHBOARD },
          { label: tn('timeAttendance'), href: ROUTES.TENANT.ATTENDANCE.ROOT },
          { label: t('title'), href: ROUTES.TENANT.ATTENDANCE.GEOFENCES },
          { label: t('detail.breadcrumb') },
        ]}
        actions={
          canManage ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => setCheckOpen(true)}
                aria-label={t('a11y.checkLocation', { name: geofence.name })}
              >
                {t('actions.check')}
              </Button>
              <Link
                href={ROUTES.TENANT.ATTENDANCE.GEOFENCE_EDIT(geofence.id)}
                className={buttonVariants({ variant: 'secondary' })}
              >
                {t('actions.edit')}
              </Link>
              <Button
                variant="danger"
                onClick={() => setDeleteOpen(true)}
                aria-label={t('a11y.deleteGeofence', { name: geofence.name })}
              >
                {t('actions.delete')}
              </Button>
            </div>
          ) : undefined
        }
      />

      <section className="rounded-xl border border-border-default bg-surface-primary p-6">
        <h2 className="mb-4 text-heading-h3 font-semibold text-text-primary">
          {t('sections.overview')}
        </h2>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          <DetailField label={t('fields.name')}>{geofence.name}</DetailField>
          <DetailField label={t('columns.shape')}>{t('shape.CIRCLE')}</DetailField>
        </dl>
      </section>

      <section className="rounded-xl border border-border-default bg-surface-primary p-6">
        <h2 className="mb-4 text-heading-h3 font-semibold text-text-primary">
          {t('sections.scope')}
        </h2>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          <DetailField label={t('fields.legalEntityId')}>
            {legalEntityName ?? t('fields.tenantScope')}
          </DetailField>
          <DetailField label={t('fields.branchId')}>{branchName ?? '—'}</DetailField>
        </dl>
      </section>

      <section className="rounded-xl border border-border-default bg-surface-primary p-6">
        <h2 className="mb-4 text-heading-h3 font-semibold text-text-primary">
          {t('sections.location')}
        </h2>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-3">
          <DetailField label={t('fields.centerLat')}>
            <span dir="ltr" className={TECH_VALUE_CLASS}>
              {formatCoordinate(geofence.centerLat)}
            </span>
          </DetailField>
          <DetailField label={t('fields.centerLng')}>
            <span dir="ltr" className={TECH_VALUE_CLASS}>
              {formatCoordinate(geofence.centerLng)}
            </span>
          </DetailField>
          <DetailField label={t('fields.radiusMeters')}>
            <span dir="ltr" className={TECH_VALUE_CLASS}>
              {geofence.radiusMeters ?? '—'}
            </span>
          </DetailField>
        </dl>
      </section>

      <section className="rounded-xl border border-border-default bg-surface-primary p-6">
        <h2 className="mb-4 text-heading-h3 font-semibold text-text-primary">
          {t('sections.dates')}
        </h2>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          <DetailField label={t('fields.activeFrom')}>
            <span dir="ltr">{formatDisplayDate(geofence.activeFrom)}</span>
          </DetailField>
          <DetailField label={t('fields.activeTo')}>
            <span dir="ltr">{formatDisplayDate(geofence.activeTo)}</span>
          </DetailField>
        </dl>
      </section>

      <section className="rounded-xl border border-border-default bg-surface-primary p-6">
        <h2 className="mb-4 text-heading-h3 font-semibold text-text-primary">
          {t('sections.system')}
        </h2>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          <DetailField label={t('columns.createdAt')}>
            <span dir="ltr" className={TECH_VALUE_CLASS}>
              {formatDisplayDateTime(geofence.createdAt)}
            </span>
          </DetailField>
          <DetailField label={t('columns.updatedAt')}>
            <span dir="ltr" className={TECH_VALUE_CLASS}>
              {formatDisplayDateTime(geofence.updatedAt)}
            </span>
          </DetailField>
        </dl>
      </section>

      <GeofenceDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        geofenceId={geofence.id}
        geofenceName={geofence.name}
        rowVersion={geofence.rowVersion}
        onVersionConflict={() => {
          void refetch();
        }}
      />

      <GeofenceCheckDialog
        open={checkOpen}
        onOpenChange={setCheckOpen}
        geofenceId={geofence.id}
        geofenceName={geofence.name}
      />
    </div>
  );
}
