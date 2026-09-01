'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog } from '../../../components/ui/dialog';
import { ApiError } from '../../../lib/api/types';
import {
  containsInjectionPayload,
  filterOtpInput,
  sanitizeTrimmed,
} from '../../../lib/validation/input-security';
import { useCloseTenant } from '../hooks/use-tenant-mutations';

interface CloseTenantDialogProps {
  tenantId: string;
  tenantName: string;
  open: boolean;
  onClose: () => void;
}

export function CloseTenantDialog({
  tenantId,
  tenantName,
  open,
  onClose,
}: CloseTenantDialogProps) {
  const t = useTranslations();
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const closeTenant = useCloseTenant(tenantId);

  useEffect(() => {
    if (!open) {
      setReason('');
      setConfirmation('');
      setMfaCode('');
    }
  }, [open]);

  const trimmedReason = sanitizeTrimmed(reason);
  const reasonValid =
    trimmedReason.length >= 10 && !containsInjectionPayload(trimmedReason);
  const canSubmit =
    reasonValid && confirmation === tenantName && !closeTenant.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      await closeTenant.mutateAsync({
        reason: trimmedReason,
        mfaCode: mfaCode.trim() || undefined,
      });
      onClose();
    } catch {
      // Error toasted by mutation; keep dialog open for MFA retry.
    }
  };

  const errorMessage =
    closeTenant.error instanceof ApiError
      ? closeTenant.error.message
      : closeTenant.error
        ? t('errors.generic')
        : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={t('platform.tenants.close.title')}
      description={t('platform.tenants.close.description', { name: tenantName })}
      closeLabel={t('common.cancel')}
      closeOnBackdropClick={!closeTenant.isPending}
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <p className="text-body-sm text-semantic-danger">{t('platform.tenants.close.warning')}</p>
        <div>
          <label className="mb-1 block text-label-md font-semibold" htmlFor="close-reason">
            {t('platform.tenants.close.reasonLabel')}
            <span className="ml-1 text-semantic-danger">*</span>
          </label>
          <textarea
            id="close-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-24 w-full resize-none rounded-md border border-border-default px-3 py-2"
            minLength={10}
            maxLength={500}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-label-md font-semibold" htmlFor="close-confirm">
            {t('platform.tenants.close.confirmLabel', { name: tenantName })}
            <span className="ml-1 text-semantic-danger">*</span>
          </label>
          <input
            id="close-confirm"
            type="text"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            className="h-11 w-full rounded-md border border-border-default px-3"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-label-md font-semibold" htmlFor="close-mfa">
            {t('platform.tenants.suspend.mfaLabel')}
          </label>
          <input
            id="close-mfa"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={mfaCode}
            onChange={(e) => setMfaCode(filterOtpInput(e.target.value))}
            className="h-11 w-full rounded-md border border-border-default px-3 font-mono"
            maxLength={8}
          />
        </div>
        {errorMessage && (
          <p role="alert" className="text-body-sm text-semantic-danger">
            {errorMessage}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={closeTenant.isPending}
            className="rounded-md border border-border-default px-4 py-2"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-md bg-semantic-danger px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            {closeTenant.isPending ? t('common.loading') : t('platform.tenants.close.confirmButton')}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
