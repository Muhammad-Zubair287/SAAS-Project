'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../../../components/common/page-header';
import { ROUTES } from '../../../../../constants/routes.constants';
import { toApiError } from '../../../../../lib/api/errors';
import { usePublishPayslip } from '../../../../../modules/payroll/hooks/use-payroll';

export function PublishPayslipPageClient() {
  const t = useTranslations('tenant.payroll.publish');
  const tn = useTranslations('tenant.nav');
  const tc = useTranslations('common');
  const router = useRouter();
  const publish = usePublishPayslip();
  const [employeeId, setEmployeeId] = useState('');
  const [periodLabel, setPeriodLabel] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [currency, setCurrency] = useState('PKR');
  const [grossAmount, setGrossAmount] = useState('');
  const [netAmount, setNetAmount] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    try {
      await publish.mutateAsync({
        employeeId: employeeId.trim(),
        periodLabel: periodLabel.trim(),
        periodStart,
        periodEnd,
        currency: currency.trim().toUpperCase(),
        grossAmount: Number(grossAmount),
        netAmount: Number(netAmount),
        earnings: [],
        deductions: [],
      });
      router.push(ROUTES.TENANT.PAYROLL.PAYSLIPS);
    } catch (err) {
      setFormError(toApiError(err).message);
    }
  }

  const fieldCls =
    'mt-1 w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-sm';

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
        breadcrumbs={[
          { label: tn('home'), href: ROUTES.TENANT.DASHBOARD },
          { label: tn('payroll'), href: ROUTES.TENANT.PAYROLL.ROOT },
          { label: t('title') },
        ]}
      />
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="max-w-xl space-y-4 rounded-xl border border-border-default bg-surface-primary p-4"
      >
        <label className="block text-body-sm">
          {t('fields.employeeId')}
          <input
            required
            className={fieldCls}
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          />
        </label>
        <label className="block text-body-sm">
          {t('fields.periodLabel')}
          <input
            required
            className={fieldCls}
            value={periodLabel}
            onChange={(e) => setPeriodLabel(e.target.value)}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-body-sm">
            {t('fields.periodStart')}
            <input
              required
              type="date"
              className={fieldCls}
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
            />
          </label>
          <label className="block text-body-sm">
            {t('fields.periodEnd')}
            <input
              required
              type="date"
              className={fieldCls}
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
            />
          </label>
        </div>
        <label className="block text-body-sm">
          {t('fields.currency')}
          <input
            required
            maxLength={3}
            className={fieldCls}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-body-sm">
            {t('fields.grossAmount')}
            <input
              required
              type="number"
              step="0.01"
              className={fieldCls}
              value={grossAmount}
              onChange={(e) => setGrossAmount(e.target.value)}
            />
          </label>
          <label className="block text-body-sm">
            {t('fields.netAmount')}
            <input
              required
              type="number"
              step="0.01"
              className={fieldCls}
              value={netAmount}
              onChange={(e) => setNetAmount(e.target.value)}
            />
          </label>
        </div>
        {formError ? <p className="text-body-sm text-semantic-danger">{formError}</p> : null}
        <button
          type="submit"
          disabled={publish.isPending}
          className="rounded-md bg-brand-blue-600 px-4 py-2 text-body-sm font-medium text-white hover:bg-brand-blue-500 disabled:opacity-50"
        >
          {tc('save')}
        </button>
      </form>
    </div>
  );
}
