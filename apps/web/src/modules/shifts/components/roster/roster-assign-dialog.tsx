'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '../../../../components/ui/button';
import { Dialog } from '../../../../components/ui/dialog';
import { SearchableSelect } from '../../../../components/common/searchable-select';
import { toApiError } from '../../../../lib/api/errors';
import { usePermissions } from '../../../../lib/permissions/use-permissions';
import { useDepartments } from '../../../organisation/hooks/use-departments';
import { useBranches } from '../../../organisation/hooks/use-branches';
import { useShifts } from '../../hooks/use-shifts';
import { useCreateRosterAssignment } from '../../hooks/use-rosters';
import { ROSTER_PERMISSIONS } from '../../constants/shift.constants';
import { EmployeeMultiSelect } from '../employee-multi-select';
import type {
  CreateRosterAssignmentPayload,
  RosterConflict,
  RosterRecurrenceType,
} from '../../types/roster.types';

type TargetMode = 'employees' | 'department';
type Mode = 'assign' | 'rest' | 'pattern';

interface RosterAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  defaultStartDate: string;
  defaultEndDate: string;
  defaultEmployeeIds?: string[];
  onSuccess: () => void;
}

function extractConflicts(err: unknown): RosterConflict[] {
  const api = toApiError(err);
  const details = api.details as { conflicts?: RosterConflict[] } | undefined;
  if (Array.isArray(details?.conflicts)) return details.conflicts;
  return [];
}

export function RosterAssignDialog({
  open,
  onOpenChange,
  mode,
  defaultStartDate,
  defaultEndDate,
  defaultEmployeeIds,
  onSuccess,
}: RosterAssignDialogProps) {
  const t = useTranslations('roster.assign');
  const { hasPermission } = usePermissions();
  const canOverride = hasPermission(ROSTER_PERMISSIONS.OVERRIDE);
  const create = useCreateRosterAssignment();

  const [targetMode, setTargetMode] = useState<TargetMode>('employees');
  const [employeeIds, setEmployeeIds] = useState<string[]>(defaultEmployeeIds ?? []);
  const [departmentId, setDepartmentId] = useState<string | undefined>();
  const [shiftId, setShiftId] = useState<string | undefined>();
  const [branchId, setBranchId] = useState<string | undefined>();
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [recurrenceType, setRecurrenceType] = useState<RosterRecurrenceType>('WEEKLY');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]);
  const [restWeekdays, setRestWeekdays] = useState<number[]>([]);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<RosterConflict[] | null>(null);

  const isRest = mode === 'rest';
  const isPattern = mode === 'pattern';

  const shiftsQuery = useShifts({ page: 1, pageSize: 100, status: 'ACTIVE', sortBy: 'name' });
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

  const weekdayLabels = [
    t('weekday.0'),
    t('weekday.1'),
    t('weekday.2'),
    t('weekday.3'),
    t('weekday.4'),
    t('weekday.5'),
    t('weekday.6'),
  ];

  function toggleDow(day: number, list: number[], setList: (v: number[]) => void) {
    setList(list.includes(day) ? list.filter((d) => d !== day) : [...list, day].sort());
  }

  function buildPayload(overrideExisting: boolean): CreateRosterAssignmentPayload | null {
    if (!startDate || !endDate) {
      setFieldError(t('validation.datesRequired'));
      return null;
    }
    if (endDate < startDate) {
      setFieldError(t('validation.range'));
      return null;
    }
    if (targetMode === 'employees' && employeeIds.length === 0) {
      setFieldError(t('validation.employeesRequired'));
      return null;
    }
    if (targetMode === 'department' && !departmentId) {
      setFieldError(t('validation.departmentRequired'));
      return null;
    }
    if (!isRest && !shiftId) {
      setFieldError(t('validation.shiftRequired'));
      return null;
    }
    if (isPattern && recurrenceType === 'WEEKLY' && daysOfWeek.length === 0) {
      setFieldError(t('validation.daysOfWeek'));
      return null;
    }
    setFieldError(null);
    return {
      startDate,
      endDate,
      isRestDay: isRest,
      ...(isRest ? {} : { shiftId }),
      ...(branchId ? { branchId } : {}),
      ...(targetMode === 'employees' ? { employeeIds } : { departmentId }),
      ...(isPattern
        ? {
            recurrence: {
              type: recurrenceType,
              ...(recurrenceType === 'WEEKLY' ? { daysOfWeek } : {}),
            },
            ...(restWeekdays.length ? { restWeekdays } : {}),
          }
        : {}),
      ...(overrideExisting ? { overrideExisting: true } : {}),
    };
  }

  async function submit(overrideExisting: boolean) {
    const payload = buildPayload(overrideExisting);
    if (!payload) return;
    try {
      await create.mutateAsync(payload);
      setConflicts(null);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      const api = toApiError(err);
      if (api.code === 'ROSTER_CONFLICT') {
        setConflicts(extractConflicts(err));
        return;
      }
      setFieldError(api.message);
    }
  }

  const title =
    mode === 'rest' ? t('titleRest') : mode === 'pattern' ? t('titlePattern') : t('titleAssign');

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={isPattern ? t('patternHint') : t('draftHint')}
      size="lg"
      closeOnBackdropClick={false}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          {conflicts && canOverride ? (
            <Button
              type="button"
              variant="danger"
              isLoading={create.isPending}
              onClick={() => void submit(true)}
            >
              {t('overrideConfirm')}
            </Button>
          ) : (
            <Button
              type="button"
              isLoading={create.isPending}
              onClick={() => void submit(false)}
            >
              {t('submit')}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4 p-4">
        <p className="rounded-md bg-surface-secondary px-3 py-2 text-sm text-text-secondary">
          {t('draftNotice')}
        </p>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t('target')}</legend>
          <div className="flex gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="target"
                checked={targetMode === 'employees'}
                onChange={() => setTargetMode('employees')}
              />
              {t('employees')}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="target"
                checked={targetMode === 'department'}
                onChange={() => setTargetMode('department')}
              />
              {t('department')}
            </label>
          </div>
          {targetMode === 'employees' ? (
            <EmployeeMultiSelect value={employeeIds} onChange={setEmployeeIds} />
          ) : (
            <SearchableSelect
              options={departmentOptions}
              value={departmentId}
              onChange={setDepartmentId}
              placeholder={t('selectDepartment')}
            />
          )}
        </fieldset>

        {!isRest ? (
          <div className="space-y-1">
            <label className="text-sm font-medium">{t('shift')}</label>
            <SearchableSelect
              options={shiftOptions}
              value={shiftId}
              onChange={setShiftId}
              placeholder={t('selectShift')}
            />
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="roster-start">
              {t('startDate')}
            </label>
            <input
              id="roster-start"
              type="date"
              className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-sm"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              dir="ltr"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="roster-end">
              {t('endDate')}
            </label>
            <input
              id="roster-end"
              type="date"
              className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-sm"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              dir="ltr"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">{t('branchOptional')}</label>
          <SearchableSelect
            options={branchOptions}
            value={branchId}
            onChange={setBranchId}
            placeholder={t('selectBranch')}
          />
        </div>

        {isPattern ? (
          <fieldset className="space-y-3 rounded-md border border-border-subtle p-3">
            <legend className="px-1 text-sm font-medium">{t('recurrence')}</legend>
            <div className="flex gap-3 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={recurrenceType === 'DAILY'}
                  onChange={() => setRecurrenceType('DAILY')}
                />
                {t('daily')}
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={recurrenceType === 'WEEKLY'}
                  onChange={() => setRecurrenceType('WEEKLY')}
                />
                {t('weekly')}
              </label>
            </div>
            {recurrenceType === 'WEEKLY' ? (
              <div className="flex flex-wrap gap-2">
                {weekdayLabels.map((label, i) => (
                  <label
                    key={label}
                    className="flex items-center gap-1 rounded-md border border-border-subtle px-2 py-1 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={daysOfWeek.includes(i)}
                      onChange={() => toggleDow(i, daysOfWeek, setDaysOfWeek)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            ) : null}
            <div>
              <p className="mb-1 text-xs text-text-tertiary">{t('restWeekdays')}</p>
              <div className="flex flex-wrap gap-2">
                {weekdayLabels.map((label, i) => (
                  <label
                    key={`rest-${label}`}
                    className="flex items-center gap-1 rounded-md border border-border-subtle px-2 py-1 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={restWeekdays.includes(i)}
                      onChange={() => toggleDow(i, restWeekdays, setRestWeekdays)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </fieldset>
        ) : null}

        {fieldError ? (
          <p className="text-sm text-status-danger" role="alert">
            {fieldError}
          </p>
        ) : null}

        {conflicts ? (
          <div className="space-y-2 rounded-md border border-status-warning bg-surface-secondary p-3" role="alert">
            <p className="text-sm font-medium">{t('conflictTitle')}</p>
            <ul className="max-h-40 list-disc overflow-auto ps-5 text-xs text-text-secondary">
              {conflicts.slice(0, 20).map((c) => (
                <li key={`${c.employeeId}_${c.workDate}`} dir="ltr">
                  {c.workDate} · {c.employeeId.slice(0, 8)}…
                  {c.existingDraftTipId ? ` · draft` : ''}
                  {c.existingPublishedId ? ` · published` : ''}
                </li>
              ))}
            </ul>
            {!canOverride ? (
              <p className="text-xs text-text-tertiary">{t('conflictNoOverride')}</p>
            ) : (
              <p className="text-xs text-text-tertiary">{t('conflictOverrideHint')}</p>
            )}
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
