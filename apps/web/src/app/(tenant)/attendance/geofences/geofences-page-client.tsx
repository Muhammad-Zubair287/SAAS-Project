'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../../components/common/page-header';
import { LoadingSpinner } from '../../../../components/feedback/loading-spinner';
import { EmptyState } from '../../../../components/feedback/empty-state';
import { buttonVariants } from '../../../../components/ui/button';
import { PermissionGate } from '../../../../lib/permissions';
import { usePermissions } from '../../../../lib/permissions/use-permissions';
import { ROUTES } from '../../../../constants/routes.constants';
import { ATTENDANCE_CAPTURE_PERMISSIONS } from '../../../../modules/attendance/constants/attendance-capture.constants';
import { useAttendanceGeofences } from '../../../../modules/attendance/hooks/use-attendance-geofences';
import { useLegalEntities } from '../../../../modules/organisation/hooks/use-legal-entities';
import { useBranches } from '../../../../modules/organisation/hooks/use-branches';
import { GeofencesTable } from '../../../../modules/attendance/components/geofences-table';
import type { ListAttendanceGeofencesParams } from '../../../../modules/attendance/types/attendance-capture.types';

export function GeofencesPageClient() {
  const t = useTranslations('attendance.geofences');
  const tn = useTranslations('tenant.nav');
  const router = useRouter();
  const { hasPermission, status: authStatus } = usePermissions();
  const canRead = hasPermission(ATTENDANCE_CAPTURE_PERMISSIONS.GEOFENCE_READ);
  const canManage = hasPermission(ATTENDANCE_CAPTURE_PERMISSIONS.GEOFENCE_MANAGE);

  const [legalEntityId, setLegalEntityId] = useState('');
  const [branchId, setBranchId] = useState('');

  const params: ListAttendanceGeofencesParams = {
    ...(legalEntityId ? { legalEntityId } : {}),
    ...(branchId ? { branchId } : {}),
  };

  const { data, isLoading, isError, refetch } = useAttendanceGeofences(params);
  const { data: leData } = useLegalEntities({ pageSize: 100 });
  const { data: branchData } = useBranches({
    pageSize: 100,
    legalEntityId: legalEntityId || undefined,
  });

  useEffect(() => {
    if (authStatus !== 'loading' && !canRead) {
      router.replace(ROUTES.AUTH.FORBIDDEN);
    }
  }, [authStatus, canRead, router]);

  const geofences = data?.data ?? [];
  const legalEntities = leData?.data ?? [];
  const branches = useMemo(() => {
    const all = branchData?.data ?? [];
    if (!legalEntityId) return all;
    return all.filter((b) => b.legalEntityId === legalEntityId);
  }, [branchData?.data, legalEntityId]);

  const legalEntityNames = useMemo(
    () => Object.fromEntries(legalEntities.map((le) => [le.id, le.name])),
    [legalEntities],
  );
  const branchNames = useMemo(() => {
    const allBranches = branchData?.data ?? [];
    return Object.fromEntries(allBranches.map((b) => [b.id, b.name]));
  }, [branchData?.data]);

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
        <p className="text-body-md text-text-secondary">{t('forbidden')}</p>
      </div>
    );
  }

  const showEmpty = !isLoading && !isError && geofences.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('purpose')}
        breadcrumbs={[
          { label: tn('dashboard'), href: ROUTES.TENANT.DASHBOARD },
          { label: tn('timeAttendance'), href: ROUTES.TENANT.ATTENDANCE.ROOT },
          { label: t('title') },
        ]}
        actions={
          <PermissionGate permission={ATTENDANCE_CAPTURE_PERMISSIONS.GEOFENCE_MANAGE}>
            <Link
              href={ROUTES.TENANT.ATTENDANCE.GEOFENCE_NEW}
              className={buttonVariants({ variant: 'primary' })}
            >
              {t('actions.create')}
            </Link>
          </PermissionGate>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="sr-only" htmlFor="geofence-filter-le">
          {t('filters.legalEntity')}
        </label>
        <select
          id="geofence-filter-le"
          value={legalEntityId}
          onChange={(e) => {
            setLegalEntityId(e.target.value);
            setBranchId('');
          }}
          className="rounded-md border border-border-default bg-surface-primary px-3 py-2.5 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20"
        >
          <option value="">{t('filters.allLegalEntities')}</option>
          {legalEntities.map((le) => (
            <option key={le.id} value={le.id}>
              {le.name}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="geofence-filter-branch">
          {t('filters.branch')}
        </label>
        <select
          id="geofence-filter-branch"
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          className="rounded-md border border-border-default bg-surface-primary px-3 py-2.5 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20"
        >
          <option value="">{t('filters.allBranches')}</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {showEmpty ? (
        <div className="rounded-lg border border-border-default bg-surface-primary">
          <EmptyState
            title={t('empty.title')}
            description={t('empty.description')}
            action={
              canManage ? (
                <Link
                  href={ROUTES.TENANT.ATTENDANCE.GEOFENCE_NEW}
                  className={buttonVariants({ variant: 'primary' })}
                >
                  {t('actions.createFirst')}
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <GeofencesTable
          data={geofences}
          legalEntityNames={legalEntityNames}
          branchNames={branchNames}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => {
            void refetch();
          }}
          canManage={canManage}
        />
      )}
    </div>
  );
}
