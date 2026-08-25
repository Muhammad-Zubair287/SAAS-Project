'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '../../../components/ui/button';
import { Dialog } from '../../../components/ui/dialog';
import { toast } from '../../../lib/toast/store';
import { toApiError } from '../../../lib/api/errors';
import { ROUTES } from '../../../constants/routes.constants';
import { useAttendancePolicies } from '../../attendance/hooks/use-attendance-policies';
import type { AttendancePolicy } from '../../attendance/types/attendance-policy.types';
import {
  SHIFT_MATERIAL_FIELDS,
} from '../constants/shift.constants';
import {
  useCreateShift,
  useUpdateShift,
} from '../hooks/use-shifts';
import type { CreateShiftPayload, Shift } from '../types/shift.types';
import {
  hasMaterialFieldChanges,
  isVersionConflict,
} from '../utils/shift-format';

/** Normalize AxiosResponse | ApiSuccessResponse | AttendancePolicy[] from policy list hook. */
function asPolicyList(payload: unknown): AttendancePolicy[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  const maybeBody = (payload as { data?: unknown }).data;
  if (Array.isArray(maybeBody)) return maybeBody;
  if (
    maybeBody &&
    typeof maybeBody === 'object' &&
    Array.isArray((maybeBody as { data?: unknown }).data)
  ) {
    return (maybeBody as { data: AttendancePolicy[] }).data;
  }
  return [];
}

export type ShiftFormMode = 'create' | 'edit';

interface ShiftFormValues {
  code: string;
  name: string;
  attendancePolicyId: string;
  startLocalTime: string;
  endLocalTime: string;
  crossesMidnight: boolean;
  requiredMinutes: string;
  breakMinutes: string;
  breakPaid: boolean;
  checkInWindowBeforeMinutes: string;
  checkInWindowAfterMinutes: string;
  checkOutWindowAfterMinutes: string;
  effectiveFrom: string;
  effectiveTo: string;
}

const EMPTY: ShiftFormValues = {
  code: '',
  name: '',
  attendancePolicyId: '',
  startLocalTime: '09:00',
  endLocalTime: '17:00',
  crossesMidnight: false,
  requiredMinutes: '480',
  breakMinutes: '60',
  breakPaid: false,
  checkInWindowBeforeMinutes: '15',
  checkInWindowAfterMinutes: '15',
  checkOutWindowAfterMinutes: '15',
  effectiveFrom: new Date().toISOString().slice(0, 10),
  effectiveTo: '',
};

function fromShift(s: Shift): ShiftFormValues {
  return {
    code: s.code,
    name: s.name,
    attendancePolicyId: s.attendancePolicyId,
    startLocalTime: s.startLocalTime,
    endLocalTime: s.endLocalTime,
    crossesMidnight: s.crossesMidnight,
    requiredMinutes: String(s.requiredMinutes),
    breakMinutes: String(s.breakMinutes),
    breakPaid: s.breakPaid,
    checkInWindowBeforeMinutes: String(s.checkInWindowBeforeMinutes),
    checkInWindowAfterMinutes: String(s.checkInWindowAfterMinutes),
    checkOutWindowAfterMinutes: String(s.checkOutWindowAfterMinutes),
    effectiveFrom: s.effectiveFrom.slice(0, 10),
    effectiveTo: s.effectiveTo ? s.effectiveTo.slice(0, 10) : '',
  };
}

const inputClass =
  'w-full rounded-md border border-border-default bg-surface-primary px-3 py-2.5 text-body-md text-text-primary placeholder:text-text-secondary focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20 disabled:bg-surface-canvas disabled:text-text-secondary';

const techInputClass = `${inputClass} font-mono tabular-nums`;

interface ShiftFormProps {
  mode: ShiftFormMode;
  shift?: Shift;
  rowVersion?: string;
}

export function ShiftForm({ mode, shift, rowVersion }: ShiftFormProps) {
  const t = useTranslations('shifts');
  const tc = useTranslations('common');
  const router = useRouter();
  const formId = useId();
  const create = useCreateShift();
  const update = useUpdateShift(shift?.id ?? '');
  const policiesQuery = useAttendancePolicies({
    page: 1,
    limit: 100,
    isCurrentOnly: true,
  });

  const [values, setValues] = useState<ShiftFormValues>(
    shift ? fromShift(shift) : EMPTY,
  );
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [conflictOpen, setConflictOpen] = useState(false);

  useEffect(() => {
    if (shift) setValues(fromShift(shift));
  }, [shift]);

  const policies = useMemo(
    () => asPolicyList(policiesQuery.data),
    [policiesQuery.data],
  );

  const selectedPolicy = useMemo(() => {
    return policies.find((p) => p.id === values.attendancePolicyId) ?? null;
  }, [policies, values.attendancePolicyId]);

  const materialWarning = useMemo(() => {
    if (mode !== 'edit' || !shift || shift.status !== 'ACTIVE') return false;
    const next = {
      startLocalTime: values.startLocalTime,
      endLocalTime: values.endLocalTime,
      crossesMidnight: values.crossesMidnight,
      requiredMinutes: Number(values.requiredMinutes),
      breakMinutes: Number(values.breakMinutes),
      breakPaid: values.breakPaid,
      checkInWindowBeforeMinutes: Number(values.checkInWindowBeforeMinutes),
      checkInWindowAfterMinutes: Number(values.checkInWindowAfterMinutes),
      checkOutWindowAfterMinutes: Number(values.checkOutWindowAfterMinutes),
      attendancePolicyId: values.attendancePolicyId,
      effectiveFrom: values.effectiveFrom,
      effectiveTo: values.effectiveTo || null,
    };
    const original = {
      startLocalTime: shift.startLocalTime,
      endLocalTime: shift.endLocalTime,
      crossesMidnight: shift.crossesMidnight,
      requiredMinutes: shift.requiredMinutes,
      breakMinutes: shift.breakMinutes,
      breakPaid: shift.breakPaid,
      checkInWindowBeforeMinutes: shift.checkInWindowBeforeMinutes,
      checkInWindowAfterMinutes: shift.checkInWindowAfterMinutes,
      checkOutWindowAfterMinutes: shift.checkOutWindowAfterMinutes,
      attendancePolicyId: shift.attendancePolicyId,
      effectiveFrom: shift.effectiveFrom.slice(0, 10),
      effectiveTo: shift.effectiveTo ? shift.effectiveTo.slice(0, 10) : null,
    };
    return hasMaterialFieldChanges(original, next, SHIFT_MATERIAL_FIELDS);
  }, [mode, shift, values]);

  function set<K extends keyof ShiftFormValues>(key: K, value: ShiftFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function validate(): string | null {
    if (!values.code.trim()) return t('validation.codeRequired');
    if (!values.name.trim()) return t('validation.nameRequired');
    if (!values.attendancePolicyId) return t('validation.policyRequired');
    if (!values.startLocalTime || !values.endLocalTime) {
      return t('validation.timesRequired');
    }
    const required = Number(values.requiredMinutes);
    if (!Number.isFinite(required) || required < 1) {
      return t('validation.requiredMinutes');
    }
    const breakMins = Number(values.breakMinutes);
    if (!Number.isFinite(breakMins) || breakMins < 0) {
      return t('validation.breakMinutes');
    }
    if (values.effectiveTo && values.effectiveTo <= values.effectiveFrom) {
      return t('validation.dateRange');
    }
    if (
      !values.crossesMidnight &&
      values.endLocalTime <= values.startLocalTime
    ) {
      return t('validation.dayTimes');
    }
    if (
      values.crossesMidnight &&
      values.endLocalTime >= values.startLocalTime
    ) {
      return t('validation.overnightTimes');
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    const err = validate();
    if (err) {
      setFieldError(err);
      return;
    }
    setFieldError(null);

    const payload: CreateShiftPayload = {
      code: values.code.trim(),
      name: values.name.trim(),
      startLocalTime: values.startLocalTime,
      endLocalTime: values.endLocalTime,
      crossesMidnight: values.crossesMidnight,
      requiredMinutes: Number(values.requiredMinutes),
      breakMinutes: Number(values.breakMinutes),
      breakPaid: values.breakPaid,
      checkInWindowBeforeMinutes: Number(values.checkInWindowBeforeMinutes),
      checkInWindowAfterMinutes: Number(values.checkInWindowAfterMinutes),
      checkOutWindowAfterMinutes: Number(values.checkOutWindowAfterMinutes),
      attendancePolicyId: values.attendancePolicyId,
      effectiveFrom: values.effectiveFrom,
      ...(values.effectiveTo ? { effectiveTo: values.effectiveTo } : {}),
    };

    try {
      if (mode === 'create') {
        const res = await create.mutateAsync(payload);
        toast.success(t('success.created'));
        router.push(ROUTES.TENANT.SHIFTS.EDIT(res.data.id));
        return;
      }
      if (!rowVersion || !shift) return;
      const res = await update.mutateAsync({
        payload,
        ifMatch: rowVersion,
      });
      toast.success(
        res.data.id !== shift.id
          ? t('success.versionCreated', { version: res.data.version })
          : t('success.updated'),
      );
      if (res.data.id !== shift.id) {
        router.replace(ROUTES.TENANT.SHIFTS.EDIT(res.data.id));
      } else {
        router.refresh();
      }
    } catch (error) {
      if (isVersionConflict(error)) {
        setConflictOpen(true);
        return;
      }
      const apiErr = toApiError(error);
      setServerError(apiErr.message || t('errors.saveFailed'));
    }
  }

  const pending = create.isPending || update.isPending;
  return (
    <>
      <form
        id={formId}
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="space-y-8"
        noValidate
      >
        {(fieldError || serverError) && (
          <p role="alert" className="text-body-sm text-semantic-danger">
            {fieldError ?? serverError}
          </p>
        )}

        {materialWarning && (
          <div
            role="status"
            className="rounded-md border border-semantic-warning/40 bg-surface-canvas px-4 py-3 text-body-sm text-text-primary"
          >
            {t('version.warning')}
          </div>
        )}

        <section className="space-y-4 rounded-xl border border-border-default bg-surface-primary p-6">
          <h2 className="text-heading-h3 font-semibold text-text-primary">
            {t('sections.basic')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`${formId}-code`} className="mb-1 block text-label-md font-medium">
                {t('fields.code')}
              </label>
              <input
                id={`${formId}-code`}
                dir="ltr"
                className={techInputClass}
                value={values.code}
                onChange={(e) => set('code', e.target.value)}
                disabled={mode === 'edit'}
                required
                maxLength={60}
              />
            </div>
            <div>
              <label htmlFor={`${formId}-name`} className="mb-1 block text-label-md font-medium">
                {t('fields.name')}
              </label>
              <input
                id={`${formId}-name`}
                className={inputClass}
                value={values.name}
                onChange={(e) => set('name', e.target.value)}
                required
                maxLength={160}
              />
            </div>
            <div className="sm:col-span-2">
              <label
                htmlFor={`${formId}-policy`}
                className="mb-1 block text-label-md font-medium"
              >
                {t('fields.policy')}
              </label>
              <select
                id={`${formId}-policy`}
                className={inputClass}
                value={values.attendancePolicyId}
                onChange={(e) => set('attendancePolicyId', e.target.value)}
                required
              >
                <option value="">{t('fields.policyPlaceholder')}</option>
                {policies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-body-sm text-text-secondary">
                {t('fields.policyHint')}{' '}
                <Link
                  href={ROUTES.TENANT.ATTENDANCE.POLICIES}
                  className="text-brand-blue-600 underline"
                >
                  {t('fields.policyLink')}
                </Link>
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-border-default bg-surface-primary p-6">
          <h2 className="text-heading-h3 font-semibold text-text-primary">
            {t('sections.timing')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`${formId}-start`} className="mb-1 block text-label-md font-medium">
                {t('fields.start')}
              </label>
              <input
                id={`${formId}-start`}
                type="time"
                dir="ltr"
                className={techInputClass}
                value={values.startLocalTime}
                onChange={(e) => set('startLocalTime', e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor={`${formId}-end`} className="mb-1 block text-label-md font-medium">
                {t('fields.end')}
              </label>
              <input
                id={`${formId}-end`}
                type="time"
                dir="ltr"
                className={techInputClass}
                value={values.endLocalTime}
                onChange={(e) => set('endLocalTime', e.target.value)}
                required
              />
            </div>
            <div className="flex items-center gap-3 sm:col-span-2">
              <input
                id={`${formId}-overnight`}
                type="checkbox"
                checked={values.crossesMidnight}
                onChange={(e) => set('crossesMidnight', e.target.checked)}
                className="h-5 w-5"
              />
              <label htmlFor={`${formId}-overnight`} className="text-body-md">
                {t('fields.overnight')}
              </label>
            </div>
            <div>
              <label
                htmlFor={`${formId}-required`}
                className="mb-1 block text-label-md font-medium"
              >
                {t('fields.requiredMinutes')}
              </label>
              <input
                id={`${formId}-required`}
                type="number"
                min={1}
                dir="ltr"
                className={techInputClass}
                value={values.requiredMinutes}
                onChange={(e) => set('requiredMinutes', e.target.value)}
                required
              />
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-border-default bg-surface-primary p-6">
          <h2 className="text-heading-h3 font-semibold text-text-primary">
            {t('sections.break')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`${formId}-break`} className="mb-1 block text-label-md font-medium">
                {t('fields.breakMinutes')}
              </label>
              <input
                id={`${formId}-break`}
                type="number"
                min={0}
                dir="ltr"
                className={techInputClass}
                value={values.breakMinutes}
                onChange={(e) => set('breakMinutes', e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3 self-end">
              <input
                id={`${formId}-paid`}
                type="checkbox"
                checked={values.breakPaid}
                onChange={(e) => set('breakPaid', e.target.checked)}
                className="h-5 w-5"
              />
              <label htmlFor={`${formId}-paid`} className="text-body-md">
                {t('fields.breakPaid')}
              </label>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-border-default bg-surface-primary p-6">
          <h2 className="text-heading-h3 font-semibold text-text-primary">
            {t('sections.windows')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor={`${formId}-cin-before`}
                className="mb-1 block text-label-md font-medium"
              >
                {t('fields.checkInBefore')}
              </label>
              <input
                id={`${formId}-cin-before`}
                type="number"
                min={0}
                dir="ltr"
                className={techInputClass}
                value={values.checkInWindowBeforeMinutes}
                onChange={(e) => set('checkInWindowBeforeMinutes', e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor={`${formId}-cin-after`}
                className="mb-1 block text-label-md font-medium"
              >
                {t('fields.checkInAfter')}
              </label>
              <input
                id={`${formId}-cin-after`}
                type="number"
                min={0}
                dir="ltr"
                className={techInputClass}
                value={values.checkInWindowAfterMinutes}
                onChange={(e) => set('checkInWindowAfterMinutes', e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor={`${formId}-cout-after`}
                className="mb-1 block text-label-md font-medium"
              >
                {t('fields.checkOutAfter')}
              </label>
              <input
                id={`${formId}-cout-after`}
                type="number"
                min={0}
                dir="ltr"
                className={techInputClass}
                value={values.checkOutWindowAfterMinutes}
                onChange={(e) => set('checkOutWindowAfterMinutes', e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-border-default bg-surface-primary p-6">
          <h2 className="text-heading-h3 font-semibold text-text-primary">
            {t('sections.effective')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`${formId}-from`} className="mb-1 block text-label-md font-medium">
                {t('fields.effectiveFrom')}
              </label>
              <input
                id={`${formId}-from`}
                type="date"
                dir="ltr"
                className={techInputClass}
                value={values.effectiveFrom}
                onChange={(e) => set('effectiveFrom', e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor={`${formId}-to`} className="mb-1 block text-label-md font-medium">
                {t('fields.effectiveTo')}
              </label>
              <input
                id={`${formId}-to`}
                type="date"
                dir="ltr"
                className={techInputClass}
                value={values.effectiveTo}
                onChange={(e) => set('effectiveTo', e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-border-default bg-surface-canvas p-6">
          <h2 className="text-heading-h3 font-semibold text-text-primary">
            {t('sections.policyRules')}
          </h2>
          <p className="text-body-sm text-text-secondary">{t('policyReadOnly.hint')}</p>
          {selectedPolicy ? (
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ReadOnlyField
                label={t('policyReadOnly.grace')}
                value={`${selectedPolicy.graceMinutes} ${t('policyReadOnly.minutes')}`}
              />
              <ReadOnlyField
                label={t('policyReadOnly.lateTolerance')}
                value={`${selectedPolicy.lateToleranceMinutes} ${t('policyReadOnly.minutes')}`}
              />
              <ReadOnlyField
                label={t('policyReadOnly.earlyDeparture')}
                value={`${selectedPolicy.earlyDepartureToleranceMinutes} ${t('policyReadOnly.minutes')}`}
              />
              <ReadOnlyField
                label={t('policyReadOnly.overtime')}
                value={
                  selectedPolicy.allowOvertime
                    ? `${t('policyReadOnly.enabled')} (${selectedPolicy.overtimeThresholdMinutes}m)`
                    : t('policyReadOnly.disabled')
                }
              />
            </dl>
          ) : (
            <p className="text-body-sm text-text-secondary">
              {t('policyReadOnly.selectPolicy')}
            </p>
          )}
        </section>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" isLoading={pending}>
            {mode === 'create' ? t('actions.create') : t('actions.save')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push(ROUTES.TENANT.SHIFTS.ROOT)}
            disabled={pending}
          >
            {tc('cancel')}
          </Button>
        </div>
      </form>

      <Dialog
        open={conflictOpen}
        onOpenChange={setConflictOpen}
        title={t('conflict.title')}
        description={t('conflict.description')}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConflictOpen(false)}>
              {t('conflict.cancel')}
            </Button>
            <Button
              onClick={() => {
                setConflictOpen(false);
                router.refresh();
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

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-label-md text-text-secondary">{label}</dt>
      <dd dir="ltr" className="mt-0.5 text-body-md text-text-primary">
        {value}
      </dd>
    </div>
  );
}
