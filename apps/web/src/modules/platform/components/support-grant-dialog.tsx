'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useCreateSupportGrant } from '../hooks/use-tenant-mutations';
import { SUPPORT_GRANT_SCOPES } from '../constants/platform.constants';

interface SupportGrantDialogProps {
  tenantId: string;
  open: boolean;
  onClose: () => void;
}

export function SupportGrantDialog({ tenantId, open, onClose }: SupportGrantDialogProps) {
  const t = useTranslations();
  const create = useCreateSupportGrant(tenantId);

  const now = new Date();
  const eightHoursLater = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const toLocal = (d: Date) => d.toISOString().slice(0, 16);

  const [form, setForm] = useState({
    supportUserId: '',
    reason: '',
    scope: [] as string[],
    startsAt: toLocal(now),
    endsAt: toLocal(eightHoursLater),
  });

  if (!open) return null;

  const canSubmit =
    form.supportUserId.trim().length > 0 &&
    form.reason.trim().length >= 20 &&
    form.scope.length > 0 &&
    !create.isPending;

  const toggleScope = (s: string) => {
    setForm((prev) => ({
      ...prev,
      scope: prev.scope.includes(s) ? prev.scope.filter((x) => x !== s) : [...prev.scope, s],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    await create.mutateAsync({
      supportUserId: form.supportUserId,
      reason: form.reason,
      scope: form.scope,
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: new Date(form.endsAt).toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        className="relative w-full max-w-lg rounded-xl bg-surface-primary p-6 shadow-3"
        role="dialog"
        aria-modal="true"
        aria-labelledby="grant-dialog-title"
      >
        <h2 id="grant-dialog-title" className="text-title-md font-semibold text-text-primary mb-4">
          {t('platform.tenants.support.createTitle')}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-label-md font-semibold text-text-primary mb-1">
              {t('platform.tenants.support.supportUserId')}
              <span className="text-semantic-danger ml-1">*</span>
            </label>
            <input
              type="text"
              value={form.supportUserId}
              onChange={(e) => setForm((p) => ({ ...p, supportUserId: e.target.value }))}
              className="w-full rounded-md border border-border-default px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20"
              placeholder="UUID of support engineer"
              required
            />
          </div>

          <div>
            <label className="block text-label-md font-semibold text-text-primary mb-1">
              {t('platform.tenants.support.reason')}
              <span className="text-semantic-danger ml-1">*</span>
            </label>
            <textarea
              value={form.reason}
              onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
              className="w-full min-h-20 resize-none rounded-md border border-border-default px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20"
              minLength={20}
              maxLength={2000}
              required
            />
          </div>

          <div>
            <p className="text-label-md font-semibold text-text-primary mb-2">
              {t('platform.tenants.support.scope')}
              <span className="text-semantic-danger ml-1">*</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {SUPPORT_GRANT_SCOPES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => toggleScope(s.value)}
                  className={`rounded-full px-3 py-1 text-body-sm font-medium transition-colors ${
                    form.scope.includes(s.value)
                      ? 'bg-brand-blue-600 text-white'
                      : 'bg-surface-canvas text-text-secondary hover:bg-slate-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-label-md font-semibold text-text-primary mb-1">
                {t('platform.tenants.support.startsAt')}
              </label>
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm((p) => ({ ...p, startsAt: e.target.value }))}
                className="w-full rounded-md border border-border-default px-3 py-2 text-body-sm focus:border-brand-blue-600 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-label-md font-semibold text-text-primary mb-1">
                {t('platform.tenants.support.endsAt')}
              </label>
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm((p) => ({ ...p, endsAt: e.target.value }))}
                className="w-full rounded-md border border-border-default px-3 py-2 text-body-sm focus:border-brand-blue-600 focus:outline-none"
                required
              />
            </div>
          </div>
          <p className="text-caption text-text-secondary">{t('platform.tenants.support.durationNote')}</p>

          {create.error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-body-sm text-semantic-danger">
              {t('errors.generic')}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-md border border-border-default px-4 py-2 text-body-md font-medium text-text-primary hover:bg-surface-canvas">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={!canSubmit} className="rounded-md bg-brand-blue-600 px-4 py-2 text-body-md font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {create.isPending ? t('common.loading') : t('platform.tenants.support.createButton')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
