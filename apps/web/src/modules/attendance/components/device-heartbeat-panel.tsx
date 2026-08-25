'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { DataTable, type Column } from '../../../components/common/data-table';
import { LoadingSpinner } from '../../../components/feedback/loading-spinner';
import {
  useAttendanceHeartbeats,
  useAttendanceLatestHeartbeat,
} from '../hooks/use-attendance-devices';
import type { AttendanceDeviceHeartbeat } from '../types/attendance-capture.types';
import { HEARTBEAT_SINCE_HOURS } from '../utils/device-lifecycle';
import {
  formatDisplayDateTime,
  TECH_VALUE_CLASS,
} from '../utils/geofence-format';

interface DeviceHeartbeatPanelProps {
  deviceId: string;
  enabled?: boolean;
}

function formatMetric(value?: number | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return String(value);
}

function formatPercent(value?: number | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return `${value}%`;
}

export function DeviceHeartbeatPanel({
  deviceId,
  enabled = true,
}: DeviceHeartbeatPanelProps) {
  const t = useTranslations('attendance.devices');
  const tc = useTranslations('common');
  const [sinceHours, setSinceHours] =
    useState<(typeof HEARTBEAT_SINCE_HOURS)[number]>(24);

  const latest = useAttendanceLatestHeartbeat(enabled ? deviceId : undefined);
  const history = useAttendanceHeartbeats(enabled ? deviceId : undefined, {
    sinceHours,
  });

  const latestHb = latest.data?.data ?? null;
  const rows = history.data?.data ?? [];

  const columns: Column<AttendanceDeviceHeartbeat>[] = [
    {
      key: 'occurredAt',
      header: t('heartbeat.columns.occurredAt'),
      render: (row) => (
        <span dir="ltr" className={TECH_VALUE_CLASS}>
          {formatDisplayDateTime(row.occurredAt)}
        </span>
      ),
    },
    {
      key: 'cpu',
      header: t('heartbeat.columns.cpu'),
      render: (row) => (
        <span dir="ltr" className={TECH_VALUE_CLASS}>
          {formatPercent(row.cpu)}
        </span>
      ),
    },
    {
      key: 'memory',
      header: t('heartbeat.columns.memory'),
      render: (row) => (
        <span dir="ltr" className={TECH_VALUE_CLASS}>
          {formatPercent(row.memory)}
        </span>
      ),
    },
    {
      key: 'disk',
      header: t('heartbeat.columns.disk'),
      render: (row) => (
        <span dir="ltr" className={TECH_VALUE_CLASS}>
          {formatPercent(row.disk)}
        </span>
      ),
    },
    {
      key: 'queueLength',
      header: t('heartbeat.columns.queueLength'),
      render: (row) => (
        <span dir="ltr" className={TECH_VALUE_CLASS}>
          {formatMetric(row.queueLength)}
        </span>
      ),
    },
    {
      key: 'clockOffsetMs',
      header: t('heartbeat.columns.clockOffsetMs'),
      render: (row) => (
        <span dir="ltr" className={TECH_VALUE_CLASS}>
          {formatMetric(row.clockOffsetMs)}
        </span>
      ),
    },
    {
      key: 'firmwareVersion',
      header: t('heartbeat.columns.firmwareVersion'),
      render: (row) => (
        <span dir="ltr" className={TECH_VALUE_CLASS}>
          {row.firmwareVersion || '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border-default bg-surface-primary p-6">
        <h2 className="text-heading-h3 font-semibold text-text-primary">
          {t('sections.heartbeatLatest')}
        </h2>

        {latest.isLoading && (
          <div className="mt-4 flex min-h-20 items-center justify-center">
            <LoadingSpinner size="sm" />
          </div>
        )}

        {latest.isError && (
          <div role="alert" className="mt-4">
            <p className="text-body-sm text-text-secondary">
              {t('heartbeat.error')}
            </p>
            <button
              type="button"
              onClick={() => void latest.refetch()}
              className="mt-2 text-body-sm font-semibold text-brand-blue-600 hover:underline"
            >
              {tc('retry')}
            </button>
          </div>
        )}

        {!latest.isLoading && !latest.isError && !latestHb && (
          <p className="mt-4 text-body-sm text-text-secondary">
            {t('heartbeat.empty')}
          </p>
        )}

        {latestHb && (
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Metric
              label={t('heartbeat.columns.cpu')}
              value={formatPercent(latestHb.cpu)}
            />
            <Metric
              label={t('heartbeat.columns.memory')}
              value={formatPercent(latestHb.memory)}
            />
            <Metric
              label={t('heartbeat.columns.disk')}
              value={formatPercent(latestHb.disk)}
            />
            <Metric
              label={t('heartbeat.columns.queueLength')}
              value={formatMetric(latestHb.queueLength)}
            />
            <Metric
              label={t('heartbeat.columns.firmwareVersion')}
              value={latestHb.firmwareVersion || '—'}
            />
            <Metric
              label={t('heartbeat.columns.clockOffsetMs')}
              value={formatMetric(latestHb.clockOffsetMs)}
            />
            <Metric
              label={t('heartbeat.columns.lastSyncAt')}
              value={formatDisplayDateTime(latestHb.lastSyncAt)}
            />
            <Metric
              label={t('heartbeat.columns.occurredAt')}
              value={formatDisplayDateTime(latestHb.occurredAt)}
            />
            {latestHb.ipAddress != null && latestHb.ipAddress !== '' && (
              <Metric
                label={t('heartbeat.columns.ipAddress')}
                value={latestHb.ipAddress}
              />
            )}
          </dl>
        )}
      </section>

      <section className="space-y-4 rounded-xl border border-border-default bg-surface-primary p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-heading-h3 font-semibold text-text-primary">
            {t('sections.heartbeatHistory')}
          </h2>
          <div>
            <label
              htmlFor="heartbeat-since"
              className="mb-1 block text-label-md text-text-secondary sm:sr-only"
            >
              {t('heartbeat.sinceHours')}
            </label>
            <select
              id="heartbeat-since"
              value={sinceHours}
              onChange={(e) =>
                setSinceHours(
                  Number(e.target.value) as (typeof HEARTBEAT_SINCE_HOURS)[number],
                )
              }
              className="rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20"
            >
              {HEARTBEAT_SINCE_HOURS.map((h) => (
                <option key={h} value={h}>
                  {t(`heartbeat.hours.${h}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={rows}
          isLoading={history.isLoading}
          isError={history.isError}
          onRetry={() => void history.refetch()}
          keyExtractor={(row) => row.id}
          caption={t('a11y.heartbeatTable')}
          emptyTitle={t('heartbeat.empty')}
          errorTitle={t('heartbeat.error')}
          retryLabel={tc('retry')}
          compact
        />
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-label-md text-text-secondary">{label}</dt>
      <dd dir="ltr" className={`mt-0.5 ${TECH_VALUE_CLASS}`}>
        {value}
      </dd>
    </div>
  );
}
