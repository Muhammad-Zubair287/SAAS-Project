'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AttendancePolicyScopeBadge } from './attendance-policy-scope-badge';
import type { AttendancePolicy } from '../types/attendance-policy.types';

interface Props {
  policy: AttendancePolicy;
}

export function AttendancePolicyCard({ policy }: Props) {
  const t = useTranslations('attendance.policy');

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link
            href={`/attendance/policies/${policy.id}`}
            className="text-sm font-semibold text-gray-900 hover:text-blue-600 truncate block"
          >
            {policy.name}
          </Link>
          {policy.description && (
            <p className="mt-1 text-xs text-gray-500 line-clamp-2">{policy.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <AttendancePolicyScopeBadge
            legalEntityId={policy.legalEntityId}
            branchId={policy.branchId}
          />
          {policy.isCurrent && (
            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
              {t('status.current')}
            </span>
          )}
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1 text-xs text-gray-600 sm:grid-cols-2">
        <div>
          <dt className="text-gray-400">{t('fields.workingHours')}</dt>
          <dd className="font-medium">{policy.workStartTime} &ndash; {policy.workEndTime}</dd>
        </div>
        <div>
          <dt className="text-gray-400">{t('fields.workingMinutes')}</dt>
          <dd className="font-medium">{policy.workingMinutesPerDay} {t('units.minutes')}</dd>
        </div>
        <div>
          <dt className="text-gray-400">{t('fields.effectiveFrom')}</dt>
          <dd className="font-medium">{policy.effectiveFrom}</dd>
        </div>
        <div>
          <dt className="text-gray-400">{t('fields.effectiveTo')}</dt>
          <dd className="font-medium">{policy.effectiveTo ?? t('status.ongoing')}</dd>
        </div>
      </dl>

      <div className="mt-2 text-xs text-gray-400">
        {t('fields.version')} {policy.version}
      </div>
    </div>
  );
}
