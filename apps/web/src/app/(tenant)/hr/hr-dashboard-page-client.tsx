'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../components/common/page-header';
import { StatCard } from '../../../components/common/stat-card';
import { LoadingSpinner } from '../../../components/feedback/loading-spinner';
import { ROUTES } from '../../../constants/routes.constants';
import {
  HR_ACTION_CENTRE_ROUTES,
  HR_QUICK_ACTIONS,
} from '../../../modules/hr/constants/hr-dashboard.constants';
import { useHrDashboard } from '../../../modules/hr/hooks/use-hr';
import type {
  HrActionCentreKey,
  HrActionSeverity,
  HrDashboardResponse,
} from '../../../modules/hr/types/hr.types';

interface HrDashboardPageClientProps {
  title: string;
  description: string;
}

function severityClass(severity: HrActionSeverity): string {
  if (severity === 'danger') return 'border-semantic-danger/40 bg-semantic-danger/5 text-semantic-danger';
  if (severity === 'warning') return 'border-semantic-warning/40 bg-semantic-warning/5 text-semantic-warning';
  return 'border-brand-blue-200 bg-brand-blue-50 text-brand-blue-700';
}

function SimpleBarChart({
  items,
  valueKey,
  labelKey,
  emptyLabel,
}: {
  items: Array<Record<string, string | number | null>>;
  valueKey: string;
  labelKey: string;
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <p className="text-body-sm text-text-secondary">{emptyLabel}</p>;
  }
  const max = Math.max(
    ...items.map((item) => Number(item[valueKey] ?? 0)),
    1,
  );

  return (
    <ul className="space-y-3">
      {items.map((item, index) => {
        const value = Number(item[valueKey] ?? 0);
        const label = String(item[labelKey] ?? '—');
        const width = `${Math.round((value / max) * 100)}%`;
        return (
          <li key={`${label}-${index}`} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-body-sm">
              <span className="truncate text-text-primary">{label}</span>
              <span className="shrink-0 font-semibold text-text-secondary">{value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-canvas">
              <div
                className="h-full rounded-full bg-brand-blue-600 transition-[width] duration-500"
                style={{ width }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function AttendanceTrendChart({
  series,
  emptyLabel,
  presentLabel,
}: {
  series: HrDashboardResponse['charts']['attendanceTrend'];
  emptyLabel: string;
  presentLabel: string;
}) {
  if (series.length === 0) {
    return <p className="text-body-sm text-text-secondary">{emptyLabel}</p>;
  }
  const max = Math.max(...series.map((d) => d.present), 1);
  const points = series
    .map((d, i) => {
      const x = series.length === 1 ? 50 : (i / (series.length - 1)) * 100;
      const y = 100 - (d.present / max) * 90 - 5;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="space-y-3">
      <svg viewBox="0 0 100 100" className="h-40 w-full" role="img" aria-label={presentLabel}>
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-brand-blue-600"
          points={points}
        />
        {series.map((d, i) => {
          const x = series.length === 1 ? 50 : (i / (series.length - 1)) * 100;
          const y = 100 - (d.present / max) * 90 - 5;
          return (
            <circle
              key={d.date}
              cx={x}
              cy={y}
              r="1.8"
              className="fill-brand-blue-700"
            />
          );
        })}
      </svg>
      <div className="flex justify-between gap-1 overflow-x-auto text-caption text-text-tertiary">
        {series.map((d) => (
          <span key={d.date} className="shrink-0">
            {d.date.slice(5)}
          </span>
        ))}
      </div>
    </div>
  );
}

function KpiGrid({ dashboard }: { dashboard: HrDashboardResponse }) {
  const t = useTranslations('hr.dashboard');
  const cards = [
    {
      key: 'activeEmployees',
      value: dashboard.kpis.activeEmployees,
      href: ROUTES.TENANT.EMPLOYEES.ROOT,
    },
    {
      key: 'presentToday',
      value: dashboard.kpis.presentToday,
      href: ROUTES.TENANT.ATTENDANCE.RECORDS,
      variant: 'success' as const,
    },
    {
      key: 'onLeaveToday',
      value: dashboard.kpis.onLeaveToday,
      href: ROUTES.TENANT.LEAVE.REQUESTS,
      variant: 'info' as const,
    },
    {
      key: 'pendingApprovals',
      value: dashboard.kpis.pendingApprovals,
      href: ROUTES.TENANT.APPROVALS.ROOT,
      variant: 'warning' as const,
    },
    {
      key: 'newJoiners',
      value: dashboard.kpis.newJoinersThisMonth,
      href: ROUTES.TENANT.EMPLOYEES.ROOT,
    },
    {
      key: 'exits',
      value: dashboard.kpis.exitsThisMonth,
      href: ROUTES.TENANT.EMPLOYEES.ROOT,
    },
    {
      key: 'probationDue',
      value: dashboard.kpis.probationDue,
      href: ROUTES.TENANT.EMPLOYEES.ROOT,
      variant: 'warning' as const,
    },
    {
      key: 'documentsExpiring',
      value: dashboard.kpis.documentsExpiring,
      href: ROUTES.TENANT.DOCUMENTS.ROOT,
      variant: 'danger' as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Link
          key={card.key}
          href={card.href}
          className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-600 focus-visible:ring-offset-2"
        >
          <StatCard
            title={t(`kpis.${card.key}` as Parameters<typeof t>[0])}
            value={card.value}
            variant={card.variant}
            className="h-full transition-shadow hover:shadow-elevation-2"
          />
        </Link>
      ))}
    </div>
  );
}

export function HrDashboardPageClient({ title, description }: HrDashboardPageClientProps) {
  const t = useTranslations();
  const { data, isLoading, isError, isFetching } = useHrDashboard();
  const dashboard = data?.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[
          { label: t('tenant.nav.home'), href: ROUTES.TENANT.DASHBOARD },
          { label: title },
        ]}
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            {isFetching && !isLoading ? (
              <span className="text-caption text-text-tertiary">{t('common.refreshing')}</span>
            ) : null}
            <Link
              href={ROUTES.TENANT.EMPLOYEES.NEW}
              className="rounded-md bg-brand-blue-600 px-4 py-2 text-body-md font-semibold text-white transition-colors hover:bg-brand-blue-500"
            >
              {t('hr.dashboard.actions.addEmployee')}
            </Link>
          </div>
        )}
      />

      {isLoading && (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-semantic-danger/30 bg-semantic-danger/5 p-8 text-center text-semantic-danger">
          {t('errors.generic')}
        </div>
      )}

      {!isLoading && !isError && dashboard && (
        <>
          <KpiGrid dashboard={dashboard} />

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-border-default bg-surface-primary p-4 sm:p-6">
              <h2 className="mb-4 text-title-md font-semibold text-text-primary">
                {t('hr.dashboard.charts.attendanceTrend')}
              </h2>
              <AttendanceTrendChart
                series={dashboard.charts.attendanceTrend}
                emptyLabel={t('hr.dashboard.charts.empty')}
                presentLabel={t('hr.dashboard.kpis.presentToday')}
              />
            </div>
            <div className="rounded-xl border border-border-default bg-surface-primary p-4 sm:p-6">
              <h2 className="mb-4 text-title-md font-semibold text-text-primary">
                {t('hr.dashboard.charts.workforceComposition')}
              </h2>
              <SimpleBarChart
                items={dashboard.charts.workforceComposition.map((row) => ({
                  label: row.label ?? t('hr.dashboard.charts.unassignedDepartment'),
                  count: row.count,
                }))}
                valueKey="count"
                labelKey="label"
                emptyLabel={t('hr.dashboard.charts.empty')}
              />
            </div>
            <div className="rounded-xl border border-border-default bg-surface-primary p-4 sm:p-6">
              <h2 className="mb-4 text-title-md font-semibold text-text-primary">
                {t('hr.dashboard.charts.headcountGrowth')}
              </h2>
              <SimpleBarChart
                items={dashboard.charts.headcountGrowth.map((row) => ({
                  label: row.month,
                  count: row.headcount,
                }))}
                valueKey="count"
                labelKey="label"
                emptyLabel={t('hr.dashboard.charts.empty')}
              />
            </div>
            <div className="rounded-xl border border-border-default bg-surface-primary p-4 sm:p-6">
              <h2 className="mb-4 text-title-md font-semibold text-text-primary">
                {t('hr.dashboard.charts.leaveUtilisation')}
              </h2>
              <SimpleBarChart
                items={dashboard.charts.leaveUtilisation.map((row) => ({
                  label: row.status,
                  count: row.days,
                }))}
                valueKey="count"
                labelKey="label"
                emptyLabel={t('hr.dashboard.charts.empty')}
              />
            </div>
          </section>

          <section className="rounded-xl border border-border-default bg-surface-primary p-4 sm:p-6">
            <h2 className="mb-4 text-title-md font-semibold text-text-primary">
              {t('hr.dashboard.actionCentre.title')}
            </h2>
            {dashboard.actionCentre.length === 0 ? (
              <p className="text-body-sm text-text-secondary">
                {t('hr.dashboard.actionCentre.empty')}
              </p>
            ) : (
              <ul className="space-y-2">
                {dashboard.actionCentre.map((item) => {
                  const key = item.key as HrActionCentreKey;
                  return (
                    <li key={item.key}>
                      <Link
                        href={HR_ACTION_CENTRE_ROUTES[key]}
                        className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors hover:opacity-90 ${severityClass(item.severity)}`}
                      >
                        <span className="text-body-md font-medium">
                          {t(`hr.dashboard.actionCentre.items.${key}`, {
                            count: item.count,
                          })}
                        </span>
                        <span className="text-caption font-semibold uppercase tracking-wide">
                          {t('hr.dashboard.actionCentre.review')}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-border-default bg-surface-primary p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-title-md font-semibold text-text-primary">
                {t('hr.dashboard.recentActivity.title')}
              </h2>
              <Link
                href={ROUTES.TENANT.EMPLOYEES.ROOT}
                className="text-body-sm font-semibold text-brand-blue-600 hover:underline"
              >
                {t('hr.dashboard.recentActivity.viewAll')}
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] border-collapse text-body-sm">
                <thead>
                  <tr className="border-b border-border-default bg-surface-canvas text-left">
                    <th className="px-3 py-2 font-semibold">{t('hr.dashboard.recentActivity.columns.time')}</th>
                    <th className="px-3 py-2 font-semibold">{t('hr.dashboard.recentActivity.columns.event')}</th>
                    <th className="px-3 py-2 font-semibold">{t('hr.dashboard.recentActivity.columns.employee')}</th>
                    <th className="px-3 py-2 font-semibold">{t('hr.dashboard.recentActivity.columns.status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {dashboard.recentActivity.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-text-secondary">
                        {t('hr.dashboard.recentActivity.empty')}
                      </td>
                    </tr>
                  ) : (
                    dashboard.recentActivity.map((row) => (
                      <tr key={row.id}>
                        <td className="px-3 py-3 text-text-secondary">
                          {new Date(row.occurredAt).toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-text-primary">{row.summary}</td>
                        <td className="px-3 py-3">
                          <Link
                            href={ROUTES.TENANT.EMPLOYEES.DETAIL(row.employee.id)}
                            className="font-medium text-brand-blue-600 hover:underline"
                          >
                            {row.employee.displayName}
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-text-secondary">
                          {row.status || row.eventType}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-border-default bg-surface-primary p-4 sm:p-6">
            <h2 className="mb-4 text-title-md font-semibold text-text-primary">
              {t('hr.dashboard.quickActions.title')}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {HR_QUICK_ACTIONS.map((action) => (
                <Link
                  key={action.key}
                  href={action.href}
                  className="rounded-lg border border-border-default px-4 py-3 text-body-md font-semibold text-text-primary transition-colors hover:border-brand-blue-300 hover:bg-brand-blue-50"
                >
                  {t(`hr.dashboard.quickActions.${action.key}`)}
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
