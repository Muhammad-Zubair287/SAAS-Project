'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '../../../components/ui/button';
import { Dialog } from '../../../components/ui/dialog';
import { toast } from '../../../lib/toast/store';
import { toApiError } from '../../../lib/api/errors';
import { ApiError } from '../../../lib/api/types';
import { ROUTES } from '../../../constants/routes.constants';
import { useLegalEntities } from '../../organisation/hooks/use-legal-entities';
import { useBranches } from '../../organisation/hooks/use-branches';
import {
  useCreateAttendanceGeofence,
  useUpdateAttendanceGeofence,
} from '../hooks/use-attendance-geofences';
import type {
  AttendanceGeofence,
  CreateAttendanceGeofencePayload,
  UpdateAttendanceGeofencePayload,
} from '../types/attendance-capture.types';
import {
  GEOFENCE_NAME_MAX_LENGTH,
  GEOFENCE_RADIUS_MAX_METERS,
  GEOFENCE_RADIUS_MIN_METERS,
  isVersionConflict,
  toDateInputValue,
} from '../utils/geofence-format';

export type GeofenceFormMode = 'create' | 'edit';

interface GeofenceFormValues {
  name: string;
  legalEntityId: string;
  branchId: string;
  centerLat: string;
  centerLng: string;
  radiusMeters: string;
  activeFrom: string;
  activeTo: string;
}

interface GeofenceFormProps {
  mode: GeofenceFormMode;
  geofence?: AttendanceGeofence;
  /** Required for edit — sent as If-Match. */
  rowVersion?: string;
  onVersionConflict?: () => void;
}

const EMPTY: GeofenceFormValues = {
  name: '',
  legalEntityId: '',
  branchId: '',
  centerLat: '',
  centerLng: '',
  radiusMeters: '',
  activeFrom: '',
  activeTo: '',
};

function fromGeofence(g: AttendanceGeofence): GeofenceFormValues {
  return {
    name: g.name,
    legalEntityId: g.legalEntityId ?? '',
    branchId: g.branchId ?? '',
    centerLat: g.centerLat != null ? String(g.centerLat) : '',
    centerLng: g.centerLng != null ? String(g.centerLng) : '',
    radiusMeters: g.radiusMeters != null ? String(g.radiusMeters) : '',
    activeFrom: toDateInputValue(g.activeFrom),
    activeTo: toDateInputValue(g.activeTo),
  };
}

type FieldErrors = Partial<Record<keyof GeofenceFormValues, string>>;

const inputClass =
  'w-full rounded-md border border-border-default bg-surface-primary px-3 py-2.5 text-body-md text-text-primary placeholder:text-text-secondary focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20 disabled:bg-surface-canvas disabled:text-text-secondary';

const techInputClass = `${inputClass} font-mono tabular-nums`;

export function GeofenceForm({
  mode,
  geofence,
  rowVersion,
  onVersionConflict,
}: GeofenceFormProps) {
  const t = useTranslations('attendance.geofences');
  const tc = useTranslations('common');
  const router = useRouter();
  const create = useCreateAttendanceGeofence();
  const update = useUpdateAttendanceGeofence();
  const formId = useId();

  const [values, setValues] = useState<GeofenceFormValues>(
    geofence ? fromGeofence(geofence) : EMPTY,
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [conflictOpen, setConflictOpen] = useState(false);

  useEffect(() => {
    if (geofence) setValues(fromGeofence(geofence));
  }, [geofence]);

  const { data: leData } = useLegalEntities({ pageSize: 100, status: 'ACTIVE' });
  const { data: branchData } = useBranches({
    pageSize: 100,
    status: 'ACTIVE',
    legalEntityId: values.legalEntityId || undefined,
  });

  const legalEntities = leData?.data ?? [];
  const branches = useMemo(() => {
    const all = branchData?.data ?? [];
    if (!values.legalEntityId) return all;
    return all.filter((b) => b.legalEntityId === values.legalEntityId);
  }, [branchData?.data, values.legalEntityId]);

  const isPending = create.isPending || update.isPending;

  function setField<K extends keyof GeofenceFormValues>(
    key: K,
    value: GeofenceFormValues[K],
  ) {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      // Organisation cascade: changing legal entity clears an invalid branch.
      if (key === 'legalEntityId') {
        next.branchId = '';
      }
      return next;
    });
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    const name = values.name.trim();
    if (!name) errors.name = t('validation.nameRequired');
    else if (name.length > GEOFENCE_NAME_MAX_LENGTH)
      errors.name = t('validation.nameMax');

    const lat = Number(values.centerLat);
    if (values.centerLat.trim() === '' || Number.isNaN(lat) || lat < -90 || lat > 90) {
      errors.centerLat = t('validation.latRange');
    }

    const lng = Number(values.centerLng);
    if (
      values.centerLng.trim() === '' ||
      Number.isNaN(lng) ||
      lng < -180 ||
      lng > 180
    ) {
      errors.centerLng = t('validation.lngRange');
    }

    const radius = Number(values.radiusMeters);
    if (
      values.radiusMeters.trim() === '' ||
      Number.isNaN(radius) ||
      !Number.isInteger(radius) ||
      radius < GEOFENCE_RADIUS_MIN_METERS ||
      radius > GEOFENCE_RADIUS_MAX_METERS
    ) {
      errors.radiusMeters = t('validation.radiusRange', {
        min: GEOFENCE_RADIUS_MIN_METERS,
        max: GEOFENCE_RADIUS_MAX_METERS,
      });
    }

    if (values.activeFrom && values.activeTo && values.activeTo <= values.activeFrom) {
      errors.activeTo = t('validation.dateOrder');
    }

    return errors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      if (mode === 'create') {
        const payload: CreateAttendanceGeofencePayload = {
          name: values.name.trim(),
          centerLat: Number(values.centerLat),
          centerLng: Number(values.centerLng),
          radiusMeters: Number(values.radiusMeters),
          ...(values.legalEntityId
            ? { legalEntityId: values.legalEntityId }
            : {}),
          ...(values.branchId ? { branchId: values.branchId } : {}),
          ...(values.activeFrom ? { activeFrom: values.activeFrom } : {}),
          ...(values.activeTo ? { activeTo: values.activeTo } : {}),
        };
        const result = await create.mutateAsync(payload);
        const created = result.data;
        toast.success(t('success.created'));
        router.push(ROUTES.TENANT.ATTENDANCE.GEOFENCE_DETAIL(created.id));
        return;
      }

      if (!geofence || !rowVersion) {
        setServerError(t('error'));
        return;
      }

      const payload: UpdateAttendanceGeofencePayload = {
        name: values.name.trim(),
        centerLat: Number(values.centerLat),
        centerLng: Number(values.centerLng),
        radiusMeters: Number(values.radiusMeters),
        activeFrom: values.activeFrom || undefined,
        activeTo: values.activeTo || undefined,
      };

      const result = await update.mutateAsync({
        geofenceId: geofence.id,
        payload,
        ifMatch: rowVersion,
      });
      toast.success(t('success.updated'));
      router.push(ROUTES.TENANT.ATTENDANCE.GEOFENCE_DETAIL(result.data.id));
    } catch (err) {
      if (isVersionConflict(err)) {
        setConflictOpen(true);
        onVersionConflict?.();
        return;
      }
      const apiErr = err instanceof ApiError ? err : toApiError(err);
      setServerError(apiErr.message || t('error'));
    }
  }

  function fieldErrorId(key: keyof GeofenceFormValues): string {
    return `${formId}-${key}-error`;
  }

  return (
    <>
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="mx-auto max-w-2xl space-y-6"
        noValidate
      >
        {serverError && (
          <div
            role="alert"
            className="rounded-lg border border-semantic-danger/30 bg-semantic-danger-bg p-4 text-body-md text-semantic-danger-fg"
          >
            {serverError}
          </div>
        )}

        {/* Section 1 — Basic */}
        <section className="rounded-lg border border-border-default bg-surface-primary p-6 space-y-4">
          <h2 className="text-heading-h3 font-semibold text-text-primary">
            {t('sections.basic')}
          </h2>

          <div>
            <label
              htmlFor={`${formId}-name`}
              className="mb-1 block text-label-md font-medium text-text-primary"
            >
              {t('fields.name')}{' '}
              <span className="text-semantic-danger">{tc('required')}</span>
            </label>
            <input
              id={`${formId}-name`}
              type="text"
              required
              maxLength={GEOFENCE_NAME_MAX_LENGTH}
              value={values.name}
              onChange={(e) => setField('name', e.target.value)}
              aria-invalid={!!fieldErrors.name}
              aria-describedby={fieldErrors.name ? fieldErrorId('name') : undefined}
              className={inputClass}
            />
            {fieldErrors.name && (
              <p id={fieldErrorId('name')} className="mt-1 text-body-sm text-semantic-danger">
                {fieldErrors.name}
              </p>
            )}
          </div>

          {mode === 'create' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor={`${formId}-legalEntity`}
                  className="mb-1 block text-label-md font-medium text-text-primary"
                >
                  {t('fields.legalEntityId')}{' '}
                  <span className="text-text-secondary">({tc('optional')})</span>
                </label>
                <select
                  id={`${formId}-legalEntity`}
                  value={values.legalEntityId}
                  onChange={(e) => setField('legalEntityId', e.target.value)}
                  className={inputClass}
                >
                  <option value="">{t('fields.legalEntityPlaceholder')}</option>
                  {legalEntities.map((le) => (
                    <option key={le.id} value={le.id}>
                      {le.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor={`${formId}-branch`}
                  className="mb-1 block text-label-md font-medium text-text-primary"
                >
                  {t('fields.branchId')}{' '}
                  <span className="text-text-secondary">({tc('optional')})</span>
                </label>
                <select
                  id={`${formId}-branch`}
                  value={values.branchId}
                  onChange={(e) => setField('branchId', e.target.value)}
                  className={inputClass}
                >
                  <option value="">{t('fields.branchPlaceholder')}</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </section>

        {/* Section 2 — Location */}
        <section className="rounded-lg border border-border-default bg-surface-primary p-6 space-y-4">
          <h2 className="text-heading-h3 font-semibold text-text-primary">
            {t('sections.location')}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`${formId}-lat`}
                className="mb-1 block text-label-md font-medium text-text-primary"
              >
                {t('fields.centerLat')}{' '}
                <span className="text-semantic-danger">{tc('required')}</span>
              </label>
              <input
                id={`${formId}-lat`}
                type="number"
                inputMode="decimal"
                step="any"
                min={-90}
                max={90}
                dir="ltr"
                required
                value={values.centerLat}
                onChange={(e) => setField('centerLat', e.target.value)}
                aria-invalid={!!fieldErrors.centerLat}
                aria-describedby={
                  fieldErrors.centerLat ? fieldErrorId('centerLat') : undefined
                }
                className={techInputClass}
              />
              {fieldErrors.centerLat && (
                <p
                  id={fieldErrorId('centerLat')}
                  className="mt-1 text-body-sm text-semantic-danger"
                >
                  {fieldErrors.centerLat}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor={`${formId}-lng`}
                className="mb-1 block text-label-md font-medium text-text-primary"
              >
                {t('fields.centerLng')}{' '}
                <span className="text-semantic-danger">{tc('required')}</span>
              </label>
              <input
                id={`${formId}-lng`}
                type="number"
                inputMode="decimal"
                step="any"
                min={-180}
                max={180}
                dir="ltr"
                required
                value={values.centerLng}
                onChange={(e) => setField('centerLng', e.target.value)}
                aria-invalid={!!fieldErrors.centerLng}
                aria-describedby={
                  fieldErrors.centerLng ? fieldErrorId('centerLng') : undefined
                }
                className={techInputClass}
              />
              {fieldErrors.centerLng && (
                <p
                  id={fieldErrorId('centerLng')}
                  className="mt-1 text-body-sm text-semantic-danger"
                >
                  {fieldErrors.centerLng}
                </p>
              )}
            </div>
          </div>
          <div>
            <label
              htmlFor={`${formId}-radius`}
              className="mb-1 block text-label-md font-medium text-text-primary"
            >
              {t('fields.radiusMeters')}{' '}
              <span className="text-semantic-danger">{tc('required')}</span>
            </label>
            <input
              id={`${formId}-radius`}
              type="number"
              inputMode="numeric"
              step={1}
              min={GEOFENCE_RADIUS_MIN_METERS}
              max={GEOFENCE_RADIUS_MAX_METERS}
              dir="ltr"
              required
              value={values.radiusMeters}
              onChange={(e) => setField('radiusMeters', e.target.value)}
              aria-invalid={!!fieldErrors.radiusMeters}
              aria-describedby={
                fieldErrors.radiusMeters ? fieldErrorId('radiusMeters') : undefined
              }
              className={techInputClass}
            />
            {fieldErrors.radiusMeters && (
              <p
                id={fieldErrorId('radiusMeters')}
                className="mt-1 text-body-sm text-semantic-danger"
              >
                {fieldErrors.radiusMeters}
              </p>
            )}
          </div>
        </section>

        {/* Section 3 — Dates */}
        <section className="rounded-lg border border-border-default bg-surface-primary p-6 space-y-4">
          <h2 className="text-heading-h3 font-semibold text-text-primary">
            {t('sections.dates')}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`${formId}-from`}
                className="mb-1 block text-label-md font-medium text-text-primary"
              >
                {t('fields.activeFrom')}{' '}
                <span className="text-text-secondary">({tc('optional')})</span>
              </label>
              <input
                id={`${formId}-from`}
                type="date"
                dir="ltr"
                value={values.activeFrom}
                onChange={(e) => setField('activeFrom', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor={`${formId}-to`}
                className="mb-1 block text-label-md font-medium text-text-primary"
              >
                {t('fields.activeTo')}{' '}
                <span className="text-text-secondary">({tc('optional')})</span>
              </label>
              <input
                id={`${formId}-to`}
                type="date"
                dir="ltr"
                value={values.activeTo}
                onChange={(e) => setField('activeTo', e.target.value)}
                aria-invalid={!!fieldErrors.activeTo}
                aria-describedby={
                  fieldErrors.activeTo ? fieldErrorId('activeTo') : undefined
                }
                className={inputClass}
              />
              {fieldErrors.activeTo && (
                <p
                  id={fieldErrorId('activeTo')}
                  className="mt-1 text-body-sm text-semantic-danger"
                >
                  {fieldErrors.activeTo}
                </p>
              )}
            </div>
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
            disabled={isPending}
          >
            {t('actions.cancel')}
          </Button>
          <Button type="submit" isLoading={isPending}>
            {isPending
              ? t('actions.saving')
              : mode === 'create'
                ? t('actions.create')
                : t('actions.save')}
          </Button>
        </div>
      </form>

      <Dialog
        open={conflictOpen}
        onOpenChange={setConflictOpen}
        title={t('conflict.title')}
        description={t('conflict.description')}
        closeOnBackdropClick={false}
        closeLabel={t('conflict.cancel')}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setConflictOpen(false);
                router.push(
                  geofence
                    ? ROUTES.TENANT.ATTENDANCE.GEOFENCE_DETAIL(geofence.id)
                    : ROUTES.TENANT.ATTENDANCE.GEOFENCES,
                );
              }}
            >
              {t('conflict.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setConflictOpen(false);
                if (geofence) {
                  router.refresh();
                  onVersionConflict?.();
                }
              }}
            >
              {t('conflict.reload')}
            </Button>
          </>
        }
      />
    </>
  );
}
