'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSuspendTenant } from '../hooks/use-tenant-mutations';

interface SuspendTenantDialogProps {
  tenantId: string;
  tenantName: string;
  open: boolean;
  onClose: () => void;
}

export function SuspendTenantDialog({
  tenantId,
  tenantName,
  open,
  onClose,
}: SuspendTenantDialogProps) {
  const t = useTranslations();
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const suspend = useSuspendTenant(tenantId);

  if (!open) return null;

  const canSubmit =
    reason.trim().length >= 10 &&
    confirmation === tenantName &&
    !suspend.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    await suspend.mutateAsync({ reason });
    setReason('');
    setConfirmation('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative w-full max-w-md rounded-xl bg-surface-primary p-6 shadow-3"
        role="dialog"
        aria-modal="true"
        aria-labelledby="suspend-dialog-title"
      >
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-50 text-semantic-danger">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <h2 id="suspend-dialog-title" className="text-title-md font-semibold text-text-primary">
              {t('platform.tenants.suspend.title')}
            </h2>
            <p className="mt-1 text-body-sm text-text-secondary">
              {t('platform.tenants.suspend.description', { name: tenantName })}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-label-md font-semibold text-text-primary mb-1">
              {t('platform.tenants.suspend.reasonLabel')}
              <span className="text-semantic-danger ml-1" aria-hidden="true">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md text-text-primary placeholder:text-text-secondary focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20 min-h-24 resize-none"
              placeholder={t('platform.tenants.suspend.reasonPlaceholder')}
              minLength={10}
              maxLength={1000}
              required
            />
            <p className="mt-1 text-body-sm text-text-secondary">
              {t('platform.tenants.suspend.reasonHelp')}
            </p>
          </div>

          <div>
            <label className="block text-label-md font-semibold text-text-primary mb-1">
              {t('platform.tenants.suspend.confirmLabel', { name: tenantName })}
            </label>
            <input
              type="text"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md text-text-primary placeholder:text-text-secondary focus:border-semantic-danger focus:outline-none focus:ring-2 focus:ring-semantic-danger/20"
              placeholder={tenantName}
            />
          </div>

          {suspend.error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-body-sm text-semantic-danger">
              {t('errors.generic')}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border-default px-4 py-2 text-body-md font-medium text-text-primary hover:bg-surface-canvas"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-md bg-semantic-danger px-4 py-2 text-body-md font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {suspend.isPending
                ? t('common.loading')
                : t('platform.tenants.suspend.confirmButton')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
