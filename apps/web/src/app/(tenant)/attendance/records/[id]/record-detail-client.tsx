'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../../../components/common/page-header';
import { AttendanceStatusBadge } from '../../../../../modules/attendance/components/attendance-status-badge';
import { AttendanceExceptionsTable } from '../../../../../modules/attendance/components/attendance-exceptions-table';
import {
  useAttendanceRecord,
  useAttendanceExceptions,
} from '../../../../../modules/attendance/hooks/use-attendance';
import { ROUTES } from '../../../../../constants/routes.constants';

interface Props {
  id: string;
  breadcrumb: string;
}

function formatMinutes(mins: number): string {
  if (mins === 0) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function RecordDetailClient({ id, breadcrumb }: Props) {
  const t = useTranslations();
  const { data: recordResponse, isLoading } = useAttendanceRecord(id);
  const record = recordResponse?.data;

  const { data: exceptionsResponse } = useAttendanceExceptions(
    record ? { employeeId: record.employeeId, dateFrom: record.attendanceDate, dateTo: record.attendanceDate } : undefined,
  );
  const exceptions = exceptionsResponse?.data ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-text-secondary text-body-md">
        {t('common.loading')}
      </div>
    );
  }

  if (!record) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-text-secondary text-body-md">{t('errors.notFound')}</p>
        <Link
          href={ROUTES.TENANT.ATTENDANCE.RECORDS}
          className="text-brand-blue-600 underline text-body-sm"
        >
          {t('common.back')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('attendance.detail.title')}
        description={record.attendanceDate}
        breadcrumbs={[
          { label: t('tenant.nav.dashboard'), href: ROUTES.TENANT.DASHBOARD },
          { label: t('tenant.nav.attendance'), href: ROUTES.TENANT.ATTENDANCE.ROOT },
          { label: t('attendance.records.title'), href: ROUTES.TENANT.ATTENDANCE.RECORDS },
          { label: breadcrumb },
        ]}
      />

      <div className="rounded-lg border border-border-default bg-surface-primary p-6 space-y-4">
        <h2 className="text-heading-h3 font-semibold text-text-primary">
          {t('attendance.detail.sectionRecord')}
        </h2>

        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-body-sm text-text-secondary">{t('attendance.columns.date')}</dt>
            <dd className="text-body-md font-medium text-text-primary">{record.attendanceDate}</dd>
          </div>
          <div>
            <dt className="text-body-sm text-text-secondary">{t('attendance.columns.status')}</dt>
            <dd className="mt-0.5">
              <AttendanceStatusBadge status={record.status} />
            </dd>
          </div>
          <div>
            <dt className="text-body-sm text-text-secondary">{t('attendance.columns.checkIn')}</dt>
            <dd className="text-body-md font-medium text-text-primary">
              {formatDateTime(record.firstCheckIn)}
            </dd>
          </div>
          <div>
            <dt className="text-body-sm text-text-secondary">{t('attendance.columns.checkOut')}</dt>
            <dd className="text-body-md font-medium text-text-primary">
              {formatDateTime(record.lastCheckOut)}
            </dd>
          </div>
          <div>
            <dt className="text-body-sm text-text-secondary">{t('attendance.columns.worked')}</dt>
            <dd className="text-body-md font-medium text-text-primary">
              {formatMinutes(record.totalWorkedMinutes)}
            </dd>
          </div>
          <div>
            <dt className="text-body-sm text-text-secondary">Overtime</dt>
            <dd className="text-body-md font-medium text-text-primary">
              {formatMinutes(record.overtimeMinutes)}
            </dd>
          </div>
          <div>
            <dt className="text-body-sm text-text-secondary">Late</dt>
            <dd className="text-body-md font-medium text-text-primary">
              {formatMinutes(record.lateMinutes)}
            </dd>
          </div>
          <div>
            <dt className="text-body-sm text-text-secondary">Version</dt>
            <dd className="text-body-md font-medium text-text-primary">
              {record.calculationVersion}
            </dd>
          </div>
          {record.manualNote && (
            <div className="col-span-full">
              <dt className="text-body-sm text-text-secondary">Note</dt>
              <dd className="text-body-md text-text-primary">{record.manualNote}</dd>
            </div>
          )}
        </dl>
      </div>

      {exceptions.length > 0 && (
        <div className="rounded-lg border border-border-default bg-surface-primary">
          <div className="border-b border-border-default px-6 py-4">
            <h2 className="text-heading-h3 font-semibold text-text-primary">
              {t('attendance.detail.sectionExceptions')}
            </h2>
          </div>
          <AttendanceExceptionsTable exceptions={exceptions} />
        </div>
      )}

      <div>
        <Link
          href={ROUTES.TENANT.ATTENDANCE.RECORDS}
          className="inline-flex items-center gap-2 text-body-sm text-brand-blue-600 hover:underline"
        >
          ← {t('common.back')}
        </Link>
      </div>
    </div>
  );
}
