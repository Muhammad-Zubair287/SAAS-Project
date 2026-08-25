'use client';

import { useId, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '../../../components/ui/button';
import { Dialog } from '../../../components/ui/dialog';
import { SearchableSelect } from '../../../components/common/searchable-select';
import { toApiError } from '../../../lib/api/errors';
import { toast } from '../../../lib/toast/store';
import { usePermissions } from '../../../lib/permissions/use-permissions';
import { ROUTES } from '../../../constants/routes.constants';
import { useBranches } from '../../organisation/hooks/use-branches';
import { useDepartments } from '../../organisation/hooks/use-departments';
import { useShifts } from '../hooks/use-shifts';
import { useAssignShift } from '../hooks/use-shift-assignments';
import { ROSTER_PERMISSIONS } from '../constants/shift.constants';
import type {
  AssignmentConflict,
  CreateShiftAssignmentPayload,
} from '../types/shift-assignment.types';
import { EmployeeMultiSelect } from './employee-multi-select';

type TargetMode = 'employees' | 'department';

function extractConflicts(err: unknown): AssignmentConflict[] {
  const api = toApiError(err);
  const details = api.details as { conflicts?: AssignmentConflict[] } | undefined;
  if (Array.isArray(details?.conflicts)) return details.conflicts;
  return [];
}

export function AssignShiftForm() {
  const t = useTranslations('shifts.assign');
  const tc = useTranslations('common');
  const router = useRouter();
  const formId = useId();
  const { hasPermission } = usePermissions();
  const canOverride = hasPermission(ROSTER_PERMISSIONS.OVERRIDE);
  const assign = useAssignShift();

  const [mode, setMode] = useState<TargetMode>('employees');
  const [employeeIds, setEmployeeIds] = useState<string[]>([]);
  const [departmentId, setDepartmentId] = useState<string | undefined>();
  const [shiftId, setShiftId] = useState<string | undefined>();
  const [branchId, setBranchId] = useState<string | undefined>();
  const [effectiveFrom, setEffectiveFrom] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [effectiveTo, setEffectiveTo] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<AssignmentConflict[] | null>(null);
  const [pendingOverride, setPendingOverride] = useState(false);

  const shiftsQuery = useShifts({
    page: 1,
    pageSize: 100,
    status: 'ACTIVE',
    sortBy: 'name',
  });
  const departmentsQuery = useDepartments({ page: 1, pageSize: 100 });
  const branchesQuery = useBranches({ page: 1, pageSize: 100 });

  const shiftOptions = useMemo(
    () =>
      (shiftsQuery.data?.data ?? []).map((s) => ({
        value: s.id,
        label: s.name,
        sublabel: `${s.code} · ${s.startLocalTime}–${s.endLocalTime}`,
      })),
    [shiftsQuery.data?.data],
  );
  const departmentOptions = useMemo(
    () =>
      (departmentsQuery.data?.data ?? []).map((d) => ({
        value: d.id,
        label: d.name,
        sublabel: d.code,
      })),
    [departmentsQuery.data?.data],
  );
  const branchOptions = useMemo(
    () =>
      (branchesQuery.data?.data ?? []).map((b) => ({
        value: b.id,
        label: b.name,
        sublabel: b.code,
      })),
    [branchesQuery.data?.data],
  );

  function buildPayload(overrideExisting: boolean): CreateShiftAssignmentPayload | null {
    if (!shiftId) {
      setFieldError(t('validation.shiftRequired'));
      return null;
    }
    if (!effectiveFrom) {
      setFieldError(t('validation.fromRequired'));
      return null;
    }
    if (effectiveTo && effectiveTo <= effectiveFrom) {
      setFieldError(t('validation.range'));
      return null;
    }
    if (mode === 'employees' && employeeIds.length === 0) {
      setFieldError(t('validation.employeesRequired'));
      return null;
    }
    if (mode === 'department' && !departmentId) {
      setFieldError(t('validation.departmentRequired'));
      return null;
    }
    setFieldError(null);
    return {
      shiftId,
      effectiveFrom,
      ...(effectiveTo ? { effectiveTo } : {}),
      ...(branchId ? { branchId } : {}),
      ...(mode === 'employees'
        ? { employeeIds }
        : { departmentId: departmentId! }),
      overrideExisting,
    };
  }

  async function submit(overrideExisting: boolean) {
    const payload = buildPayload(overrideExisting);
    if (!payload) return;
    try {
      const res = await assign.mutateAsync(payload);
      toast.success(
        t('success.summary', {
          created: res.data.created,
          resolved: res.data.employeesResolved,
          overridden: res.data.overridden,
        }),
      );
      setConflicts(null);
      setPendingOverride(false);
      router.push(ROUTES.TENANT.SHIFTS.ASSIGNMENTS);
    } catch (err) {
      const apiErr = toApiError(err);
      if (apiErr.code === 'SHIFT_ASSIGNMENT_OVERLAP') {
        setConflicts(extractConflicts(err));
        setPendingOverride(true);
        return;
      }
      toast.error(apiErr.message || t('errors.assignFailed'));
    }
  }

  return (
    <>
      <form
        id={formId}
        className="mx-auto max-w-3xl space-y-8"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(false);
        }}
      >
        <section className="space-y-4" aria-labelledby={`${formId}-target`}>
          <h2 id={`${formId}-target`} className="text-title-md text-text-primary">
            {t('sections.target')}
          </h2>
          <div className="flex flex-wrap gap-4">
            <label className="inline-flex min-h-11 items-center gap-2">
              <input
                type="radio"
                name="targetMode"
                checked={mode === 'employees'}
                onChange={() => setMode('employees')}
              />
              {t('mode.employees')}
            </label>
            <label className="inline-flex min-h-11 items-center gap-2">
              <input
                type="radio"
                name="targetMode"
                checked={mode === 'department'}
                onChange={() => setMode('department')}
              />
              {t('mode.department')}
            </label>
          </div>

          {mode === 'employees' ? (
            <div>
              <p className="mb-2 text-label-md text-text-secondary">
                {t('fields.employees')}
              </p>
              <EmployeeMultiSelect
                value={employeeIds}
                onChange={setEmployeeIds}
                disabled={assign.isPending}
              />
            </div>
          ) : (
            <div>
              <label
                className="mb-1 block text-label-md text-text-secondary"
                htmlFor={`${formId}-dept`}
              >
                {t('fields.department')}
              </label>
              <SearchableSelect
                value={departmentId}
                onChange={setDepartmentId}
                options={departmentOptions}
                placeholder={t('fields.departmentPlaceholder')}
                disabled={assign.isPending}
              />
              <p className="mt-2 text-body-sm text-text-secondary">
                {t('snapshotHint')}
              </p>
            </div>
          )}
        </section>

        <section className="space-y-4" aria-labelledby={`${formId}-config`}>
          <h2 id={`${formId}-config`} className="text-title-md text-text-primary">
            {t('sections.configuration')}
          </h2>

          <div>
            <label className="mb-1 block text-label-md text-text-secondary">
              {t('fields.shift')}
            </label>
            <SearchableSelect
              value={shiftId}
              onChange={setShiftId}
              options={shiftOptions}
              placeholder={t('fields.shiftPlaceholder')}
              disabled={assign.isPending}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                className="mb-1 block text-label-md text-text-secondary"
                htmlFor={`${formId}-from`}
              >
                {t('fields.effectiveFrom')}
              </label>
              <input
                id={`${formId}-from`}
                type="date"
                dir="ltr"
                required
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2.5 text-body-md"
              />
            </div>
            <div>
              <label
                className="mb-1 block text-label-md text-text-secondary"
                htmlFor={`${formId}-to`}
              >
                {t('fields.effectiveTo')}
              </label>
              <input
                id={`${formId}-to`}
                type="date"
                dir="ltr"
                value={effectiveTo}
                onChange={(e) => setEffectiveTo(e.target.value)}
                className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2.5 text-body-md"
              />
              <p className="mt-1 text-body-sm text-text-secondary">
                {t('fields.effectiveToHint')}
              </p>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-label-md text-text-secondary">
              {t('fields.location')}
            </label>
            <SearchableSelect
              value={branchId}
              onChange={setBranchId}
              options={branchOptions}
              placeholder={t('fields.locationPlaceholder')}
              disabled={assign.isPending}
            />
          </div>
        </section>

        {fieldError && (
          <p role="alert" className="text-body-sm text-semantic-danger">
            {fieldError}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={assign.isPending}>
            {t('actions.submit')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={assign.isPending}
            onClick={() => router.push(ROUTES.TENANT.SHIFTS.ROOT)}
          >
            {tc('cancel')}
          </Button>
        </div>
      </form>

      <Dialog
        open={pendingOverride && !!conflicts?.length}
        onOpenChange={(open) => {
          if (!open) {
            setPendingOverride(false);
            setConflicts(null);
          }
        }}
        title={t('overlap.title')}
        description={t('overlap.description')}
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setPendingOverride(false);
                setConflicts(null);
              }}
            >
              {tc('cancel')}
            </Button>
            {canOverride && (
              <Button
                variant="danger"
                disabled={assign.isPending}
                onClick={() => void submit(true)}
              >
                {t('overlap.override')}
              </Button>
            )}
          </>
        }
      >
        <ul className="max-h-64 space-y-2 overflow-y-auto text-body-sm">
          {(conflicts ?? []).map((c) => (
            <li
              key={c.conflictingAssignmentId}
              className="rounded-md border border-border-default px-3 py-2"
            >
              <p dir="ltr">
                {t('overlap.row', {
                  employeeId: c.employeeId,
                  from: c.effectiveFrom,
                  to: c.effectiveTo ?? t('overlap.openEnded'),
                })}
              </p>
            </li>
          ))}
        </ul>
        {!canOverride && (
          <p className="mt-3 text-body-sm text-text-secondary">
            {t('overlap.noOverridePermission')}
          </p>
        )}
      </Dialog>
    </>
  );
}
