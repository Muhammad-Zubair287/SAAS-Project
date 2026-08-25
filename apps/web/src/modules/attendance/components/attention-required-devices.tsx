'use client';

import { useTranslations } from 'next-intl';
import { DataTable, type Column } from '../../../components/common/data-table';
import { DeviceHealthBadge } from './device-health-badge';
import type { AttendanceDeviceHealth } from '../types/attendance-capture.types';
import { shortenDeviceId } from '../utils/capture-health';

interface AttentionRequiredDevicesProps {
  rows: AttendanceDeviceHealth[];
  deviceNames: Record<string, string>;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

function formatLastSeen(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function formatPercent(value?: number): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return `${value}%`;
}

/**
 * Devices whose healthStatus requires operator attention.
 * Columns map 1:1 to DeviceHealthSummary fields from the live API.
 */
export function AttentionRequiredDevices({
  rows,
  deviceNames,
  isLoading,
  isError,
  onRetry,
}: AttentionRequiredDevicesProps) {
  const t = useTranslations('attendance.capture');
  const th = useTranslations('attendance.deviceHealth');
  const tc = useTranslations('common');

  const columns: Column<AttendanceDeviceHealth>[] = [
    {
      key: 'device',
      header: th('columns.device'),
      render: (row) => {
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
            className="font-mono text-body-sm text-text-primary"
            title={row.deviceId}
            aria-label={t('a11y.deviceId', { id: row.deviceId })}
          >
            {shortenDeviceId(row.deviceId)}
          </span>
        );
      },
    },
    {
      key: 'health',
      header: th('columns.health'),
      width: '140px',
      render: (row) => <DeviceHealthBadge status={row.healthStatus} />,
    },
    {
      key: 'lastSeenAt',
      header: th('columns.lastSeenAt'),
      render: (row) => (
        <span dir="ltr" className="text-body-sm text-text-secondary tabular-nums">
          {formatLastSeen(row.lastSeenAt)}
        </span>
      ),
    },
    {
      key: 'averageCpu',
      header: th('columns.averageCpu'),
      width: '100px',
      render: (row) => (
        <span dir="ltr" className="font-mono text-body-sm tabular-nums">
          {formatPercent(row.averageCpu)}
        </span>
      ),
    },
    {
      key: 'averageMemory',
      header: th('columns.averageMemory'),
      width: '110px',
      render: (row) => (
        <span dir="ltr" className="font-mono text-body-sm tabular-nums">
          {formatPercent(row.averageMemory)}
        </span>
      ),
    },
    {
      key: 'averageDisk',
      header: th('columns.averageDisk'),
      width: '100px',
      render: (row) => (
        <span dir="ltr" className="font-mono text-body-sm tabular-nums">
          {formatPercent(row.averageDisk)}
        </span>
      ),
    },
    {
      key: 'outstandingQueue',
      header: th('columns.outstandingQueue'),
      width: '90px',
      render: (row) => (
        <span dir="ltr" className="font-mono text-body-sm tabular-nums">
          {row.outstandingQueue ?? '—'}
        </span>
      ),
    },
  ];

  return (
    <section aria-label={t('attention.title')}>
      <div className="mb-3">
        <h2 className="text-heading-h3 font-semibold text-text-primary">
          {t('attention.title')}
        </h2>
        <p className="mt-1 text-body-sm text-text-secondary">
          {t('attention.description')}
        </p>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        isError={isError}
        onRetry={onRetry}
        errorTitle={tc('error')}
        errorDescription={t('error')}
        retryLabel={t('retry')}
        keyExtractor={(row) => row.deviceId}
        caption={t('a11y.attentionTable')}
        emptyTitle={t('attention.empty')}
        compact
      />
    </section>
  );
}
