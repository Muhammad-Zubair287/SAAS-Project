'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../components/common/page-header';
import { StatCard } from '../../../components/common/stat-card';
import { ROUTES } from '../../../constants/routes.constants';
import { useEmployees } from '../../../modules/employee/hooks/use-employees';
import { useDepartments } from '../../../modules/organisation/hooks/use-departments';
import { useBranches } from '../../../modules/organisation/hooks/use-branches';
import { usePositions } from '../../../modules/organisation/hooks/use-positions';
import { useLegalEntities } from '../../../modules/organisation/hooks/use-legal-entities';
import {
  useAttendanceRecords,
  useAttendanceExceptions,
} from '../../../modules/attendance/hooks/use-attendance';

interface DashboardPageClientProps {
  title: string;
  description: string;
}

/** Local calendar date — the API filters on YYYY-MM-DD. */
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

/**
 * Counts come from `meta.total` on a pageSize:1 query, so the number is the
 * server's count rather than the length of a fetched page. The attendance
 * module's own dashboard counts a capped page of 100 and therefore
 * under-reports above 100 staff; this avoids that.
 */
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

export function DashboardPageClient({ title, description }: DashboardPageClientProps) {
  const t = useTranslations();
  const today = todayIso();

  // pageSize:1 — we want meta.total, not the rows.
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
  const openExceptions = useAttendanceExceptions({ isResolved: false, pageSize: 1 });

  const departments = useDepartments({ pageSize: 1 });
  const branches = useBranches({ pageSize: 1 });
  const positions = usePositions({ pageSize: 1 });
  const legalEntities = useLegalEntities({ pageSize: 1 });

  const headcount = activeEmployees.data?.meta?.total ?? 0;
  const present = presentToday.data?.meta?.total ?? 0;
  const attendanceRate =
    headcount > 0 ? Math.round((present / headcount) * 100) : null;

  return (
    <div className="space-y-8">
      <PageHeader title={title} description={description} />

      <section aria-labelledby="workforce-heading" className="space-y-3">
        <h2
          id="workforce-heading"
          className="text-heading-h3 font-semibold text-text-primary"
        >
          {t('tenant.dashboard.workforceHeading')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Tile
            title={t('tenant.dashboard.activeEmployees')}
            href={ROUTES.TENANT.EMPLOYEES.ROOT}
            query={activeEmployees}
          />
          <Tile
            title={t('tenant.dashboard.presentToday')}
            href={ROUTES.TENANT.ATTENDANCE.RECORDS}
            query={presentToday}
            variant="success"
            description={
              attendanceRate === null
                ? undefined
                : t('tenant.dashboard.attendanceRate', { rate: attendanceRate })
            }
          />
          <Tile
            title={t('tenant.dashboard.absentToday')}
            href={ROUTES.TENANT.ATTENDANCE.RECORDS}
            query={absentToday}
            variant="warning"
          />
          <Tile
            title={t('tenant.dashboard.openExceptions')}
            href={ROUTES.TENANT.ATTENDANCE.ROOT}
            query={openExceptions}
            variant="danger"
            description={t('tenant.dashboard.needsReview')}
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
    </div>
  );
}
