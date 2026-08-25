'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useChangeEmployeeStatus } from '../../../../../modules/employee/hooks/use-employees';
import { ROUTES } from '../../../../../constants/routes.constants';

const INPUT_CLS =
  'w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md text-text-primary focus:border-brand-blue-600 focus:outline-none';

const STATUS_OPTIONS = ['ACTIVE', 'PROBATION', 'ON_LEAVE', 'SUSPENDED', 'RESIGNED', 'TERMINATED', 'RETIRED', 'INACTIVE'];

export function StatusFormClient({ employeeId }: { employeeId: string }) {
  const t = useTranslations();
  const router = useRouter();
  const changeStatus = useChangeEmployeeStatus(employeeId);
  const [status, setStatus] = useState('ACTIVE');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await changeStatus.mutateAsync({
      status,
      effectiveDate,
      reason: reason || undefined,
      notes: notes || undefined,
    });
    router.push(ROUTES.TENANT.EMPLOYEES.DETAIL(employeeId));
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="mx-auto max-w-xl space-y-4">
      <select className={INPUT_CLS} value={status} onChange={(e) => setStatus(e.target.value)}>
        {STATUS_OPTIONS.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
      <input type="date" className={INPUT_CLS} value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} required />
      <textarea className={INPUT_CLS} value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder={t('employees.statusChange.reason')} />
      <textarea className={INPUT_CLS} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Notes" />
      <div className="flex justify-end">
        <button type="submit" disabled={changeStatus.isPending} className="rounded-md bg-brand-blue-600 px-4 py-2 text-white disabled:opacity-50">
          {changeStatus.isPending ? t('common.loading') : 'Apply status change'}
        </button>
      </div>
    </form>
  );
}
