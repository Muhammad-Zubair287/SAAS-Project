'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog } from '../../../components/ui/dialog';
import { useCreateSupportGrant } from '../hooks/use-tenant-mutations';
import { SUPPORT_GRANT_SCOPE_VALUES } from '../constants/platform.constants';
import { useAuth } from '../../../lib/auth/auth-provider';

interface SupportGrantDialogProps {
  tenantId: string;
  open: boolean;
  onClose: () => void;
}

export function SupportGrantDialog({ tenantId, open, onClose }: SupportGrantDialogProps) {
  const t = useTranslations();
  const { user } = useAuth();
  const create = useCreateSupportGrant(tenantId);

  const now = new Date();
  const eightHoursLater = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const toLocal = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [form, setForm] = useState({
    reason: '',
    scope: [] as string[],
    startsAt: toLocal(now),
    endsAt: toLocal(eightHoursLater),
  });

  const canSubmit =
    form.reason.trim().length >= 20 &&
    form.scope.length > 0 &&
    !!user?.userId &&
    !create.isPending;

  const toggleScope = (s: string) => {
    setForm((prev) => ({
      ...prev,
      scope: prev.scope.includes(s) ? prev.scope.filter((x) => x !== s) : [...prev.scope, s],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !user) return;
    await create.mutateAsync({
      supportUserId: user.userId,
      reason: form.reason,
      scope: form.scope,
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: new Date(form.endsAt).toISOString(),
    });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => { if (!next) onClose(); }}
      title={t('platform.tenants.support.createTitle')}
      closeLabel={t('common.cancel')}
      closeOnBackdropClick={!create.isPending}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-body-sm text-text-secondary">
          {t('platform.tenants.support.grantAs')}: <span className="font-medium text-text-primary">{user?.displayName ?? user?.email}</span>
        </p>
        <div>
          <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="grant-reason">
            {t('platform.tenants.support.reason')}<span className="ml-1 text-semantic-danger">*</span>
          </label>
          <textarea id="grant-reason" value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} className="min-h-20 w-full resize-none rounded-md border border-border-default px-3 py-2 text-body-md" minLength={20} maxLength={2000} required />
        </div>
        <fieldset>
          <legend className="mb-2 text-label-md font-semibold text-text-primary">
            {t('platform.tenants.support.scope')}<span className="ml-1 text-semantic-danger">*</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {SUPPORT_GRANT_SCOPE_VALUES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleScope(s)}
                className={`rounded-full px-3 py-1 text-body-sm font-medium ${
                  form.scope.includes(s) ? 'bg-brand-blue-600 text-white' : 'bg-surface-canvas text-text-secondary hover:bg-slate-200'
                }`}
              >
                {t(`platform.tenants.support.scopes.${s}`)}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-label-md font-semibold" htmlFor="grant-start">{t('platform.tenants.support.startsAt')}</label>
            <input id="grant-start" type="datetime-local" value={form.startsAt} onChange={(e) => setForm((p) => ({ ...p, startsAt: e.target.value }))} className="w-full rounded-md border border-border-default px-3 py-2 text-body-sm" required />
          </div>
          <div>
            <label className="mb-1 block text-label-md font-semibold" htmlFor="grant-end">{t('platform.tenants.support.endsAt')}</label>
            <input id="grant-end" type="datetime-local" value={form.endsAt} onChange={(e) => setForm((p) => ({ ...p, endsAt: e.target.value }))} className="w-full rounded-md border border-border-default px-3 py-2 text-body-sm" required />
          </div>
        </div>
        <p className="text-caption text-text-secondary">{t('platform.tenants.support.durationNote')}</p>
        {create.error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-body-sm text-semantic-danger">{t('errors.generic')}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="rounded-md border border-border-default px-4 py-2 text-body-md font-medium">{t('common.cancel')}</button>
          <button type="submit" disabled={!canSubmit} className="rounded-md bg-brand-blue-600 px-4 py-2 text-body-md font-semibold text-white disabled:opacity-50">
            {create.isPending ? t('common.loading') : t('platform.tenants.support.createButton')}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
