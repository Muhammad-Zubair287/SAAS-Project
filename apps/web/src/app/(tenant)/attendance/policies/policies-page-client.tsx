'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAttendancePolicies } from '@/modules/attendance/hooks/use-attendance-policies';
import { AttendancePolicyCard } from '@/modules/attendance/components/attendance-policy-card';
import type { AttendancePolicy } from '@/modules/attendance/types/attendance-policy.types';

export function PoliciesPageClient() {
  const t = useTranslations('attendance.policy');
  const { data, isLoading, error } = useAttendancePolicies({ isCurrentOnly: false });

  const policies = (data as { data: AttendancePolicy[] } | undefined)?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('list.title')}</h1>
        <Link
          href="/attendance/policies/new"
          className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
        >
          {t('actions.create')}
        </Link>
      </div>

      {isLoading && <p className="text-sm text-gray-500">{t('list.loading')}</p>}
      {error && <p className="text-sm text-red-600">{t('list.error')}</p>}

      {!isLoading && policies.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-gray-500">{t('list.empty')}</p>
          <Link href="/attendance/policies/new" className="mt-4 inline-block text-sm font-medium text-blue-600">
            {t('actions.createFirst')}
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {policies.map((policy) => (
          <AttendancePolicyCard key={policy.id} policy={policy} />
        ))}
      </div>
    </div>
  );
}
