'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../../components/common/page-header';
import { ROUTES } from '../../../../constants/routes.constants';
import {
  useAttendancePeriods,
  useLockAttendancePeriod,
  useUnlockAttendancePeriod,
} from '../../../../modules/attendance/hooks/use-attendance';

const INPUT_CLS =
  'w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md text-text-primary focus:border-brand-blue-600 focus:outline-none';

export function PeriodLockPageClient({ title, description }: { title: string; description: string }) {
  const t = useTranslations();
  const periods = useAttendancePeriods();
  const lock = useLockAttendancePeriod();
  const unlock = useUnlockAttendancePeriod();
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [unlockReason, setUnlockReason] = useState('');

  async function lockPeriod() {
    await lock.mutateAsync({ periodStart, periodEnd });
  }

  async function unlockPeriod() {
    await unlock.mutateAsync({ periodStart, periodEnd, reason: unlockReason || 'Manual unlock' });
  }

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

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-border-default bg-surface-primary p-4 sm:grid-cols-2">
        <input className={INPUT_CLS} type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
        <input className={INPUT_CLS} type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
        <input className="sm:col-span-2 w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md text-text-primary focus:border-brand-blue-600 focus:outline-none" value={unlockReason} onChange={(e) => setUnlockReason(e.target.value)} placeholder="Unlock reason" />
        <div className="sm:col-span-2 flex gap-2">
          <button type="button" onClick={() => void lockPeriod()} disabled={lock.isPending || !periodStart || !periodEnd} className="rounded-md bg-brand-blue-600 px-4 py-2 text-white disabled:opacity-50">{t('attendance.periodLock.lock')}</button>
          <button type="button" onClick={() => void unlockPeriod()} disabled={unlock.isPending || !periodStart || !periodEnd} className="rounded-md border border-border-default bg-surface-primary px-4 py-2 text-text-primary disabled:opacity-50">{t('attendance.periodLock.unlock')}</button>
        </div>
      </div>

      <div className="rounded-xl border border-border-default bg-surface-primary">
        <table className="w-full border-collapse text-body-sm">
          <thead>
            <tr className="border-b border-border-default bg-surface-canvas">
              <th className="px-4 py-3 text-left">{t('attendance.periodLock.start')}</th>
              <th className="px-4 py-3 text-left">{t('attendance.periodLock.end')}</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {(periods.data?.data ?? []).map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3">{row.periodStart}</td>
                <td className="px-4 py-3">{row.periodEnd}</td>
                <td className="px-4 py-3">{row.isLocked ? 'Locked' : 'Unlocked'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
