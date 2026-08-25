'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { DataTable, type Column } from '../../../components/common/data-table';
import { buttonVariants } from '../../../components/ui/button';
import { PermissionGate } from '../../../lib/permissions';
import { ROUTES } from '../../../constants/routes.constants';
import { ATTENDANCE_CAPTURE_PERMISSIONS } from '../constants/attendance-capture.constants';
import type {
  AttendanceDevice,
  AttendanceDeviceHealth,
} from '../types/attendance-capture.types';
import {
  formatDisplayDateTime,
  TECH_VALUE_CLASS,
} from '../utils/geofence-format';
import { DeviceStatusBadge } from './device-status-badge';
import { DeviceHealthBadge } from './device-health-badge';

interface DevicesTableProps {
  data: AttendanceDevice[];
  healthByDeviceId?: Record<string, AttendanceDeviceHealth>;
  showHealth?: boolean;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  canManage?: boolean;
}

export function DevicesTable({
  data,
  healthByDeviceId = {},
  showHealth = false,
  isLoading,
  isError,
  onRetry,
  canManage = false,
}: DevicesTableProps) {
  const t = useTranslations('attendance.devices');
  const tc = useTranslations('common');
  const router = useRouter();

  const columns: Column<AttendanceDevice>[] = [
    {
      key: 'name',
      header: t('columns.name'),
      render: (row) => (
        <p className="font-medium text-text-primary">{row.name}</p>
      ),
    },
    {
      key: 'deviceType',
      header: t('columns.deviceType'),
      render: (row) => (
        <span className="text-body-sm text-text-secondary">{row.deviceType}</span>
      ),
    },
    {
      key: 'serialNumber',
      header: t('columns.serialNumber'),
      render: (row) => (
        <span
          dir="ltr"
          className={TECH_VALUE_CLASS}
          aria-label={t('a11y.serialNumber')}
        >
          {row.serialNumber}
        </span>
      ),
    },
    {
      key: 'vendor',
      header: t('columns.vendor'),
      render: (row) => (
        <span className="text-body-sm text-text-secondary">
          {row.vendor || '—'}
        </span>
      ),
    },
    {
      key: 'model',
      header: t('columns.model'),
      render: (row) => (
        <span className="text-body-sm text-text-secondary">
          {row.model || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('columns.status'),
      width: '130px',
      render: (row) => <DeviceStatusBadge status={row.status} />,
    },
    ...(showHealth
      ? [
          {
            key: 'health',
            header: t('columns.health'),
            width: '130px',
            render: (row: AttendanceDevice) => {
              const health = healthByDeviceId[row.id];
              if (!health) {
                return (
                  <span className="text-body-sm text-text-secondary">—</span>
                );
              }
              return <DeviceHealthBadge status={health.healthStatus} />;
            },
          } satisfies Column<AttendanceDevice>,
        ]
      : []),
    {
      key: 'timezone',
      header: t('columns.timezone'),
      render: (row) => (
        <span dir="ltr" className="text-body-sm text-text-secondary">
          {row.timezone || '—'}
        </span>
      ),
    },
    {
      key: 'lastSeenAt',
      header: t('columns.lastSeenAt'),
      render: (row) => (
        <span dir="ltr" className="text-body-sm tabular-nums text-text-secondary">
          {formatDisplayDateTime(row.lastSeenAt)}
        </span>
      ),
    },
    {
      key: 'updatedAt',
      header: t('columns.updatedAt'),
      render: (row) => (
        <span dir="ltr" className="text-body-sm tabular-nums text-text-secondary">
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
          className="flex flex-wrap items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Link
            href={ROUTES.TENANT.ATTENDANCE.DEVICE_DETAIL(row.id)}
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
            aria-label={t('a11y.openDetail', { name: row.name })}
          >
            {t('actions.view')}
          </Link>
          {canManage && row.status === 'PENDING' && (
            <PermissionGate
              permission={ATTENDANCE_CAPTURE_PERMISSIONS.DEVICE_MANAGE}
            >
              <Link
                href={ROUTES.TENANT.ATTENDANCE.DEVICE_PROVISION(row.id)}
                className={buttonVariants({ variant: 'secondary', size: 'sm' })}
              >
                {t('actions.provision')}
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
      keyExtractor={(row) => row.id}
      caption={t('a11y.table')}
      emptyTitle={t('empty.title')}
      emptyDescription={t('empty.description')}
      errorTitle={t('error')}
      retryLabel={tc('retry')}
      onRowClick={(row) =>
        router.push(ROUTES.TENANT.ATTENDANCE.DEVICE_DETAIL(row.id))
      }
      compact
    />
  );
}
