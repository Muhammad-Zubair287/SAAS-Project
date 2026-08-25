'use client';

import { useTranslations } from 'next-intl';
import { DataTable, type Column } from '../../../components/common/data-table';
import { Badge } from '../../../components/ui/badge';
import type { OfflinePendingEvent } from '../types/attendance-capture.types';
import {
  formatDisplayDateTime,
  TECH_VALUE_CLASS,
} from '../utils/geofence-format';

interface OfflinePendingEventsTableProps {
  data: OfflinePendingEvent[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

/**
 * Pending offline queue events — safe DTO fields only.
 * Omits payload and payloadHash (not operator-facing business columns).
 * sequenceNumber stays a string (BigInt-safe).
 */
export function OfflinePendingEventsTable({
  data,
  isLoading,
  isError,
  onRetry,
}: OfflinePendingEventsTableProps) {
  const t = useTranslations('attendance.offline');
  const tc = useTranslations('common');

  const columns: Column<OfflinePendingEvent>[] = [
    {
      key: 'sequenceNumber',
      header: t('pending.sequence'),
      width: '120px',
      render: (row) => (
        <span
          dir="ltr"
          className={TECH_VALUE_CLASS}
          aria-label={t('a11y.sequence', { value: row.sequenceNumber })}
        >
          {row.sequenceNumber}
        </span>
      ),
    },
    {
      key: 'source',
      header: t('pending.source'),
      render: (row) => (
        <span dir="ltr" className="text-body-sm text-text-primary">
          {row.source}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('pending.status'),
      width: '120px',
      render: (row) => {
        const statusKey = row.status as 'pending' | 'completed' | 'failed';
        const known =
          statusKey === 'pending' ||
          statusKey === 'completed' ||
          statusKey === 'failed';
        return (
          <Badge variant="info" size="sm" dot>
            {known ? t(`pendingStatus.${statusKey}`) : row.status}
          </Badge>
        );
      },
    },
    {
      key: 'attempts',
      header: t('pending.attempts'),
      width: '100px',
      render: (row) => (
        <span dir="ltr" className={TECH_VALUE_CLASS}>
          {row.attempts}
        </span>
      ),
    },
    {
      key: 'uploadedAt',
      header: t('pending.uploadedAt'),
      render: (row) => (
        <span dir="ltr" className="text-body-sm tabular-nums text-text-secondary">
          {formatDisplayDateTime(row.uploadedAt)}
        </span>
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
      caption={t('a11y.pendingTable')}
      emptyTitle={t('pending.empty')}
      emptyDescription={t('pending.emptyDescription')}
      errorTitle={t('pending.error')}
      retryLabel={tc('retry')}
      compact
    />
  );
}
