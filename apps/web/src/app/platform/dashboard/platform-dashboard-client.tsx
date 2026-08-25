'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../components/common/page-header';
import { StatCard } from '../../../components/common/stat-card';
import { LoadingSpinner } from '../../../components/feedback/loading-spinner';
import {
  useAuditEvents,
  usePlatformStats,
  usePlatformUsageSummary,
  useIntegrationIncidents,
} from '../../../modules/platform/hooks/use-tenants';
import { ROUTES } from '../../../constants/routes.constants';
import { PLATFORM_DASHBOARD_PERIODS, type PlatformDashboardPeriod } from '../../../modules/platform/constants/dashboard.constants';

interface PlatformDashboardClientProps {
  title: string;
  description: string;
}

function periodRange(period: PlatformDashboardPeriod): { from?: string; to?: string } {
  const now = new Date();
  const to = now.toISOString();
  if (period === 'custom' || period === 'all') return {};
  const from = new Date(now);
  if (period === 'today') {
    from.setHours(0, 0, 0, 0);
  } else if (period === '7d') {
    from.setDate(from.getDate() - 7);
  } else if (period === '30d') {
    from.setDate(from.getDate() - 30);
  } else if (period === 'month') {
    from.setDate(1);
    from.setHours(0, 0, 0, 0);
  }
  return { from: from.toISOString(), to };
}

function exportOverviewCsv(rows: Array<{ label: string; value: string | number }>) {
  const lines = ['Metric,Value', ...rows.map((r) => `"${r.label.replace(/"/g, '""')}",${JSON.stringify(String(r.value))}`)];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `platform-overview-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function PlatformDashboardClient({ title, description }: PlatformDashboardClientProps) {
  const t = useTranslations();
  const [period, setPeriod] = useState<PlatformDashboardPeriod>('30d');
  const range = useMemo(() => periodRange(period), [period]);

  const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats, dataUpdatedAt: statsUpdatedAt } =
    usePlatformStats();
  const { data: usage, isLoading: usageLoading, isError: usageError, refetch: refetchUsage, dataUpdatedAt: usageUpdatedAt } =
    usePlatformUsageSummary();
  const { data: incidents } = useIntegrationIncidents();
  const openIncidents = (incidents?.data ?? []).filter((i) =>
    ['FAILED', 'WARNING', 'open', 'OPEN'].includes(String(i.status).toUpperCase()),
  );

  const { data: activity, isLoading: activityLoading, isError: activityError, refetch: refetchActivity } = useAuditEvents({
    page: 1,
    pageSize: 8,
    module: 'platform',
    fromDate: range.from,
    toDate: range.to,
  });

  const counts = stats?.data;
  const lastUpdated = Math.max(statsUpdatedAt || 0, usageUpdatedAt || 0);
  const lastUpdatedLabel = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : '—';

  const kpiHref = (status?: string) =>
    status ? `${ROUTES.PLATFORM.TENANTS}?status=${encodeURIComponent(status)}` : ROUTES.PLATFORM.TENANTS;

  return (
    <div className="space-y-8">
      <PageHeader
        title={title}
        description={description}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-caption text-text-secondary">
              {t('platform.dashboard.lastUpdated', { time: lastUpdatedLabel })}
            </span>
            <button
              type="button"
              onClick={() => {
                const rows = [
                  { label: t('platform.dashboard.stats.total'), value: counts?.total ?? 0 },
                  { label: t('platform.dashboard.stats.active'), value: counts?.active ?? 0 },
                  { label: t('platform.dashboard.stats.trial'), value: counts?.trial ?? 0 },
                  { label: t('platform.dashboard.stats.suspended'), value: counts?.suspended ?? 0 },
                  { label: t('platform.usage.totalSeats'), value: usage?.data.totalSeatLimit ?? 0 },
                  { label: t('platform.usage.utilisation'), value: `${usage?.data.seatUtilisationPct ?? 0}%` },
                  { label: t('platform.usage.activeEmployees'), value: usage?.data.totalActiveEmployees ?? 0 },
                  { label: t('platform.dashboard.widgets.integrationIncidents'), value: openIncidents.length },
                ];
                exportOverviewCsv(rows);
              }}
              className="rounded-md border border-border-default px-4 py-2 text-body-md font-medium text-text-primary hover:bg-surface-canvas"
            >
              {t('platform.dashboard.actions.export')}
            </button>
            <Link
              href={ROUTES.PLATFORM.TENANTS_NEW}
              className="rounded-md bg-brand-blue-600 px-4 py-2 text-body-md font-semibold text-white hover:bg-blue-700"
            >
              {t('platform.tenants.createButton')}
            </Link>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2" role="group" aria-label={t('platform.dashboard.period.label')}>
        {PLATFORM_DASHBOARD_PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={`rounded-md px-3 py-1.5 text-body-sm font-medium ${
              period === p
                ? 'bg-brand-blue-600 text-white'
                : 'border border-border-default text-text-secondary hover:bg-surface-canvas'
            }`}
          >
            {t(`platform.dashboard.period.${p}`)}
          </button>
        ))}
      </div>

      {statsLoading ? (
        <div className="flex h-24 items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : statsError ? (
        <div className="rounded-xl border border-border-default bg-surface-primary p-6 text-center">
          <p className="text-body-md text-text-secondary">{t('common.error')}</p>
          <button type="button" onClick={() => void refetchStats()} className="mt-3 text-body-sm font-medium text-brand-blue-600">
            {t('common.retry')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Link href={kpiHref()} className="block transition-shadow hover:shadow-elevation-2">
            <StatCard title={t('platform.dashboard.stats.total')} value={counts?.total ?? 0} variant="default" />
          </Link>
          <Link href={kpiHref('ACTIVE')} className="block transition-shadow hover:shadow-elevation-2">
            <StatCard title={t('platform.dashboard.stats.active')} value={counts?.active ?? 0} variant="success" />
          </Link>
          <Link href={kpiHref('TRIAL')} className="block transition-shadow hover:shadow-elevation-2">
            <StatCard title={t('platform.dashboard.stats.trial')} value={counts?.trial ?? 0} variant="info" />
          </Link>
          <Link href={kpiHref('SUSPENDED')} className="block transition-shadow hover:shadow-elevation-2">
            <StatCard title={t('platform.dashboard.stats.suspended')} value={counts?.suspended ?? 0} variant="warning" />
          </Link>
          <Link href={ROUTES.PLATFORM.USAGE} className="block transition-shadow hover:shadow-elevation-2">
            <StatCard
              title={t('platform.usage.totalSeats')}
              value={usageLoading ? '—' : (usage?.data.totalSeatLimit ?? 0).toLocaleString()}
              variant="default"
            />
          </Link>
          <Link href={ROUTES.PLATFORM.USAGE} className="block transition-shadow hover:shadow-elevation-2">
            <StatCard
              title={t('platform.usage.utilisation')}
              value={usageLoading ? '—' : `${usage?.data.seatUtilisationPct ?? 0}%`}
              variant="info"
            />
          </Link>
          <Link href={ROUTES.PLATFORM.USAGE} className="block transition-shadow hover:shadow-elevation-2">
            <StatCard
              title={t('platform.usage.activeEmployees')}
              value={usageLoading ? '—' : (usage?.data.totalActiveEmployees ?? 0).toLocaleString()}
              variant="default"
            />
          </Link>
          <Link href={ROUTES.PLATFORM.INTEGRATION_HEALTH} className="block transition-shadow hover:shadow-elevation-2">
            <StatCard
              title={t('platform.dashboard.widgets.integrationIncidents')}
              value={openIncidents.length}
              variant={openIncidents.length > 0 ? 'warning' : 'success'}
            />
          </Link>
        </div>
      )}

      {usageError && (
        <div className="rounded-xl border border-border-default bg-surface-primary p-4 text-body-sm text-text-secondary">
          {t('common.error')}{' '}
          <button type="button" onClick={() => void refetchUsage()} className="font-medium text-brand-blue-600">
            {t('common.retry')}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <section className="rounded-xl border border-border-default bg-surface-primary p-5">
          <h2 className="text-title-md font-semibold text-text-primary">{t('platform.dashboard.widgets.subscriptionAlerts')}</h2>
          {statsLoading ? (
            <LoadingSpinner />
          ) : (
            <ul className="mt-3 space-y-2 text-body-sm text-text-secondary">
              <li>
                {t('platform.dashboard.widgets.trialsEndingSoon')}:{' '}
                <span className="font-semibold text-text-primary tabular-nums">{counts?.trialsEndingSoon ?? 0}</span>
              </li>
              <li>
                {t('platform.dashboard.stats.grace')}:{' '}
                <span className="font-semibold text-text-primary tabular-nums">{counts?.grace ?? 0}</span>
              </li>
              <li>
                {t('platform.dashboard.stats.suspended')}:{' '}
                <span className="font-semibold text-text-primary tabular-nums">{counts?.suspended ?? 0}</span>
              </li>
              {(counts?.trialsEndingSoon ?? 0) === 0 && (counts?.grace ?? 0) === 0 && (counts?.suspended ?? 0) === 0 && (
                <li className="text-text-secondary">{t('platform.dashboard.widgets.noAlerts')}</li>
              )}
            </ul>
          )}
        </section>
        <section className="rounded-xl border border-border-default bg-surface-primary p-5">
          <h2 className="text-title-md font-semibold text-text-primary">{t('platform.dashboard.widgets.supportIssues')}</h2>
          <p className="mt-3 text-body-sm text-text-secondary">{t('platform.dashboard.widgets.supportIssuesDeferred')}</p>
        </section>
        <section className="rounded-xl border border-border-default bg-surface-primary p-5">
          <h2 className="text-title-md font-semibold text-text-primary">{t('platform.dashboard.widgets.supportAccess')}</h2>
          <p className="mt-3 text-body-sm text-text-secondary">
            {t('platform.dashboard.widgets.activeGrants')}:{' '}
            <span className="font-semibold text-text-primary tabular-nums">{counts?.activeSupportGrants ?? 0}</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href={ROUTES.PLATFORM.SUPPORT} className="text-body-sm font-medium text-brand-blue-600 hover:underline">
              {t('platform.dashboard.actions.grantSupport')}
            </Link>
            <Link href={ROUTES.PLATFORM.SUPPORT} className="text-body-sm font-medium text-brand-blue-600 hover:underline">
              {t('platform.nav.supportAccess')}
            </Link>
          </div>
        </section>
        <section className="rounded-xl border border-border-default bg-surface-primary p-5">
          <h2 className="text-title-md font-semibold text-text-primary">{t('platform.dashboard.widgets.integrationIncidents')}</h2>
          {openIncidents.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {openIncidents.slice(0, 3).map((inc) => (
                <li key={inc.id} className="text-body-sm">
                  <span className="font-medium text-text-primary">{inc.name ?? inc.integrationName}</span>
                  <span className="ml-1 text-text-secondary">
                    — {inc.status}
                    {inc.category ? ` (${inc.category})` : ''}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-body-sm text-text-secondary">{t('platform.dashboard.widgets.noIncidents')}</p>
          )}
          <Link
            href={ROUTES.PLATFORM.INTEGRATION_HEALTH}
            className="mt-3 inline-block text-body-sm font-medium text-brand-blue-600 hover:underline"
          >
            {t('platform.dashboard.actions.reviewHealth')}
          </Link>
        </section>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-heading-h3 font-bold text-text-primary">{t('platform.dashboard.recentActivity')}</h2>
          <Link href={ROUTES.PLATFORM.AUDIT} className="text-body-md font-medium text-brand-blue-600 hover:text-blue-700">
            {t('platform.dashboard.actions.viewAll')}
          </Link>
        </div>
        {activityLoading && (
          <div className="flex justify-center p-8">
            <LoadingSpinner />
          </div>
        )}
        {activityError && (
          <div className="rounded-xl border border-border-default bg-surface-primary p-6 text-center">
            <p className="text-body-md text-text-secondary">{t('common.error')}</p>
            <button type="button" onClick={() => void refetchActivity()} className="mt-3 text-body-sm font-medium text-brand-blue-600">
              {t('common.retry')}
            </button>
          </div>
        )}
        {!activityLoading && !activityError && (activity?.data ?? []).length === 0 && (
          <div className="rounded-xl border border-border-default bg-surface-primary p-6 text-body-md text-text-secondary">
            {t('platform.dashboard.noRecentActivity')}
          </div>
        )}
        {!activityLoading && !activityError && (activity?.data ?? []).length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-border-default bg-surface-primary">
            <table className="min-w-full text-body-sm">
              <caption className="sr-only">{t('platform.dashboard.recentActivity')}</caption>
              <thead className="border-b border-border-default bg-surface-canvas">
                <tr>
                  <th scope="col" className="px-4 py-3 text-start font-semibold text-text-secondary">
                    {t('platform.audit.columns.time')}
                  </th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold text-text-secondary">
                    {t('platform.audit.columns.action')}
                  </th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold text-text-secondary">
                    {t('platform.audit.columns.tenant')}
                  </th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold text-text-secondary">
                    {t('platform.audit.columns.actor')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {(activity?.data ?? []).map((event) => (
                  <tr key={event.id} className="border-b border-border-default last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 text-text-secondary">
                      {new Date(event.occurredAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-text-primary">{event.action}</td>
                    <td className="px-4 py-3 text-text-secondary">
                      {event.tenantId ? (
                        <Link href={ROUTES.PLATFORM.TENANT_DETAIL(event.tenantId)} className="text-brand-blue-600 hover:underline">
                          {event.tenantDisplayName ?? event.tenantId.slice(0, 8)}
                        </Link>
                      ) : (
                        (event.tenantDisplayName ?? '—')
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{event.actorEmail ?? event.actorId.slice(0, 8)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
