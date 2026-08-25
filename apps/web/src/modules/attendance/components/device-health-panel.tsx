'use client';

import { useTranslations } from 'next-intl';
import { LoadingSpinner } from '../../../components/feedback/loading-spinner';
import { DeviceHealthBadge } from './device-health-badge';
import type { AttendanceDeviceHealth } from '../types/attendance-capture.types';
import {
  formatDisplayDateTime,
  TECH_VALUE_CLASS,
} from '../utils/geofence-format';

interface DeviceHealthPanelProps {
  health: AttendanceDeviceHealth | undefined;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

function formatPercent(value?: number): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return `${value}%`;
}

export function DeviceHealthPanel({
  health,
  isLoading,
  isError,
  onRetry,
}: DeviceHealthPanelProps) {
  const t = useTranslations('attendance.devices');
  const th = useTranslations('attendance.deviceHealth');
  const tc = useTranslations('common');

  if (isLoading) {
    return (
      <div className="flex min-h-24 items-center justify-center rounded-xl border border-border-default bg-surface-primary p-6">
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  if (isError) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-semantic-danger/30 bg-surface-primary p-6"
      >
        <p className="text-body-sm text-text-secondary">{th('error')}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 text-body-sm font-semibold text-brand-blue-600 hover:underline"
          >
            {tc('retry')}
          </button>
        )}
      </div>
    );
  }

  if (!health) {
    return (
      <div className="rounded-xl border border-border-default bg-surface-primary p-6">
        <h2 className="text-heading-h3 font-semibold text-text-primary">
          {t('sections.health')}
        </h2>
        <p className="mt-2 text-body-sm text-text-secondary">
          {th('empty.description')}
        </p>
      </div>
    );
  }

  return (
    <section
      className="rounded-xl border border-border-default bg-surface-primary p-6"
      aria-label={th('a11y.summary')}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-heading-h3 font-semibold text-text-primary">
          {t('sections.health')}
        </h2>
        <DeviceHealthBadge status={health.healthStatus} size="md" />
      </div>

      <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <dt className="text-label-md text-text-secondary">
            {th('columns.lastSeenAt')}
          </dt>
          <dd dir="ltr" className={`mt-0.5 ${TECH_VALUE_CLASS}`}>
            {formatDisplayDateTime(health.lastSeenAt)}
          </dd>
        </div>
        <div>
          <dt className="text-label-md text-text-secondary">
            {th('columns.averageCpu')}
          </dt>
          <dd dir="ltr" className={`mt-0.5 ${TECH_VALUE_CLASS}`}>
            {formatPercent(health.averageCpu)}
          </dd>
        </div>
        <div>
          <dt className="text-label-md text-text-secondary">
            {th('columns.averageMemory')}
          </dt>
          <dd dir="ltr" className={`mt-0.5 ${TECH_VALUE_CLASS}`}>
            {formatPercent(health.averageMemory)}
          </dd>
        </div>
        <div>
          <dt className="text-label-md text-text-secondary">
            {th('columns.averageDisk')}
          </dt>
          <dd dir="ltr" className={`mt-0.5 ${TECH_VALUE_CLASS}`}>
            {formatPercent(health.averageDisk)}
          </dd>
        </div>
        <div>
          <dt className="text-label-md text-text-secondary">
            {th('columns.outstandingQueue')}
          </dt>
          <dd dir="ltr" className={`mt-0.5 ${TECH_VALUE_CLASS}`}>
            {health.outstandingQueue ?? '—'}
          </dd>
        </div>
      </dl>
    </section>
  );
}
