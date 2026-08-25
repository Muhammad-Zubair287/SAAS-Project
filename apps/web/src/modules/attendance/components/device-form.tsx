'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '../../../components/ui/button';
import { toast } from '../../../lib/toast/store';
import { toApiError } from '../../../lib/api/errors';
import { ROUTES } from '../../../constants/routes.constants';
import { SUPPORTED_TIMEZONES } from '../../organisation/constants/organisation.constants';
import { useRegisterAttendanceDevice } from '../hooks/use-attendance-devices';
import type { RegisterAttendanceDevicePayload } from '../types/attendance-capture.types';
import { DEVICE_FIELD_LIMITS } from '../utils/device-lifecycle';

interface DeviceFormValues {
  name: string;
  deviceType: string;
  serialNumber: string;
  vendor: string;
  model: string;
  timezone: string;
}

type FieldErrors = Partial<Record<keyof DeviceFormValues, string>>;

const EMPTY: DeviceFormValues = {
  name: '',
  deviceType: '',
  serialNumber: '',
  vendor: '',
  model: '',
  timezone: '',
};

const inputClass =
  'w-full rounded-md border border-border-default bg-surface-primary px-3 py-2.5 text-body-md text-text-primary placeholder:text-text-secondary focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20';

const techInputClass = `${inputClass} font-mono`;

export function DeviceForm() {
  const t = useTranslations('attendance.devices');
  const router = useRouter();
  const register = useRegisterAttendanceDevice();
  const formId = useId();

  const [values, setValues] = useState<DeviceFormValues>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  function setField<K extends keyof DeviceFormValues>(
    key: K,
    value: DeviceFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    const name = values.name.trim();
    const deviceType = values.deviceType.trim();
    const serialNumber = values.serialNumber.trim();

    if (!name) errors.name = t('validation.nameRequired');
    else if (name.length > DEVICE_FIELD_LIMITS.name)
      errors.name = t('validation.nameMax');

    if (!deviceType) errors.deviceType = t('validation.deviceTypeRequired');
    else if (deviceType.length > DEVICE_FIELD_LIMITS.deviceType)
      errors.deviceType = t('validation.deviceTypeMax');

    if (!serialNumber) errors.serialNumber = t('validation.serialRequired');
    else if (serialNumber.length > DEVICE_FIELD_LIMITS.serialNumber)
      errors.serialNumber = t('validation.serialMax');

    if (values.vendor.trim().length > DEVICE_FIELD_LIMITS.vendor)
      errors.vendor = t('validation.vendorMax');
    if (values.model.trim().length > DEVICE_FIELD_LIMITS.model)
      errors.model = t('validation.modelMax');
    if (values.timezone.trim().length > DEVICE_FIELD_LIMITS.timezone)
      errors.timezone = t('validation.timezoneMax');

    return errors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const payload: RegisterAttendanceDevicePayload = {
      name: values.name.trim(),
      deviceType: values.deviceType.trim(),
      serialNumber: values.serialNumber.trim(),
      ...(values.vendor.trim() ? { vendor: values.vendor.trim() } : {}),
      ...(values.model.trim() ? { model: values.model.trim() } : {}),
      ...(values.timezone.trim() ? { timezone: values.timezone.trim() } : {}),
    };

    try {
      const res = await register.mutateAsync(payload);
      const created = res.data;
      toast.success(t('success.registered'));
      router.push(ROUTES.TENANT.ATTENDANCE.DEVICE_DETAIL(created.id));
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
      className="mx-auto max-w-2xl space-y-8"
      noValidate
    >
      {serverError && (
        <div
          role="alert"
          className="rounded-md border border-semantic-danger/30 bg-surface-primary px-4 py-3 text-body-sm text-semantic-danger"
        >
          {serverError}
        </div>
      )}

      <section className="space-y-4 rounded-xl border border-border-default bg-surface-primary p-6">
        <h2 className="text-heading-h3 font-semibold text-text-primary">
          {t('sections.basic')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id={`${formId}-name`}
            label={t('fields.name')}
            error={fieldErrors.name}
            className="sm:col-span-2"
          >
            <input
              id={`${formId}-name`}
              value={values.name}
              maxLength={DEVICE_FIELD_LIMITS.name}
              onChange={(e) => setField('name', e.target.value)}
              className={inputClass}
              autoComplete="off"
              required
              aria-invalid={!!fieldErrors.name}
            />
          </Field>
          <Field
            id={`${formId}-type`}
            label={t('fields.deviceType')}
            error={fieldErrors.deviceType}
          >
            <input
              id={`${formId}-type`}
              value={values.deviceType}
              maxLength={DEVICE_FIELD_LIMITS.deviceType}
              onChange={(e) => setField('deviceType', e.target.value)}
              className={inputClass}
              autoComplete="off"
              required
              aria-invalid={!!fieldErrors.deviceType}
            />
          </Field>
          <Field
            id={`${formId}-serial`}
            label={t('fields.serialNumber')}
            error={fieldErrors.serialNumber}
          >
            <input
              id={`${formId}-serial`}
              dir="ltr"
              value={values.serialNumber}
              maxLength={DEVICE_FIELD_LIMITS.serialNumber}
              onChange={(e) => setField('serialNumber', e.target.value)}
              className={techInputClass}
              autoComplete="off"
              required
              aria-invalid={!!fieldErrors.serialNumber}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border-default bg-surface-primary p-6">
        <h2 className="text-heading-h3 font-semibold text-text-primary">
          {t('sections.manufacturer')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id={`${formId}-vendor`}
            label={t('fields.vendor')}
            error={fieldErrors.vendor}
          >
            <input
              id={`${formId}-vendor`}
              value={values.vendor}
              maxLength={DEVICE_FIELD_LIMITS.vendor}
              onChange={(e) => setField('vendor', e.target.value)}
              className={inputClass}
              autoComplete="off"
              aria-invalid={!!fieldErrors.vendor}
            />
          </Field>
          <Field
            id={`${formId}-model`}
            label={t('fields.model')}
            error={fieldErrors.model}
          >
            <input
              id={`${formId}-model`}
              value={values.model}
              maxLength={DEVICE_FIELD_LIMITS.model}
              onChange={(e) => setField('model', e.target.value)}
              className={inputClass}
              autoComplete="off"
              aria-invalid={!!fieldErrors.model}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border-default bg-surface-primary p-6">
        <h2 className="text-heading-h3 font-semibold text-text-primary">
          {t('sections.regional')}
        </h2>
        <Field
          id={`${formId}-tz`}
          label={t('fields.timezone')}
          error={fieldErrors.timezone}
        >
          <select
            id={`${formId}-tz`}
            dir="ltr"
            value={values.timezone}
            onChange={(e) => setField('timezone', e.target.value)}
            className={inputClass}
            aria-invalid={!!fieldErrors.timezone}
          >
            <option value="">{t('fields.timezonePlaceholder')}</option>
            {SUPPORTED_TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </Field>
      </section>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push(ROUTES.TENANT.ATTENDANCE.DEVICES)}
          disabled={register.isPending}
        >
          {t('actions.cancel')}
        </Button>
        <Button type="submit" variant="primary" isLoading={register.isPending}>
          {register.isPending ? t('actions.saving') : t('actions.register')}
        </Button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  children,
  className,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const errorId = `${id}-error`;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-label-md font-medium text-text-primary">
        {label}
      </label>
      {children}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-body-sm text-semantic-danger">
          {error}
        </p>
      )}
    </div>
  );
}
