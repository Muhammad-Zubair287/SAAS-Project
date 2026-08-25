'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog } from '../../../components/ui/dialog';
import { useChangePlan } from '../hooks/use-tenant-mutations';
import { usePlans } from '../hooks/use-tenants';

interface ChangePlanDialogProps {
  tenantId: string;
  currentPlanKey?: string | null;
  open: boolean;
  onClose: () => void;
}

export function ChangePlanDialog({ tenantId, currentPlanKey, open, onClose }: ChangePlanDialogProps) {
  const t = useTranslations();
  const { data } = usePlans();
  const change = useChangePlan(tenantId);
  const [planKey, setPlanKey] = useState(currentPlanKey ?? '');
  const [reason, setReason] = useState('');

  const canSubmit = planKey.length > 0 && reason.trim().length >= 10 && !change.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    await change.mutateAsync({ planKey, reason: reason.trim() });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }} title={t('platform.tenants.actions.changePlan')} closeLabel={t('common.cancel')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-label-md font-semibold" htmlFor="change-plan">{t('platform.tenants.create.commercial.plan')}</label>
          <select id="change-plan" value={planKey} onChange={(e) => setPlanKey(e.target.value)} className="w-full rounded-md border border-border-default px-3 py-2" required>
            <option value="">{t('platform.tenants.create.selectPlan')}</option>
            {(data?.data ?? []).map((p) => (
              <option key={p.id} value={p.code}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-label-md font-semibold" htmlFor="change-reason">{t('platform.tenants.changePlan.reason')}<span className="ml-1 text-semantic-danger">*</span></label>
          <textarea id="change-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-20 w-full resize-none rounded-md border border-border-default px-3 py-2" minLength={10} required />
        </div>
        {change.error && <p role="alert" className="text-body-sm text-semantic-danger">{t('errors.generic')}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-md border border-border-default px-4 py-2">{t('common.cancel')}</button>
          <button type="submit" disabled={!canSubmit} className="rounded-md bg-brand-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50">
            {change.isPending ? t('common.loading') : t('platform.tenants.actions.changePlan')}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
