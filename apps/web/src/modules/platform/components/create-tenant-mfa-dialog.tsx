'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog } from '../../../components/ui/dialog';
import { ApiError } from '../../../lib/api/types';
import { filterOtpInput } from '../../../lib/validation/input-security';
import { createTenantMfaSchema, zodFieldErrors } from '../schemas/create-tenant.schema';

interface CreateTenantMfaDialogProps {
  open: boolean;
  pending: boolean;
  error: unknown;
  onClose: () => void;
  onConfirm: (mfaCode: string) => void;
}

export function CreateTenantMfaDialog({
  open,
  pending,
  error,
  onClose,
  onConfirm,
}: CreateTenantMfaDialogProps) {
  const t = useTranslations();
  const [mfaCode, setMfaCode] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setMfaCode('');
      setFieldError(null);
    }
  }, [open]);

  const errorMessage =
    error instanceof ApiError ? error.message : error ? t('errors.generic') : null;

  function validationMessage(code: string): string {
    if (code === 'format') return t('platform.tenants.create.validation.format');
    return t('errors.validationFailed');
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !pending) onClose();
      }}
      title={t('platform.tenants.create.mfa.title')}
      description={t('platform.tenants.create.mfa.description')}
      closeLabel={t('common.cancel')}
      closeOnBackdropClick={!pending}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const result = createTenantMfaSchema.safeParse({ mfaCode });
          if (!result.success) {
            const errors = zodFieldErrors(result.error);
            setFieldError(validationMessage(errors.mfaCode ?? 'format'));
            return;
          }
          setFieldError(null);
          onConfirm(result.data.mfaCode);
        }}
        className="space-y-4"
      >
        <div>
          <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="createTenantMfaCode">
            {t('platform.tenants.create.mfa.codeLabel')}
          </label>
          <input
            id="createTenantMfaCode"
            name="createTenantMfaCode"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            value={mfaCode}
            onChange={(e) => {
              setMfaCode(filterOtpInput(e.target.value));
              if (fieldError) setFieldError(null);
            }}
            className="w-full rounded-md border border-border-default px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20"
            placeholder={t('platform.tenants.create.mfa.codePlaceholder')}
            required
            minLength={6}
            maxLength={8}
            aria-invalid={!!fieldError}
          />
          {fieldError && (
            <p role="alert" className="mt-1 text-body-sm text-semantic-danger">
              {fieldError}
            </p>
          )}
        </div>
        {errorMessage && (
          <p role="alert" className="text-body-sm text-semantic-danger">
            {errorMessage}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={onClose}
            className="rounded-md border border-border-default px-4 py-2 text-body-md font-medium text-text-primary hover:bg-surface-canvas disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={pending || mfaCode.length < 6}
            className="rounded-md bg-brand-blue-600 px-4 py-2 text-body-md font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? t('common.loading') : t('platform.tenants.create.mfa.confirm')}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
