'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { toApiError } from '../../../lib/api/errors';
import { useCheckAttendanceGeofence } from '../hooks/use-attendance-geofences';
import type { GeofenceCheckResponse } from '../types/attendance-capture.types';
import { TECH_VALUE_CLASS } from '../utils/geofence-format';

interface GeofenceCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  geofenceId: string;
  geofenceName: string;
}

const inputClass =
  'w-full rounded-md border border-border-default bg-surface-primary px-3 py-2.5 font-mono tabular-nums text-body-md text-text-primary focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20';

export function GeofenceCheckDialog({
  open,
  onOpenChange,
  geofenceId,
  geofenceName,
}: GeofenceCheckDialogProps) {
  const t = useTranslations('attendance.geofences');
  const check = useCheckAttendanceGeofence();
  const formId = useId();

  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [at, setAt] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [result, setResult] = useState<GeofenceCheckResponse | null>(null);

  function resetState() {
    setLatitude('');
    setLongitude('');
    setAt('');
    setFieldError(null);
    setServerError(null);
    setResult(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetState();
    onOpenChange(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError(null);
    setServerError(null);
    setResult(null);

    const lat = Number(latitude);
    const lng = Number(longitude);
    if (
      latitude.trim() === '' ||
      longitude.trim() === '' ||
      Number.isNaN(lat) ||
      Number.isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      setFieldError(t('validation.latRange'));
      return;
    }

    try {
      const response = await check.mutateAsync({
        geofenceId,
        payload: {
          latitude: lat,
          longitude: lng,
          ...(at ? { at: new Date(at).toISOString() } : {}),
        },
      });
      setResult(response.data);
    } catch (err) {
      setServerError(toApiError(err).message || t('error'));
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      title={t('check.title')}
      description={t('check.description')}
      size="md"
      closeLabel={t('check.close')}
      footer={
        <Button variant="secondary" onClick={() => handleOpenChange(false)}>
          {t('check.close')}
        </Button>
      }
    >
      <p className="mb-4 text-body-sm text-text-secondary">{geofenceName}</p>

      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="space-y-4"
        noValidate
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor={`${formId}-lat`}
              className="mb-1 block text-label-md font-medium text-text-primary"
            >
              {t('check.latitude')}
            </label>
            <input
              id={`${formId}-lat`}
              type="number"
              inputMode="decimal"
              step="any"
              min={-90}
              max={90}
              dir="ltr"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label
              htmlFor={`${formId}-lng`}
              className="mb-1 block text-label-md font-medium text-text-primary"
            >
              {t('check.longitude')}
            </label>
            <input
              id={`${formId}-lng`}
              type="number"
              inputMode="decimal"
              step="any"
              min={-180}
              max={180}
              dir="ltr"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              className={inputClass}
              required
            />
          </div>
        </div>

        <div>
          <label
            htmlFor={`${formId}-at`}
            className="mb-1 block text-label-md font-medium text-text-primary"
          >
            {t('check.at')}
          </label>
          <input
            id={`${formId}-at`}
            type="datetime-local"
            dir="ltr"
            value={at}
            onChange={(e) => setAt(e.target.value)}
            className={inputClass}
          />
        </div>

        {(fieldError || serverError) && (
          <p role="alert" className="text-body-sm text-semantic-danger">
            {fieldError ?? serverError}
          </p>
        )}

        <Button type="submit" isLoading={check.isPending} fullWidth>
          {check.isPending ? t('check.checking') : t('check.submit')}
        </Button>
      </form>

      {result && (
        <div
          className="mt-6 rounded-lg border border-border-default bg-surface-canvas p-4"
          role="status"
          aria-live="polite"
        >
          <p className="text-label-md font-semibold text-text-secondary">
            {t('check.result')}
          </p>
          <p
            className={`mt-2 text-body-md font-semibold ${
              result.isWithin
                ? 'text-semantic-success-fg'
                : 'text-semantic-warning-fg'
            }`}
          >
            {result.isWithin ? (
              <span aria-label={t('check.within')}>✓ {t('check.within')}</span>
            ) : (
              <span aria-label={t('check.outside')}>✕ {t('check.outside')}</span>
            )}
          </p>
          {result.distance !== undefined && (
            <p dir="ltr" className={`mt-2 ${TECH_VALUE_CLASS} text-text-secondary`}>
              {t('check.distance', { distance: result.distance })}
            </p>
          )}
          {result.exceedBy !== undefined && (
            <p dir="ltr" className={`mt-1 ${TECH_VALUE_CLASS} text-text-secondary`}>
              {t('check.exceedBy', { exceedBy: result.exceedBy })}
            </p>
          )}
        </div>
      )}
    </Dialog>
  );
}
