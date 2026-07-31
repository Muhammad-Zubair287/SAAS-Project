'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../components/common/page-header';
import { AttendanceSummaryCard } from '../../../modules/attendance/components/attendance-summary-card';
import { AttendanceRecordsTable } from '../../../modules/attendance/components/attendance-records-table';
import { useAttendanceRecords } from '../../../modules/attendance/hooks/use-attendance';
import { ROUTES } from '../../../constants/routes.constants';

interface Props {
  title: string;
  description: string;
}

export function AttendanceDashboardClient({ title, description }: Props) {
  const t = useTranslations();
  const router = useRouter();

  const today = new Date().toISOString().split('T')[0];
  const { data, isLoading } = useAttendanceRecords({
    dateFrom: today,
    dateTo: today,
    pageSize: 100,
  });

  const records = data?.data ?? [];

  const presentCount = records.filter((r) => r.status === 'PRESENT').length;
  const absentCount  = records.filter((r) => r.status === 'ABSENT').length;
  const lateCount    = records.filter((r) => r.status === 'LATE').length;

  const { data: recentData, isLoading: isRecentLoading } = useAttendanceRecords({
    pageSize: 10,
    sortOrder: 'desc',
  });

  const recentRecords = recentData?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[
          { label: t('tenant.nav.dashboard'), href: ROUTES.TENANT.DASHBOARD },
          { label: title },
        ]}
      />

      {!isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AttendanceSummaryCard
            title={t('attendance.cards.presentToday')}
            value={presentCount}
            colorClass="text-green-700"
          />
          <AttendanceSummaryCard
            title={t('attendance.cards.absentToday')}
            value={absentCount}
            colorClass="text-red-700"
          />
          <AttendanceSummaryCard
            title={t('attendance.cards.lateToday')}
            value={lateCount}
            colorClass="text-yellow-700"
          />
          <AttendanceSummaryCard
            title={t('attendance.cards.totalRecords')}
            value={data?.meta?.total ?? 0}
          />
        </div>
      )}

      <div className="rounded-lg border border-border-default bg-surface-primary">
        <div className="border-b border-border-default px-6 py-4">
          <h2 className="text-heading-h3 font-semibold text-text-primary">
            {t('attendance.records.title')}
          </h2>
        </div>
        <AttendanceRecordsTable
          records={recentRecords}
          onViewDetail={(id) => router.push(ROUTES.TENANT.ATTENDANCE.RECORD_DETAIL(id))}
        />
        {isRecentLoading && (
          <div className="py-8 text-center text-body-md text-text-secondary">
            {t('common.loading')}
          </div>
        )}
      </div>
    </div>
  );
}
