'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../../components/common/page-header';
import { AttendanceRecordsTable } from '../../../../modules/attendance/components/attendance-records-table';
import { useAttendanceRecords } from '../../../../modules/attendance/hooks/use-attendance';
import { usePagination } from '../../../../hooks/use-pagination';
import { ROUTES } from '../../../../constants/routes.constants';

interface Props {
  title: string;
  description: string;
}

export function RecordsPageClient({ title, description }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const { page, pageSize, goToPage: setPage } = usePagination();

  const { data, isLoading } = useAttendanceRecords({
    page,
    pageSize,
    status: statusFilter || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    sortOrder: 'desc',
  });

  const totalPages = data?.meta?.totalPages ?? 1;
  const total = data?.meta?.total ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[
          { label: t('tenant.nav.dashboard'), href: ROUTES.TENANT.DASHBOARD },
          { label: t('tenant.nav.attendance'), href: ROUTES.TENANT.ATTENDANCE.ROOT },
          { label: title },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none"
        >
          <option value="">{t('attendance.filters.allStatuses')}</option>
          <option value="PRESENT">Present</option>
          <option value="ABSENT">Absent</option>
          <option value="LATE">Late</option>
          <option value="HALF_DAY">Half Day</option>
          <option value="ON_LEAVE">On Leave</option>
          <option value="HOLIDAY">Holiday</option>
          <option value="WEEKEND">Weekend</option>
          <option value="MISSING_PUNCH">Missing Punch</option>
        </select>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          placeholder={t('attendance.filters.dateFrom')}
          className="rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          placeholder={t('attendance.filters.dateTo')}
          className="rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none"
        />
      </div>

      {!isLoading && (
        <p className="text-body-sm text-text-secondary">
          {t('pagination.showing', {
            from: Math.min((page - 1) * pageSize + 1, total),
            to: Math.min(page * pageSize, total),
            total,
          })}
        </p>
      )}

      <div className="rounded-lg border border-border-default bg-surface-primary">
        <AttendanceRecordsTable
          records={data?.data ?? []}
          onViewDetail={(id) => router.push(ROUTES.TENANT.ATTENDANCE.RECORD_DETAIL(id))}
        />
        {isLoading && (
          <div className="py-8 text-center text-body-md text-text-secondary">
            {t('common.loading')}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="flex h-11 min-w-11 items-center justify-center rounded-md border border-border-default px-3 text-body-sm disabled:opacity-40"
            aria-label={t('pagination.previousPage')}
          >
            ←
          </button>
          <span className="text-body-sm text-text-secondary">{page} / {totalPages}</span>
          <button
            type="button"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="flex h-11 min-w-11 items-center justify-center rounded-md border border-border-default px-3 text-body-sm disabled:opacity-40"
            aria-label={t('pagination.nextPage')}
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
