'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog } from '../../../components/ui/dialog';
import { useRestoreTenant } from '../hooks/use-tenant-mutations';

interface RestoreTenantDialogProps {
  tenantId: string;
  open: boolean;
  onClose: () => void;
}

export function RestoreTenantDialog({ tenantId, open, onClose }: RestoreTenantDialogProps) {
  const t = useTranslations();
  const restore = useRestoreTenant(tenantId);
  const [reason, setReason] = useState('');

  const canSubmit = reason.trim().length >= 10 && !restore.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    await restore.mutateAsync({ reason: reason.trim() });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }} title={t('platform.tenants.restore.title')} closeLabel={t('common.cancel')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-label-md font-semibold" htmlFor="restore-reason">
            {t('platform.tenants.restore.reasonLabel')}<span className="ml-1 text-semantic-danger">*</span>
          </label>
          <textarea id="restore-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-24 w-full resize-none rounded-md border border-border-default px-3 py-2" minLength={10} required />
        </div>
        {restore.error && <p role="alert" className="text-body-sm text-semantic-danger">{t('errors.generic')}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-md border border-border-default px-4 py-2">{t('common.cancel')}</button>
          <button type="submit" disabled={!canSubmit} className="rounded-md bg-semantic-info px-4 py-2 font-semibold text-white disabled:opacity-50">
            {restore.isPending ? t('common.loading') : t('platform.tenants.actions.restore')}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
