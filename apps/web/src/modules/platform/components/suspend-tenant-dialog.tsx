'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog } from '../../../components/ui/dialog';
import { ApiError } from '../../../lib/api/types';
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
  const [userMessage, setUserMessage] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const suspend = useSuspendTenant(tenantId);

  useEffect(() => {
    if (!open) {
      setReason('');
      setUserMessage('');
      setConfirmation('');
      setMfaCode('');
    }
  }, [open]);

  const canSubmit =
    reason.trim().length >= 10 &&
    confirmation === tenantName &&
    !suspend.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      await suspend.mutateAsync({
        reason,
        userMessage: userMessage.trim() || undefined,
        mfaCode: mfaCode.trim() || undefined,
      });
      onClose();
    } catch {
      // Error toasted by mutation; keep dialog open for MFA retry.
    }
  };

  const errorMessage =
    suspend.error instanceof ApiError
      ? suspend.error.message
      : suspend.error
        ? t('errors.generic')
        : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={t('platform.tenants.suspend.title')}
      description={t('platform.tenants.suspend.description', { name: tenantName })}
      closeLabel={t('common.cancel')}
      closeOnBackdropClick={!suspend.isPending}
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <p className="text-body-sm text-text-secondary">
          {t('platform.tenants.suspend.effectiveNow')}:{' '}
          <span className="font-medium text-text-primary ltr">{new Date().toISOString()}</span>
        </p>
        <p className="text-body-sm text-text-secondary">{t('platform.tenants.suspend.dataAccess')}</p>
        <div>
          <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="suspend-reason">
            {t('platform.tenants.suspend.reasonLabel')}
            <span className="ml-1 text-semantic-danger">*</span>
          </label>
          <textarea
            id="suspend-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-24 w-full resize-none rounded-md border border-border-default px-3 py-2 text-body-md"
            minLength={10}
            maxLength={1000}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="suspend-message">
            {t('platform.tenants.suspend.userMessage')}
          </label>
          <textarea
            id="suspend-message"
            value={userMessage}
            onChange={(e) => setUserMessage(e.target.value)}
            className="min-h-20 w-full resize-none rounded-md border border-border-default px-3 py-2 text-body-md"
            maxLength={500}
          />
        </div>
        <div>
          <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="suspend-mfa">
            {t('platform.tenants.suspend.mfaLabel')}
          </label>
          <input
            id="suspend-mfa"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value)}
            className="w-full rounded-md border border-border-default px-3 py-2 text-body-md"
            placeholder={t('platform.tenants.suspend.mfaPlaceholder')}
          />
          <p className="mt-1 text-caption text-text-secondary">{t('platform.tenants.suspend.mfaHelp')}</p>
        </div>
        <div>
          <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="suspend-confirm">
            {t('platform.tenants.suspend.confirmLabel', { name: tenantName })}
          </label>
          <input
            id="suspend-confirm"
            type="text"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            className="w-full rounded-md border border-border-default px-3 py-2 text-body-md"
          />
        </div>
        {errorMessage && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-body-sm text-semantic-danger">
            {errorMessage}
          </p>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border-default px-4 py-2 text-body-md font-medium"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-md bg-semantic-danger px-4 py-2 text-body-md font-medium text-white disabled:opacity-50"
          >
            {suspend.isPending ? t('common.loading') : t('platform.tenants.suspend.confirmButton')}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
