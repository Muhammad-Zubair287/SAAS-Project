'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { DataTable, type Column } from '../../../components/common/data-table';
import { PermissionGate } from '../../../lib/permissions';
import { ROUTES } from '../../../constants/routes.constants';
import { ATTENDANCE_CAPTURE_PERMISSIONS } from '../constants/attendance-capture.constants';
import type { AttendanceGeofence } from '../types/attendance-capture.types';
import {
  formatCoordinate,
  formatDisplayDate,
  formatDisplayDateTime,
  TECH_VALUE_CLASS,
} from '../utils/geofence-format';

interface GeofencesTableProps {
  data: AttendanceGeofence[];
  legalEntityNames: Record<string, string>;
  branchNames: Record<string, string>;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  canManage?: boolean;
}

function scopeLabel(
  row: AttendanceGeofence,
  legalEntityNames: Record<string, string>,
  branchNames: Record<string, string>,
  tenantLabel: string,
): string {
  const branch =
    row.branchId && branchNames[row.branchId]
      ? branchNames[row.branchId]
      : null;
  const entity =
    row.legalEntityId && legalEntityNames[row.legalEntityId]
      ? legalEntityNames[row.legalEntityId]
      : null;
  if (branch && entity) return `${entity} · ${branch}`;
  if (branch) return branch;
  if (entity) return entity;
  return tenantLabel;
}

export function GeofencesTable({
  data,
  legalEntityNames,
  branchNames,
  isLoading,
  isError,
  onRetry,
  canManage = false,
}: GeofencesTableProps) {
  const t = useTranslations('attendance.geofences');
  const tc = useTranslations('common');
  const router = useRouter();

  const columns: Column<AttendanceGeofence>[] = [
    {
      key: 'name',
      header: t('columns.name'),
      render: (row) => (
        <p className="font-medium text-text-primary">{row.name}</p>
      ),
    },
    {
      key: 'scope',
      header: t('columns.scope'),
      render: (row) => (
        <span className="text-body-sm text-text-secondary">
          {scopeLabel(row, legalEntityNames, branchNames, t('fields.tenantScope'))}
        </span>
      ),
    },
    {
      key: 'latitude',
      header: t('columns.latitude'),
      width: '120px',
      render: (row) => (
        <span dir="ltr" className={TECH_VALUE_CLASS} aria-label={t('a11y.numeric')}>
          {formatCoordinate(row.centerLat)}
        </span>
      ),
    },
    {
      key: 'longitude',
      header: t('columns.longitude'),
      width: '120px',
      render: (row) => (
        <span dir="ltr" className={TECH_VALUE_CLASS} aria-label={t('a11y.numeric')}>
          {formatCoordinate(row.centerLng)}
        </span>
      ),
    },
    {
      key: 'radiusMeters',
      header: t('columns.radiusMeters'),
      width: '110px',
      render: (row) => (
        <span dir="ltr" className={TECH_VALUE_CLASS} aria-label={t('a11y.numeric')}>
          {row.radiusMeters ?? '—'}
        </span>
      ),
    },
    {
      key: 'activeFrom',
      header: t('columns.activeFrom'),
      render: (row) => (
        <span dir="ltr" className="text-body-sm text-text-secondary">
          {formatDisplayDate(row.activeFrom)}
        </span>
      ),
    },
    {
      key: 'activeTo',
      header: t('columns.activeTo'),
      render: (row) => (
        <span dir="ltr" className="text-body-sm text-text-secondary">
          {formatDisplayDate(row.activeTo)}
        </span>
      ),
    },
    {
      key: 'updatedAt',
      header: t('columns.updatedAt'),
      render: (row) => (
        <span dir="ltr" className="text-body-sm text-text-secondary">
          {formatDisplayDateTime(row.updatedAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t('columns.actions'),
      width: '140px',
      render: (row) => (
        <div
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Link
            href={ROUTES.TENANT.ATTENDANCE.GEOFENCE_DETAIL(row.id)}
            className="text-body-sm font-semibold text-brand-blue-600 hover:underline"
            aria-label={t('a11y.openDetail', { name: row.name })}
          >
            {t('actions.view')}
          </Link>
          {canManage && (
            <PermissionGate permission={ATTENDANCE_CAPTURE_PERMISSIONS.GEOFENCE_MANAGE}>
              <Link
                href={ROUTES.TENANT.ATTENDANCE.GEOFENCE_EDIT(row.id)}
                className="text-body-sm font-semibold text-text-secondary hover:text-text-primary hover:underline"
                aria-label={t('a11y.editGeofence', { name: row.name })}
              >
                {t('actions.edit')}
              </Link>
            </PermissionGate>
          )}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      isError={isError}
      onRetry={onRetry}
      errorTitle={tc('error')}
      errorDescription={t('error')}
      retryLabel={tc('retry')}
      keyExtractor={(row) => row.id}
      caption={t('a11y.table')}
      emptyTitle={t('empty.title')}
      emptyDescription={t('empty.description')}
      onRowClick={(row) =>
        router.push(ROUTES.TENANT.ATTENDANCE.GEOFENCE_DETAIL(row.id))
      }
      compact
    />
  );
}
