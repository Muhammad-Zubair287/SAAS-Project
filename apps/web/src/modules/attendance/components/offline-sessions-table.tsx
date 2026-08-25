'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { DataTable, type Column } from '../../../components/common/data-table';
import { buttonVariants } from '../../../components/ui/button';
import { ROUTES } from '../../../constants/routes.constants';
import type { OfflineSession } from '../types/attendance-capture.types';
import { shortenDeviceId } from '../utils/capture-health';
import {
  formatDisplayDateTime,
  TECH_VALUE_CLASS,
} from '../utils/geofence-format';
import { OfflineSessionStatusBadge } from './offline-session-status-badge';

interface OfflineSessionsTableProps {
  data: OfflineSession[];
  deviceNames: Record<string, string>;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

function sessionLabel(id: string): string {
  return shortenDeviceId(id);
}

export function OfflineSessionsTable({
  data,
  deviceNames,
  isLoading,
  isError,
  onRetry,
}: OfflineSessionsTableProps) {
  const t = useTranslations('attendance.offline');
  const tc = useTranslations('common');
  const router = useRouter();

  const columns: Column<OfflineSession>[] = [
    {
      key: 'session',
      header: t('columns.sessionId'),
      render: (row) => (
        <span
          dir="ltr"
          className={TECH_VALUE_CLASS}
          title={row.id}
          aria-label={t('a11y.sessionId', { id: row.id })}
        >
          {sessionLabel(row.id)}
        </span>
      ),
    },
    {
      key: 'device',
      header: t('columns.deviceId'),
      render: (row) => {
        if (!row.deviceId) {
          return <span className="text-body-sm text-text-secondary">—</span>;
        }
        const name = deviceNames[row.deviceId];
        if (name) {
          return (
            <div>
              <p className="font-medium text-text-primary">{name}</p>
              <p
                dir="ltr"
                className="font-mono text-caption text-text-secondary"
                title={row.deviceId}
              >
                {shortenDeviceId(row.deviceId)}
              </p>
            </div>
          );
        }
        return (
          <span
            dir="ltr"
            className={TECH_VALUE_CLASS}
            title={row.deviceId}
            aria-label={t('a11y.deviceId', { id: row.deviceId })}
          >
            {shortenDeviceId(row.deviceId)}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: t('columns.status'),
      width: '130px',
      render: (row) => <OfflineSessionStatusBadge status={row.status} />,
    },
    {
      key: 'startedAt',
      header: t('columns.startedAt'),
      render: (row) => (
        <span dir="ltr" className="text-body-sm tabular-nums text-text-secondary">
          {formatDisplayDateTime(row.startedAt)}
        </span>
      ),
    },
    {
      key: 'endedAt',
      header: t('columns.endedAt'),
      render: (row) => (
        <span dir="ltr" className="text-body-sm tabular-nums text-text-secondary">
          {row.endedAt
            ? formatDisplayDateTime(row.endedAt)
            : t('fields.stillOpen')}
        </span>
      ),
    },
    {
      key: 'clientTimezone',
      header: t('columns.clientTimezone'),
      render: (row) => (
        <span dir="ltr" className="text-body-sm text-text-secondary">
          {row.clientTimezone || '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t('columns.actions'),
      width: '100px',
      render: (row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Link
            href={ROUTES.TENANT.ATTENDANCE.OFFLINE_SESSION_DETAIL(row.id)}
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
            aria-label={t('a11y.openDetailNamed', { id: sessionLabel(row.id) })}
          >
            {t('actions.view')}
          </Link>
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
        router.push(ROUTES.TENANT.ATTENDANCE.OFFLINE_SESSION_DETAIL(row.id))
      }
      compact
    />
  );
}
