'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAttendancePolicy } from '@/modules/attendance/hooks/use-attendance-policies';
import { AttendancePolicyScopeBadge } from '@/modules/attendance/components/attendance-policy-scope-badge';
import type { AttendancePolicy } from '@/modules/attendance/types/attendance-policy.types';

interface Props { id: string }

export function PolicyDetailPageClient({ id }: Props) {
  const t = useTranslations('attendance.policy');
  const { data, isLoading, error } = useAttendancePolicy(id);
  const policy = (data as { data?: AttendancePolicy } | undefined)?.data;

  if (isLoading) return <div className="p-8 text-sm text-gray-500">{t('detail.loading')}</div>;
  if (error || !policy) return <div className="p-8 text-sm text-red-600">{t('detail.error')}</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/attendance/policies" className="text-sm text-gray-500 hover:text-gray-700">
          &larr; {t('detail.back')}
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{policy.name}</h1>
          {policy.description && <p className="mt-1 text-sm text-gray-500">{policy.description}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AttendancePolicyScopeBadge legalEntityId={policy.legalEntityId} branchId={policy.branchId} />
          {policy.isCurrent && (
            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
              {t('status.current')}
            </span>
          )}
          <Link
            href={`/attendance/policies/${id}/edit`}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t('actions.edit')}
          </Link>
        </div>
      </div>

      {/* Rule summary */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-4">{t('detail.rules')}</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          {[
            { key: 'workingHours', value: `${policy.workStartTime} \u2013 ${policy.workEndTime}` },
            { key: 'workingMinutes', value: `${policy.workingMinutesPerDay} min` },
            { key: 'graceMinutes', value: `${policy.graceMinutes} min` },
            { key: 'lateToleranceMinutes', value: `${policy.lateToleranceMinutes} min` },
            { key: 'halfDayMinutes', value: `${policy.halfDayMinutes} min` },
            { key: 'minimumWorkingMinutes', value: `${policy.minimumWorkingMinutes} min` },
            { key: 'overtimeThresholdMinutes', value: `${policy.overtimeThresholdMinutes} min` },
            { key: 'timezone', value: policy.timezone },
          ].map(({ key, value }) => (
            <div key={key}>
              <dt className="text-xs text-gray-400">{t(`fields.${key}`)}</dt>
              <dd className="text-sm font-medium text-gray-900">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Effective dates + version */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-4">{t('detail.versionHistory')}</h2>
        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-gray-400">{t('fields.effectiveFrom')}</dt>
            <dd className="font-medium">{policy.effectiveFrom}</dd>
          </div>
          <div>
            <dt className="text-gray-400">{t('fields.effectiveTo')}</dt>
            <dd className="font-medium">{policy.effectiveTo ?? t('status.ongoing')}</dd>
          </div>
          <div>
            <dt className="text-gray-400">{t('fields.version')}</dt>
            <dd className="font-medium">{policy.version}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
