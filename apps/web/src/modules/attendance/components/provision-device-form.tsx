'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '../../../components/ui/button';
import { toast } from '../../../lib/toast/store';
import { toApiError } from '../../../lib/api/errors';
import { ROUTES } from '../../../constants/routes.constants';
import { useProvisionAttendanceDevice } from '../hooks/use-attendance-devices';
import type { ProvisionAttendanceDevicePayload } from '../types/attendance-capture.types';
import { DEVICE_FIELD_LIMITS } from '../utils/device-lifecycle';

interface ProvisionDeviceFormProps {
  deviceId: string;
  deviceName: string;
}

interface FormValues {
  deviceFingerprint: string;
  publicKeyFingerprint: string;
  ipWhitelist: string[];
}

type FieldErrors = Partial<
  Record<'deviceFingerprint' | 'publicKeyFingerprint' | 'ipWhitelist', string>
>;

const inputClass =
  'w-full rounded-md border border-border-default bg-surface-primary px-3 py-2.5 text-body-md text-text-primary placeholder:text-text-secondary focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20 font-mono';

export function ProvisionDeviceForm({
  deviceId,
  deviceName,
}: ProvisionDeviceFormProps) {
  const t = useTranslations('attendance.devices');
  const router = useRouter();
  const provision = useProvisionAttendanceDevice();
  const formId = useId();

  const [values, setValues] = useState<FormValues>({
    deviceFingerprint: '',
    publicKeyFingerprint: '',
    ipWhitelist: [''],
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    const fp = values.deviceFingerprint.trim();
    const pk = values.publicKeyFingerprint.trim();

    if (!fp) errors.deviceFingerprint = t('validation.fingerprintRequired');
    else if (fp.length > DEVICE_FIELD_LIMITS.fingerprint)
      errors.deviceFingerprint = t('validation.fingerprintMax');

    if (!pk) errors.publicKeyFingerprint = t('validation.fingerprintRequired');
    else if (pk.length > DEVICE_FIELD_LIMITS.fingerprint)
      errors.publicKeyFingerprint = t('validation.fingerprintMax');

    const ips = values.ipWhitelist.map((v) => v.trim()).filter(Boolean);
    if (ips.some((ip) => ip.length > DEVICE_FIELD_LIMITS.ipWhitelistEntry)) {
      errors.ipWhitelist = t('validation.ipMax');
    }

    return errors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const ips = values.ipWhitelist.map((v) => v.trim()).filter(Boolean);
    const payload: ProvisionAttendanceDevicePayload = {
      deviceFingerprint: values.deviceFingerprint.trim(),
      publicKeyFingerprint: values.publicKeyFingerprint.trim(),
      ...(ips.length > 0 ? { ipWhitelist: ips } : {}),
    };

    try {
      await provision.mutateAsync({ deviceId, payload });
      toast.success(t('success.provisioned'));
      router.push(ROUTES.TENANT.ATTENDANCE.DEVICE_DETAIL(deviceId));
    } catch (err) {
      const apiErr = toApiError(err);
      setServerError(apiErr.message || t('error'));
      toast.error(apiErr.message || t('error'));
    }
  }

  return (
    <form
      id={formId}
      onSubmit={(e) => void handleSubmit(e)}
      className="mx-auto max-w-2xl space-y-6"
      noValidate
    >
      <div
        role="status"
        className="rounded-md border border-semantic-warning/40 bg-surface-primary px-4 py-3 text-body-sm text-text-primary"
      >
        <p className="font-semibold">{deviceName}</p>
        <p className="mt-1 text-text-secondary">{t('provision.warning')}</p>
      </div>

      {serverError && (
        <div
          role="alert"
          className="rounded-md border border-semantic-danger/30 px-4 py-3 text-body-sm text-semantic-danger"
        >
          {serverError}
        </div>
      )}

      <section className="space-y-4 rounded-xl border border-border-default bg-surface-primary p-6">
        <h2 className="text-heading-h3 font-semibold text-text-primary">
          {t('sections.identity')}
        </h2>
        <div className="space-y-4">
          <div>
            <label
              htmlFor={`${formId}-dfp`}
              className="mb-1.5 block text-label-md font-medium text-text-primary"
            >
              {t('fields.deviceFingerprint')}
            </label>
            <input
              id={`${formId}-dfp`}
              dir="ltr"
              value={values.deviceFingerprint}
              maxLength={DEVICE_FIELD_LIMITS.fingerprint}
              onChange={(e) => {
                setValues((p) => ({ ...p, deviceFingerprint: e.target.value }));
                setFieldErrors((p) => ({ ...p, deviceFingerprint: undefined }));
              }}
              className={inputClass}
              autoComplete="off"
              required
              aria-invalid={!!fieldErrors.deviceFingerprint}
            />
            {fieldErrors.deviceFingerprint && (
              <p role="alert" className="mt-1 text-body-sm text-semantic-danger">
                {fieldErrors.deviceFingerprint}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor={`${formId}-pk`}
              className="mb-1.5 block text-label-md font-medium text-text-primary"
            >
              {t('fields.publicKeyFingerprint')}
            </label>
            <input
              id={`${formId}-pk`}
              dir="ltr"
              value={values.publicKeyFingerprint}
              maxLength={DEVICE_FIELD_LIMITS.fingerprint}
              onChange={(e) => {
                setValues((p) => ({
                  ...p,
                  publicKeyFingerprint: e.target.value,
                }));
                setFieldErrors((p) => ({
                  ...p,
                  publicKeyFingerprint: undefined,
                }));
              }}
              className={inputClass}
              autoComplete="off"
              required
              aria-invalid={!!fieldErrors.publicKeyFingerprint}
            />
            {fieldErrors.publicKeyFingerprint && (
              <p role="alert" className="mt-1 text-body-sm text-semantic-danger">
                {fieldErrors.publicKeyFingerprint}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border-default bg-surface-primary p-6">
        <h2 className="text-heading-h3 font-semibold text-text-primary">
          {t('sections.network')}
        </h2>
        <p className="text-body-sm text-text-secondary">
          {t('fields.ipWhitelistHint')}
        </p>
        <ul className="space-y-3">
          {values.ipWhitelist.map((entry, index) => (
            <li key={index} className="flex gap-2">
              <label className="sr-only" htmlFor={`${formId}-ip-${index}`}>
                {t('fields.ipWhitelist')} {index + 1}
              </label>
              <input
                id={`${formId}-ip-${index}`}
                dir="ltr"
                value={entry}
                maxLength={DEVICE_FIELD_LIMITS.ipWhitelistEntry}
                onChange={(e) => {
                  const next = [...values.ipWhitelist];
                  next[index] = e.target.value;
                  setValues((p) => ({ ...p, ipWhitelist: next }));
                  setFieldErrors((p) => ({ ...p, ipWhitelist: undefined }));
                }}
                className={inputClass}
                autoComplete="off"
                placeholder="203.0.113.0/24"
              />
              {values.ipWhitelist.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setValues((p) => ({
                      ...p,
                      ipWhitelist: p.ipWhitelist.filter((_, i) => i !== index),
                    }));
                  }}
                >
                  {t('fields.ipRemove')}
                </Button>
              )}
            </li>
          ))}
        </ul>
        {fieldErrors.ipWhitelist && (
          <p role="alert" className="text-body-sm text-semantic-danger">
            {fieldErrors.ipWhitelist}
          </p>
        )}
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            setValues((p) => ({ ...p, ipWhitelist: [...p.ipWhitelist, ''] }))
          }
        >
          {t('fields.ipAdd')}
        </Button>
      </section>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            router.push(ROUTES.TENANT.ATTENDANCE.DEVICE_DETAIL(deviceId))
          }
          disabled={provision.isPending}
        >
          {t('actions.cancel')}
        </Button>
        <Button type="submit" variant="primary" isLoading={provision.isPending}>
          {provision.isPending ? t('actions.saving') : t('provision.submit')}
        </Button>
      </div>
    </form>
  );
}
