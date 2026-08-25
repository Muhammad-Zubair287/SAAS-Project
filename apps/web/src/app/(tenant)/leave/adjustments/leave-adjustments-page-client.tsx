'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../../components/common/page-header';
import { LoadingSpinner } from '../../../../components/feedback/loading-spinner';
import { ROUTES } from '../../../../constants/routes.constants';
import {
  useAdjustLeaveBalance,
  useLeaveTypes,
} from '../../../../modules/leave/hooks/use-leave';

export function LeaveAdjustmentsPageClient() {
  const t = useTranslations('tenant.leave');
  const tn = useTranslations('tenant.nav');
  const tc = useTranslations('common');
  const types = useLeaveTypes();
  const adjust = useAdjustLeaveBalance();
  const [form, setForm] = useState({
    employeeId: '',
    leaveTypeId: '',
    quantity: '1',
    effectiveDate: new Date().toISOString().slice(0, 10),
    reason: '',
    entryType: 'GRANT' as 'GRANT' | 'ADJUSTMENT',
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await adjust.mutateAsync({
      employeeId: form.employeeId.trim(),
      leaveTypeId: form.leaveTypeId,
      quantity: Number(form.quantity),
      effectiveDate: form.effectiveDate,
      reason: form.reason.trim(),
      entryType: form.entryType,
    });
    setForm((f) => ({ ...f, quantity: '1', reason: '' }));
  }

  const typeRows = types.data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('adjust.title')}
        description={t('adjust.description')}
        breadcrumbs={[
          { label: tn('home'), href: ROUTES.TENANT.DASHBOARD },
          { label: tn('leave'), href: ROUTES.TENANT.LEAVE.ROOT },
          { label: t('adjust.title') },
        ]}
      />
      {types.isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <form
          onSubmit={(e) => void onSubmit(e)}
          className="max-w-xl space-y-4 rounded-xl border border-border-default bg-surface-primary p-6"
        >
          <label className="block">
            <span className="mb-1 block text-label-md font-semibold">
              {t('adjust.employeeId')}
            </span>
            <input
              required
              value={form.employeeId}
              onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
              className="w-full rounded-md border border-border-default px-3 py-2"
              placeholder="UUID"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-label-md font-semibold">
              {t('adjust.leaveType')}
            </span>
            <select
              required
              value={form.leaveTypeId}
              onChange={(e) => setForm((f) => ({ ...f, leaveTypeId: e.target.value }))}
              className="w-full rounded-md border border-border-default px-3 py-2"
            >
              <option value="">{t('adjust.selectType')}</option>
              {typeRows.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name} ({row.code})
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-label-md font-semibold">
              {t('adjust.entryType')}
            </span>
            <select
              value={form.entryType}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  entryType: e.target.value as 'GRANT' | 'ADJUSTMENT',
                }))
              }
              className="w-full rounded-md border border-border-default px-3 py-2"
            >
              <option value="GRANT">{t('adjust.grant')}</option>
              <option value="ADJUSTMENT">{t('adjust.adjustment')}</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-label-md font-semibold">
              {t('adjust.quantity')}
            </span>
            <input
              required
              type="number"
              step="0.25"
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              className="w-full rounded-md border border-border-default px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-label-md font-semibold">
              {t('adjust.effectiveDate')}
            </span>
            <input
              required
              type="date"
              value={form.effectiveDate}
              onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value }))}
              className="w-full rounded-md border border-border-default px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-label-md font-semibold">{t('adjust.reason')}</span>
            <textarea
              required
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              className="w-full rounded-md border border-border-default px-3 py-2"
              rows={3}
            />
          </label>
          <button
            type="submit"
            disabled={adjust.isPending}
            className="rounded-md bg-brand-blue-600 px-4 py-2 text-body-sm font-semibold text-white disabled:opacity-50"
          >
            {tc('save')}
          </button>
        </form>
      )}
    </div>
  );
}
