'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/common/page-header';
import { LoadingSpinner } from '@/components/feedback/loading-spinner';
import { EmptyState } from '@/components/feedback/empty-state';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { SearchableSelect } from '@/components/common/searchable-select';
import { usePermissions } from '@/lib/permissions/use-permissions';
import { toApiError } from '@/lib/api/errors';
import { toast } from '@/lib/toast/store';
import { ROUTES } from '@/constants/routes.constants';
import { useEmployees } from '@/modules/employee/hooks/use-employees';
import { useDepartments } from '@/modules/organisation/hooks/use-departments';
import { useBranches } from '@/modules/organisation/hooks/use-branches';
import { useShifts } from '@/modules/shifts/hooks/use-shifts';
import {
  usePublishRoster,
  useRosters,
  useUpdateRosterAssignment,
} from '@/modules/shifts/hooks/use-rosters';
import {
  ROSTER_PERMISSIONS,
  ROSTER_UX_CALENDAR_PAGE_SIZE,
  SHIFT_PERMISSIONS,
} from '@/modules/shifts/constants/shift.constants';
import type {
  RosterAssignment,
  RosterCalendarView,
} from '@/modules/shifts/types/roster.types';
import {
  cellKey,
  formatShortDay,
  rangeForView,
  shiftAnchor,
  toIsoDate,
} from '@/modules/shifts/utils/roster-calendar';
import { isVersionConflict } from '@/modules/shifts/utils/shift-format';
import { RosterCell } from '@/modules/shifts/components/roster/roster-cell';
import { RosterAssignDialog } from '@/modules/shifts/components/roster/roster-assign-dialog';

type AssignMode = 'assign' | 'rest' | 'pattern';

export function RosterCalendarClient() {
  const t = useTranslations('roster');
  const locale = useLocale();
  const router = useRouter();
  const { hasPermission, status: authStatus } = usePermissions();

  const canRead = hasPermission(ROSTER_PERMISSIONS.READ);
  const canAssign = hasPermission(ROSTER_PERMISSIONS.ASSIGN);
  const canOverride = hasPermission(ROSTER_PERMISSIONS.OVERRIDE);
  const canPublish = hasPermission(ROSTER_PERMISSIONS.PUBLISH);
  const canShiftRead = hasPermission(SHIFT_PERMISSIONS.READ);

  const [view, setView] = useState<RosterCalendarView>('week');
  const [anchor, setAnchor] = useState(() => toIsoDate(new Date()));
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState<string | undefined>();
  const [branchId, setBranchId] = useState<string | undefined>();

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignMode, setAssignMode] = useState<AssignMode>('assign');
  const [assignDefaults, setAssignDefaults] = useState<{
    start: string;
    end: string;
    employeeIds?: string[];
  }>({ start: anchor, end: anchor });

  const [editTarget, setEditTarget] = useState<RosterAssignment | null>(null);
  const [editShiftId, setEditShiftId] = useState<string | undefined>();
  const [editRest, setEditRest] = useState(false);
  const [versionConflict, setVersionConflict] = useState(false);

  const [publishOpen, setPublishOpen] = useState(false);
  const [publishConfirmAttendance, setPublishConfirmAttendance] = useState(false);
  const [needsLockedOverride, setNeedsLockedOverride] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const range = useMemo(() => rangeForView(view, anchor), [view, anchor]);

  useEffect(() => {
    if (authStatus !== 'loading' && !canRead) {
      router.replace(ROUTES.AUTH.FORBIDDEN);
    }
  }, [authStatus, canRead, router]);

  const employeesQuery = useEmployees({
    page: 1,
    pageSize: 100,
    status: 'ACTIVE',
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(departmentId ? { departmentId } : {}),
    ...(branchId ? { branchId } : {}),
  });

  const employees = employeesQuery.data?.data ?? [];
  const employeeIds = useMemo(() => employees.map((e) => e.id), [employees]);

  const rosterParams = {
    dateFrom: range.dateFrom,
    dateTo: range.dateTo,
    page: 1,
    pageSize: ROSTER_UX_CALENDAR_PAGE_SIZE,
    ...(departmentId ? { departmentId } : {}),
    ...(branchId ? { branchId } : {}),
    ...(employeeIds.length && employeeIds.length <= 500
      ? { employeeIds }
      : {}),
  };

  const rosterQuery = useRosters(rosterParams, {
    enabled: canRead && !!range.dateFrom,
  });

  const departmentsQuery = useDepartments({ page: 1, pageSize: 100 });
  const branchesQuery = useBranches({ page: 1, pageSize: 100 });
  const shiftsQuery = useShifts(
    { page: 1, pageSize: 100, status: 'ACTIVE', sortBy: 'name' },
    // hook doesn't take options - always call
  );

  const cellIndex = useMemo(() => {
    const map = new Map<string, RosterAssignment>();
    for (const row of rosterQuery.data?.data ?? []) {
      // Prefer draft tip over effective published when both present for same key
      const key = cellKey(row.employeeId, row.workDate);
      const existing = map.get(key);
      if (!existing || row.isDraftTip) {
        map.set(key, row);
      }
    }
    return map;
  }, [rosterQuery.data?.data]);

  const updateMutation = useUpdateRosterAssignment(editTarget?.id ?? '');
  const publishMutation = usePublishRoster();

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
  const shiftOptions = useMemo(
    () =>
      (shiftsQuery.data?.data ?? []).map((s) => ({
        value: s.id,
        label: s.name,
        sublabel: `${s.code} · ${s.startLocalTime}–${s.endLocalTime}`,
      })),
    [shiftsQuery.data?.data],
  );

  function openAssign(mode: AssignMode, start?: string, employeeId?: string) {
    const day = start ?? range.dateFrom;
    setAssignMode(mode);
    setAssignDefaults({
      start: day,
      end: mode === 'pattern' ? range.dateTo : day,
      employeeIds: employeeId ? [employeeId] : undefined,
    });
    setAssignOpen(true);
  }

  function openCell(employeeId: string, workDate: string) {
    const existing = cellIndex.get(cellKey(employeeId, workDate));
    if (existing && (existing.isDraftTip || existing.rosterStatus === 'DRAFT')) {
      setEditTarget(existing);
      setEditRest(existing.isRestDay);
      setEditShiftId(existing.shiftId ?? undefined);
      setVersionConflict(false);
      return;
    }
    if (canAssign) {
      openAssign('assign', workDate, employeeId);
    }
  }

  async function saveEdit() {
    if (!editTarget) return;
    try {
      await updateMutation.mutateAsync({
        payload: editRest
          ? { isRestDay: true, shiftId: undefined }
          : { isRestDay: false, shiftId: editShiftId },
        ifMatch: editTarget.rowVersion,
      });
      toast.success(t('edit.success'));
      setEditTarget(null);
      void rosterQuery.refetch();
    } catch (err) {
      if (isVersionConflict(err)) {
        setVersionConflict(true);
        return;
      }
      toast.error(toApiError(err).message);
    }
  }

  async function runPublish(opts?: {
    confirmAttendanceImpact?: boolean;
    overrideLocked?: boolean;
  }) {
    setPublishError(null);
    try {
      const result = await publishMutation.mutateAsync({
        dateFrom: range.dateFrom,
        dateTo: range.dateTo,
        ...(departmentId ? { departmentId } : {}),
        ...(branchId ? { branchId } : {}),
        ...(opts?.confirmAttendanceImpact || publishConfirmAttendance
          ? { confirmAttendanceImpact: true }
          : {}),
        ...(opts?.overrideLocked ? { overrideLocked: true } : {}),
      });
      toast.success(
        t('publish.success', { count: result.data?.rowsPublished ?? 0 }),
      );
      setPublishOpen(false);
      setPublishConfirmAttendance(false);
      setNeedsLockedOverride(false);
      void rosterQuery.refetch();
    } catch (err) {
      const api = toApiError(err);
      if (api.code === 'ROSTER_ATTENDANCE_CONFIRM_REQUIRED') {
        setPublishConfirmAttendance(true);
        setPublishError(t('publish.confirmAttendance'));
        return;
      }
      if (api.code === 'ROSTER_ATTENDANCE_LOCKED') {
        setNeedsLockedOverride(true);
        setPublishError(
          canOverride
            ? t('publish.lockedOverride')
            : t('publish.lockedDenied'),
        );
        return;
      }
      setPublishError(api.message);
    }
  }

  const truncated =
    (rosterQuery.data?.meta?.total ?? 0) > ROSTER_UX_CALENDAR_PAGE_SIZE;

  if (authStatus === 'loading' || !canRead) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <div className="flex flex-wrap gap-2">
            {canAssign ? (
              <>
                <Button size="sm" variant="secondary" onClick={() => openAssign('assign')}>
                  {t('actions.assign')}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => openAssign('rest')}>
                  {t('actions.rest')}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => openAssign('pattern')}>
                  {t('actions.applyPattern')}
                </Button>
              </>
            ) : null}
            <Button
              size="sm"
              variant="secondary"
              disabled
              title={t('actions.copyWeekDeferred')}
              aria-disabled="true"
            >
              {t('actions.copyWeek')}
            </Button>
            {canPublish ? (
              <Button size="sm" onClick={() => setPublishOpen(true)}>
                {t('actions.publish')}
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border-subtle bg-surface-primary p-3">
        <div className="flex gap-1" role="group" aria-label={t('views.label')}>
          {(['day', 'week', 'month'] as const).map((v) => (
            <Button
              key={v}
              size="sm"
              variant={view === v ? 'primary' : 'secondary'}
              onClick={() => setView(v)}
              aria-pressed={view === v}
            >
              {t(`views.${v}`)}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setAnchor(shiftAnchor(view, anchor, -1))}
            aria-label={t('nav.prev')}
          >
            ‹
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setAnchor(toIsoDate(new Date()))}
          >
            {t('nav.today')}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setAnchor(shiftAnchor(view, anchor, 1))}
            aria-label={t('nav.next')}
          >
            ›
          </Button>
        </div>
        <p className="text-sm font-medium text-text-primary" dir="ltr">
          {range.dateFrom}
          {range.dateFrom !== range.dateTo ? ` → ${range.dateTo}` : ''}
        </p>
        <div className="min-w-[12rem] flex-1">
          <label className="sr-only" htmlFor="roster-search">
            {t('filters.search')}
          </label>
          <input
            id="roster-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('filters.search')}
            className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-sm"
          />
        </div>
        <div className="min-w-[10rem]">
          <SearchableSelect
            options={departmentOptions}
            value={departmentId}
            onChange={setDepartmentId}
            placeholder={t('filters.department')}
          />
        </div>
        <div className="min-w-[10rem]">
          <SearchableSelect
            options={branchOptions}
            value={branchId}
            onChange={setBranchId}
            placeholder={t('filters.branch')}
          />
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            void employeesQuery.refetch();
            void rosterQuery.refetch();
          }}
        >
          {t('actions.refresh')}
        </Button>
      </div>

      {canShiftRead ? (
        <div className="flex flex-wrap gap-2 text-xs text-text-secondary" aria-label={t('legend.label')}>
          <span className="font-medium">{t('legend.label')}:</span>
          {(shiftsQuery.data?.data ?? []).slice(0, 12).map((s) => (
            <span
              key={s.id}
              className="rounded-md border border-border-subtle px-2 py-1"
              dir="ltr"
            >
              {s.code} {s.startLocalTime}–{s.endLocalTime}
            </span>
          ))}
          <span className="rounded-md border border-dashed border-border-subtle px-2 py-1">
            {t('legend.rest')}
          </span>
          <span className="rounded-md border border-border-default bg-surface-secondary px-2 py-1">
            {t('legend.draft')}
          </span>
          <span className="rounded-md border border-border-subtle px-2 py-1">
            {t('legend.published')}
          </span>
        </div>
      ) : null}

      {truncated ? (
        <p className="text-sm text-status-warning" role="status">
          {t('truncated')}
        </p>
      ) : null}

      {rosterQuery.isLoading || employeesQuery.isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : rosterQuery.isError ? (
        <EmptyState
          title={t('error.title')}
          description={toApiError(rosterQuery.error).message}
          action={
            <Button onClick={() => void rosterQuery.refetch()}>{t('actions.retry')}</Button>
          }
        />
      ) : employees.length === 0 ? (
        <EmptyState title={t('empty.employees')} description={t('empty.employeesHint')} />
      ) : (
        <>
          {/* Desktop / tablet grid */}
          <div className="hidden overflow-x-auto rounded-lg border border-border-subtle md:block">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-surface-secondary">
                  <th
                    scope="col"
                    className="sticky start-0 z-10 min-w-[12rem] border-b border-border-subtle bg-surface-secondary px-3 py-2 text-start"
                  >
                    {t('grid.employee')}
                  </th>
                  {range.days.map((day) => (
                    <th
                      key={day}
                      scope="col"
                      className="min-w-[8.5rem] border-b border-s border-border-subtle px-2 py-2 text-start font-medium"
                      dir="ltr"
                    >
                      {formatShortDay(day, locale)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} className="align-top">
                    <th
                      scope="row"
                      className="sticky start-0 z-10 border-b border-border-subtle bg-surface-primary px-3 py-2 text-start"
                    >
                      <div className="font-medium text-text-primary">{emp.displayName}</div>
                      <div className="text-xs text-text-tertiary" dir="ltr">
                        {emp.employeeNumber}
                      </div>
                    </th>
                    {range.days.map((day) => {
                      const assignment = cellIndex.get(cellKey(emp.id, day));
                      return (
                        <td key={day} className="border-b border-s border-border-subtle p-1">
                          <RosterCell
                            assignment={assignment}
                            canAssign={canAssign}
                            dateLabel={day}
                            employeeLabel={emp.displayName}
                            onOpen={() => openCell(emp.id, day)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile list alternative */}
          <div className="space-y-3 md:hidden">
            {employees.map((emp) => (
              <section
                key={emp.id}
                className="rounded-lg border border-border-subtle bg-surface-primary p-3"
                aria-label={emp.displayName}
              >
                <h3 className="mb-2 font-medium">
                  {emp.displayName}{' '}
                  <span className="text-xs text-text-tertiary" dir="ltr">
                    ({emp.employeeNumber})
                  </span>
                </h3>
                <ul className="space-y-2">
                  {range.days.map((day) => {
                    const assignment = cellIndex.get(cellKey(emp.id, day));
                    return (
                      <li key={day} className="flex gap-2">
                        <span className="w-24 shrink-0 text-xs text-text-tertiary" dir="ltr">
                          {formatShortDay(day, locale)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <RosterCell
                            assignment={assignment}
                            canAssign={canAssign}
                            dateLabel={day}
                            employeeLabel={emp.displayName}
                            onOpen={() => openCell(emp.id, day)}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}

      <RosterAssignDialog
        key={`${assignMode}-${assignDefaults.start}-${assignOpen}`}
        open={assignOpen}
        onOpenChange={setAssignOpen}
        mode={assignMode}
        defaultStartDate={assignDefaults.start}
        defaultEndDate={assignDefaults.end}
        defaultEmployeeIds={assignDefaults.employeeIds}
        onSuccess={() => {
          toast.success(t('assign.success'));
          void rosterQuery.refetch();
        }}
      />

      <Dialog
        open={!!editTarget}
        onOpenChange={(o) => {
          if (!o) setEditTarget(null);
        }}
        title={t('edit.title')}
        description={t('edit.description')}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditTarget(null)}>
              {t('edit.cancel')}
            </Button>
            <Button
              isLoading={updateMutation.isPending}
              onClick={() => void saveEdit()}
              disabled={!canAssign}
            >
              {t('edit.save')}
            </Button>
          </div>
        }
      >
        <div className="space-y-3 p-4">
          <p className="text-sm text-text-secondary" dir="ltr">
            {editTarget?.workDate} · {editTarget?.employeeName}
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={editRest}
              onChange={(e) => setEditRest(e.target.checked)}
            />
            {t('edit.restDay')}
          </label>
          {!editRest ? (
            <SearchableSelect
              options={shiftOptions}
              value={editShiftId}
              onChange={setEditShiftId}
              placeholder={t('assign.selectShift')}
            />
          ) : null}
        </div>
      </Dialog>

      <Dialog
        open={versionConflict}
        onOpenChange={setVersionConflict}
        title={t('conflict.staleTitle')}
        description={t('conflict.staleBody')}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setVersionConflict(false);
                setEditTarget(null);
              }}
            >
              {t('conflict.cancel')}
            </Button>
            <Button
              onClick={() => {
                setVersionConflict(false);
                setEditTarget(null);
                void rosterQuery.refetch();
              }}
            >
              {t('conflict.reload')}
            </Button>
          </div>
        }
      />

      <Dialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        title={t('publish.title')}
        description={t('publish.description', {
          from: range.dateFrom,
          to: range.dateTo,
        })}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={() => setPublishOpen(false)}>
              {t('publish.cancel')}
            </Button>
            {needsLockedOverride && canOverride ? (
              <Button
                variant="danger"
                isLoading={publishMutation.isPending}
                onClick={() => {
                  void runPublish({
                    confirmAttendanceImpact: true,
                    overrideLocked: true,
                  });
                }}
              >
                {t('publish.overrideLocked')}
              </Button>
            ) : null}
            {publishConfirmAttendance ? (
              <Button
                isLoading={publishMutation.isPending}
                onClick={() =>
                  void runPublish({ confirmAttendanceImpact: true })
                }
              >
                {t('publish.confirmAndPublish')}
              </Button>
            ) : (
              <Button
                isLoading={publishMutation.isPending}
                onClick={() => void runPublish()}
              >
                {t('publish.submit')}
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-2 p-4 text-sm">
          <p>{t('publish.noRecalc')}</p>
          {publishError ? (
            <p className="text-status-danger" role="alert">
              {publishError}
            </p>
          ) : null}
        </div>
      </Dialog>
    </div>
  );
}
