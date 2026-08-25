'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../components/common/page-header';
import { StatCard } from '../../../components/common/stat-card';
import { LoadingSpinner } from '../../../components/feedback/loading-spinner';
import { ROUTES } from '../../../constants/routes.constants';
import { useAuth } from '../../../lib/auth/auth-provider';
import { useEmployees } from '../../../modules/employee/hooks/use-employees';
import { useDepartments } from '../../../modules/organisation/hooks/use-departments';
import { useBranches } from '../../../modules/organisation/hooks/use-branches';
import { usePositions } from '../../../modules/organisation/hooks/use-positions';
import { useLegalEntities } from '../../../modules/organisation/hooks/use-legal-entities';
import {
  useAttendanceRecords,
  useAttendanceExceptions,
} from '../../../modules/attendance/hooks/use-attendance';
import { useSetupStatus } from '../../../modules/tenant/hooks/use-tenant-admin';

interface DashboardPageClientProps {
  title: string;
  description: string;
}

function todayIso(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

interface TileProps {
  title: string;
  href: string;
  query: { isLoading: boolean; isError: boolean; data?: { meta?: { total?: number } } };
  description?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

function Tile({ title, href, query, description, variant = 'default' }: TileProps) {
  const t = useTranslations();
  const value = query.isLoading || query.isError ? '—' : (query.data?.meta?.total ?? 0);

  return (
    <Link
      href={href}
      className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-600 focus-visible:ring-offset-2"
    >
      <StatCard
        title={title}
        value={value}
        description={query.isError ? t('common.error') : description}
        variant={query.isError ? 'danger' : variant}
        className="h-full transition-shadow hover:shadow-elevation-2"
      />
    </Link>
  );
}

function SetupChecklist() {
  const t = useTranslations();
  const { data, isLoading, isError } = useSetupStatus();

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }
  if (isError || !data?.data) return null;

  const setup = data.data;

  return (
    <section className="space-y-4 rounded-lg border border-border-default bg-surface-card p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-heading-h3 font-semibold text-text-primary">
            {t('tenant.settings.setup.title')}
          </h2>
          <p className="text-body-sm text-text-secondary">
            {t('tenant.settings.setup.description')}
          </p>
        </div>
        <div className="text-title-sm font-semibold text-brand-blue-700">
          {t('tenant.settings.setup.progress', { percent: setup.percentComplete })}
        </div>
      </div>
      <p className="text-body-sm">
        {setup.goLiveReady
          ? t('tenant.settings.setup.goLiveReady')
          : t('tenant.settings.setup.notReady')}
      </p>
      <ul className="space-y-2">
        {setup.steps.map((step) => {
          const label = t(`tenant.setupSteps.${step.key}` as Parameters<typeof t>[0]);
          const content = (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border-default px-3 py-2">
              <div>
                <div className="font-medium text-text-primary">{label}</div>
                <div className="text-caption text-text-secondary">
                  {step.required
                    ? t('tenant.settings.setup.required')
                    : t('tenant.settings.setup.optional')}
                  {step.blockedReason ? ` · ${step.blockedReason}` : ''}
                </div>
              </div>
              <span className="text-caption font-medium uppercase tracking-wide">{step.status}</span>
            </div>
          );
          if (step.href && step.status !== 'unavailable') {
            return (
              <li key={step.key}>
                <Link href={step.href} className="block hover:bg-surface-muted/40">
                  {content}
                </Link>
              </li>
            );
          }
          return <li key={step.key}>{content}</li>;
        })}
      </ul>
      <Link href={ROUTES.TENANT.SETTINGS} className="text-body-sm text-brand-blue-600">
        {t('tenant.settings.setup.resume')}
      </Link>
    </section>
  );
}

const QUICK_ACTIONS = [
  { key: 'addEmployee', href: ROUTES.TENANT.EMPLOYEES.NEW },
  { key: 'importEmployees', href: ROUTES.TENANT.EMPLOYEES.IMPORT },
  { key: 'recordAttendance', href: ROUTES.TENANT.ATTENDANCE.RECORDS },
  { key: 'requestLeave', href: ROUTES.TENANT.LEAVE.ROOT },
  { key: 'runPayroll', href: ROUTES.TENANT.PAYROLL.ROOT },
  { key: 'viewReports', href: ROUTES.TENANT.REPORTS.ROOT },
] as const;

export function DashboardPageClient({ title, description: _fallbackDescription }: DashboardPageClientProps) {
  const t = useTranslations();
  const { user } = useAuth();
  const today = todayIso();
  const setup = useSetupStatus();
  const goLiveReady = setup.data?.data?.goLiveReady ?? false;
  const showChecklist = !setup.isLoading && Boolean(setup.data?.data) && !goLiveReady;

  const totalEmployees = useEmployees({ pageSize: 1 });
  const activeEmployees = useEmployees({ status: 'ACTIVE', pageSize: 1 });
  const presentToday = useAttendanceRecords({
    dateFrom: today,
    dateTo: today,
    status: 'PRESENT',
    pageSize: 1,
  });
  const absentToday = useAttendanceRecords({
    dateFrom: today,
    dateTo: today,
    status: 'ABSENT',
    pageSize: 1,
  });
  const lateToday = useAttendanceRecords({
    dateFrom: today,
    dateTo: today,
    status: 'LATE',
    pageSize: 1,
  });
  const onLeaveToday = useAttendanceRecords({
    dateFrom: today,
    dateTo: today,
    status: 'ON_LEAVE',
    pageSize: 1,
  });
  const openExceptions = useAttendanceExceptions({ isResolved: false, pageSize: 1 });

  const departments = useDepartments({ pageSize: 1 });
  const branches = useBranches({ pageSize: 1 });
  const positions = usePositions({ pageSize: 1 });
  const legalEntities = useLegalEntities({ pageSize: 1 });

  const headcount = activeEmployees.data?.meta?.total ?? 0;
  const present = presentToday.data?.meta?.total ?? 0;
  const attendanceRate = headcount > 0 ? Math.round((present / headcount) * 100) : null;
  const welcomeName = user?.displayName ?? t('tenant.admin.label');

  return (
    <div className="space-y-8">
      <PageHeader
        title={showChecklist ? t('tenant.settings.setup.title') : title}
        description={
          showChecklist
            ? t('tenant.settings.setup.description')
            : t('tenant.dashboard.welcome', { name: welcomeName })
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <details className="relative">
              <summary className="cursor-pointer list-none rounded-md border border-border-default bg-surface-card px-3 py-2 text-body-sm font-medium text-text-primary hover:bg-surface-canvas">
                {t('tenant.dashboard.quickActions')}
              </summary>
              <ul className="absolute end-0 z-20 mt-1 min-w-52 rounded-lg border border-border-default bg-surface-primary py-1 shadow-elevation-3">
                {QUICK_ACTIONS.map((action) => (
                  <li key={action.key}>
                    <Link
                      href={action.href}
                      className="block px-4 py-2 text-body-sm text-text-primary hover:bg-surface-canvas"
                    >
                      {t(`tenant.dashboard.actions.${action.key}` as Parameters<typeof t>[0])}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
            <button
              type="button"
              onClick={() => {
                void totalEmployees.refetch();
                void activeEmployees.refetch();
                void presentToday.refetch();
                void absentToday.refetch();
                void lateToday.refetch();
                void onLeaveToday.refetch();
                void openExceptions.refetch();
              }}
              className="rounded-md border border-border-default bg-surface-card px-3 py-2 text-body-sm font-medium text-text-primary hover:bg-surface-canvas"
            >
              {t('tenant.dashboard.refresh')}
            </button>
          </div>
        }
      />

      {showChecklist ? <SetupChecklist /> : null}

      {!showChecklist && setup.data?.data ? (
        <div className="rounded-md border border-border-default bg-surface-muted/40 px-3 py-2 text-body-sm">
          {t('tenant.settings.setup.progress', {
            percent: setup.data.data.percentComplete,
          })}{' '}
          ·{' '}
          <Link href={ROUTES.TENANT.SETTINGS} className="text-brand-blue-600">
            {t('tenant.nav.settings')}
          </Link>
        </div>
      ) : null}

      {!showChecklist ? (
        <>
          <section aria-labelledby="workforce-heading" className="space-y-3">
            <h2 id="workforce-heading" className="text-heading-h3 font-semibold text-text-primary">
              {t('tenant.dashboard.workforceHeading')}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              <Tile
                title={t('tenant.dashboard.totalEmployees')}
                href={ROUTES.TENANT.EMPLOYEES.ROOT}
                query={totalEmployees}
              />
              <Tile
                title={t('tenant.dashboard.activeEmployees')}
                href={ROUTES.TENANT.EMPLOYEES.ROOT}
                query={activeEmployees}
              />
              <Tile
                title={t('tenant.dashboard.onLeaveToday')}
                href={ROUTES.TENANT.ATTENDANCE.RECORDS}
                query={onLeaveToday}
                variant="info"
              />
              <Tile
                title={t('tenant.dashboard.absentToday')}
                href={ROUTES.TENANT.ATTENDANCE.RECORDS}
                query={absentToday}
                variant="warning"
              />
              <Tile
                title={t('tenant.dashboard.pendingApprovals')}
                href={ROUTES.TENANT.ATTENDANCE.EXCEPTIONS}
                query={openExceptions}
                variant="danger"
                description={t('tenant.dashboard.needsReview')}
              />
              <Tile
                title={t('tenant.dashboard.lateArrivals')}
                href={ROUTES.TENANT.ATTENDANCE.RECORDS}
                query={lateToday}
                variant="warning"
                description={
                  attendanceRate === null
                    ? undefined
                    : t('tenant.dashboard.attendanceRate', { rate: attendanceRate })
                }
              />
            </div>
          </section>

          <section aria-labelledby="organisation-heading" className="space-y-3">
            <h2
              id="organisation-heading"
              className="text-heading-h3 font-semibold text-text-primary"
            >
              {t('tenant.dashboard.organisationHeading')}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Tile
                title={t('organisation.nav.departments')}
                href={ROUTES.TENANT.ORGANISATION.DEPARTMENTS}
                query={departments}
              />
              <Tile
                title={t('organisation.nav.branches')}
                href={ROUTES.TENANT.ORGANISATION.BRANCHES}
                query={branches}
              />
              <Tile
                title={t('organisation.nav.positions')}
                href={ROUTES.TENANT.ORGANISATION.POSITIONS}
                query={positions}
              />
              <Tile
                title={t('organisation.nav.legalEntities')}
                href={ROUTES.TENANT.ORGANISATION.LEGAL_ENTITIES}
                query={legalEntities}
              />
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
