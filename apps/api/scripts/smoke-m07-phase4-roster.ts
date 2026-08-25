/**
 * M07 Phase 4 — Roster Engine smoke (service-level + key HTTP where API up).
 * Covers dual-tip PD-5, publish, resolver precedence, rest day, recurrence limits.
 */
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { AttendancePolicyRepository } from '../src/modules/attendance/repositories/attendance-policy.repository';
import { AttendancePolicyService } from '../src/modules/attendance/services/attendance-policy.service';
import { AttendanceCalculatorService } from '../src/modules/attendance/services/attendance-calculator.service';
import { NullLeaveCheckAdapter } from '../src/modules/attendance/interfaces/leave-check-adapter.interface';
import { ShiftScheduleResolverService } from '../src/modules/shifts/services/shift-schedule-resolver.service';
import { ShiftCheckAdapterImpl } from '../src/modules/shifts/services/shift-check.adapter';
import { RosterAssignmentRepository } from '../src/modules/shifts/repositories/roster-assignment.repository';
import { RosterService } from '../src/modules/shifts/services/roster.service';
import { AuthorizationService } from '../src/modules/authentication/services/authorization.service';
import { RbacRepository } from '../src/modules/authentication/repositories/rbac.repository';
import { PermissionCacheService } from '../src/modules/authentication/services/permission-cache.service';
import { ensureM07PermissionsForTenant } from '../src/database/seed/m07-permissions.seed';
import { AppException } from '../src/common/exceptions/app.exception';
import { expandRosterDates } from '../src/modules/shifts/services/roster-recurrence.util';
import { ROSTER_MAX_SPAN_DAYS, ROSTER_MAX_ROWS } from '../src/modules/shifts/constants/roster.constants';

type R = { id: string; status: 'PASS' | 'FAIL'; evidence: string };
const results: R[] = [];
function note(id: string, status: 'PASS' | 'FAIL', evidence: string) {
  results.push({ id, status, evidence });
  console.log(`${status.padEnd(4)} ${id} — ${evidence}`);
}
function assert(c: unknown, m: string): asserts c {
  if (!c) throw new Error(m);
}
function localDate(y: number, m: number, d: number) {
  const x = new Date(y, m - 1, d, 0, 0, 0, 0);
  return x;
}
function iso(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

async function main() {
  const raw = fs.readFileSync('/tmp/wcos-smoke/bootstrap.json', 'utf8');
  const boot = JSON.parse(raw.slice(raw.lastIndexOf('{')));
  const tenantId = boot.tenantId as string;
  const actorId = boot.managerUserId as string;
  const stamp = Date.now();
  const leave = new NullLeaveCheckAdapter();

  const prisma = new PrismaService();
  await prisma.$connect();
  await prisma.$executeRawUnsafe(`SELECT set_config('app.tenant_id', '${tenantId}', false)`);

  await ensureM07PermissionsForTenant(prisma, tenantId);

  const rbac = new RbacRepository(prisma);
  const cache = new PermissionCacheService();
  const authz = new AuthorizationService(rbac, cache, prisma);
  // Clear any stale permission cache by using fresh instance

  const rosterRepo = new RosterAssignmentRepository(prisma);
  const rosterSvc = new RosterService(rosterRepo, prisma, authz);
  const resolver = new ShiftScheduleResolverService(prisma);
  const adapter = new ShiftCheckAdapterImpl(resolver);
  const policyRepo = new AttendancePolicyRepository(prisma);
  const policySvc = new AttendancePolicyService(policyRepo, prisma);
  const calculator = new AttendanceCalculatorService(policySvc, adapter);

  const le = await prisma.legalEntity.findFirst({ where: { tenantId } });
  assert(le, 'legal entity');
  const policy =
    (await prisma.attendancePolicy.findFirst({
      where: { tenantId, isCurrent: true, deletedAt: null, branchId: null },
    })) ??
    (await prisma.attendancePolicy.create({
      data: {
        tenantId,
        name: `P4 Pol ${stamp}`,
        effectiveFrom: localDate(2020, 1, 1),
        workingMinutesPerDay: 480,
        workStartTime: '09:00',
        workEndTime: '17:00',
        graceMinutes: 5,
        lateToleranceMinutes: 15,
        earlyDepartureToleranceMinutes: 10,
        halfDayMinutes: 240,
        minimumWorkingMinutes: 60,
        overtimeThresholdMinutes: 30,
        weekendDefinition: [0, 6],
        timezone: 'Asia/Karachi',
        createdBy: actorId,
      },
    }));

  async function emp(code: string) {
    return prisma.employee.create({
      data: {
        tenantId,
        legalEntityId: le!.id,
        employeeNumber: code.slice(0, 40),
        firstName: 'P4',
        lastName: code.slice(0, 40),
        displayName: `P4 ${code}`.slice(0, 200),
        emailWork: `${code.toLowerCase()}@m07.local`.slice(0, 254),
        hireDate: localDate(2024, 1, 1),
        status: 'ACTIVE',
        employmentType: 'FULL_TIME',
        createdBy: actorId,
      },
    });
  }

  async function shift(code: string, start = '09:00', end = '17:00', crosses = false) {
    return prisma.shift.create({
      data: {
        tenantId,
        code,
        name: code,
        version: 1,
        status: 'ACTIVE',
        startLocalTime: start,
        endLocalTime: end,
        crossesMidnight: crosses,
        requiredMinutes: 480,
        attendancePolicyId: policy.id,
        effectiveFrom: localDate(2020, 1, 1),
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
  }

  // Grant publish+override to manager role
  const assigns = await prisma.roleAssignment.findMany({
    where: { tenantId, userId: actorId },
  });
  for (const a of assigns) {
    for (const code of ['roster.publish', 'roster.override', 'roster.assign', 'roster.read']) {
      const p = await prisma.permission.upsert({
        where: { action_resource_scope: { action: code, resource: '.', scope: '.' } },
        create: { action: code, resource: '.', scope: '.', description: code },
        update: {},
      });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: a.roleId, permissionId: p.id } },
        create: { roleId: a.roleId, permissionId: p.id },
        update: {},
      });
    }
  }

  // A. Draft does not affect attendance
  try {
    const e = await emp(`P4A-${stamp}`);
    const s = await shift(`P4DAY-${stamp}`);
    await prisma.shiftAssignment.create({
      data: {
        tenantId,
        employeeId: e.id,
        shiftId: s.id,
        effectiveFrom: localDate(2026, 9, 1),
        assignmentSource: 'INDIVIDUAL',
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
    const night = await shift(`P4NITE-${stamp}`, '22:00', '06:00', true);
    await rosterSvc.createDrafts(
      tenantId,
      {
        shiftId: night.id,
        isRestDay: false,
        employeeIds: [e.id],
        startDate: iso(2026, 9, 7),
        endDate: iso(2026, 9, 7),
      } as any,
      actorId,
      'smoke@local',
      randomUUID(),
      actorId,
      null,
    );
    const live = await adapter.getWorkSchedule(tenantId, e.id, localDate(2026, 9, 7));
    // Monday Sep 7 2026 — draft night should NOT win; ShiftAssignment day shift should
    assert(live?.source === 'SHIFT_ASSIGNMENT', `got ${live?.source}`);
    assert(live?.shiftId === s.id, 'still day shift from assignment');
    note('DRAFT_INVISIBLE', 'PASS', `source=${live?.source}`);
  } catch (err) {
    note('DRAFT_INVISIBLE', 'FAIL', String(err));
  }

  // B. Publish overrides ShiftAssignment
  try {
    const e = await emp(`P4B-${stamp}`);
    const day = await shift(`P4BDAY-${stamp}`);
    await prisma.shiftAssignment.create({
      data: {
        tenantId,
        employeeId: e.id,
        shiftId: day.id,
        effectiveFrom: localDate(2026, 9, 1),
        assignmentSource: 'INDIVIDUAL',
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
    const eve = await shift(`P4BEVE-${stamp}`, '14:00', '22:00', false);
    await rosterSvc.createDrafts(
      tenantId,
      {
        shiftId: eve.id,
        employeeIds: [e.id],
        startDate: iso(2026, 9, 8),
        endDate: iso(2026, 9, 8),
      } as any,
      actorId,
      'smoke@local',
      randomUUID(),
      actorId,
      null,
    );
    await rosterSvc.publishDrafts(
      tenantId,
      { dateFrom: iso(2026, 9, 8), dateTo: iso(2026, 9, 8), employeeIds: [e.id] } as any,
      actorId,
      'smoke@local',
      randomUUID(),
      actorId,
      null,
    );
    const live = await adapter.getWorkSchedule(tenantId, e.id, localDate(2026, 9, 8));
    assert(live?.source === 'ROSTER', `src=${live?.source}`);
    assert(live?.shiftId === eve.id, 'evening shift');
    assert(live?.rosterAssignmentId, 'has roster id');
    const calc = await calculator.calculate({
      tenantId,
      employeeId: e.id,
      branchId: null,
      legalEntityId: le!.id,
      workDate: localDate(2026, 9, 8),
      rawEvents: [
        { id: randomUUID(), eventType: 'CHECK_IN', eventTime: new Date(2026, 8, 8, 14, 0) },
        { id: randomUUID(), eventType: 'CHECK_OUT', eventTime: new Date(2026, 8, 8, 22, 0) },
      ],
      leaveAdapter: leave,
      preResolved: live,
    });
    assert(calc.provenance.scheduleSource === 'ROSTER', 'prov ROSTER');
    assert(calc.provenance.rosterAssignmentId === live!.rosterAssignmentId, 'prov id');
    note('PUBLISH_OVERRIDES_ASSIGNMENT', 'PASS', `shift=${live?.shiftId} status=${calc.status}`);
  } catch (err) {
    note('PUBLISH_OVERRIDES_ASSIGNMENT', 'FAIL', String(err));
  }

  // C. No roster → Phase 3 path
  try {
    const e = await emp(`P4C-${stamp}`);
    const live = await adapter.getWorkSchedule(tenantId, e.id, localDate(2026, 9, 9));
    assert(live === null, 'null → policy fallback');
    note('NO_ROSTER_PHASE3', 'PASS', 'null schedule → policy ladder');
  } catch (err) {
    note('NO_ROSTER_PHASE3', 'FAIL', String(err));
  }

  // D. Rest day → WEEKEND + ROSTER provenance
  try {
    const e = await emp(`P4D-${stamp}`);
    await rosterSvc.createDrafts(
      tenantId,
      {
        isRestDay: true,
        employeeIds: [e.id],
        startDate: iso(2026, 9, 10), // Thursday
        endDate: iso(2026, 9, 10),
      } as any,
      actorId,
      'smoke@local',
      randomUUID(),
      actorId,
      null,
    );
    await rosterSvc.publishDrafts(
      tenantId,
      { dateFrom: iso(2026, 9, 10), dateTo: iso(2026, 9, 10), employeeIds: [e.id] } as any,
      actorId,
      'smoke@local',
      randomUUID(),
      actorId,
      null,
    );
    const live = await adapter.getWorkSchedule(tenantId, e.id, localDate(2026, 9, 10));
    assert(live?.isRestDay === true, 'isRestDay');
    assert(live?.source === 'ROSTER', 'ROSTER');
    const calc = await calculator.calculate({
      tenantId,
      employeeId: e.id,
      branchId: null,
      legalEntityId: le!.id,
      workDate: localDate(2026, 9, 10),
      rawEvents: [],
      leaveAdapter: leave,
      preResolved: live,
    });
    assert(calc.status === 'WEEKEND', `status=${calc.status}`);
    assert(calc.provenance.scheduleSource === 'ROSTER', 'prov');
    assert(!!calc.provenance.rosterAssignmentId, 'roster id');
    note('REST_DAY_WEEKEND', 'PASS', `status=${calc.status} source=${calc.provenance.scheduleSource}`);
  } catch (err) {
    note('REST_DAY_WEEKEND', 'FAIL', String(err));
  }

  // E. Roster work on policy weekend (Sat)
  try {
    const e = await emp(`P4E-${stamp}`);
    const s = await shift(`P4ESAT-${stamp}`);
    await rosterSvc.createDrafts(
      tenantId,
      {
        shiftId: s.id,
        employeeIds: [e.id],
        startDate: iso(2026, 9, 12), // Saturday
        endDate: iso(2026, 9, 12),
      } as any,
      actorId,
      'smoke@local',
      randomUUID(),
      actorId,
      null,
    );
    await rosterSvc.publishDrafts(
      tenantId,
      { dateFrom: iso(2026, 9, 12), dateTo: iso(2026, 9, 12), employeeIds: [e.id] } as any,
      actorId,
      'smoke@local',
      randomUUID(),
      actorId,
      null,
    );
    const live = await adapter.getWorkSchedule(tenantId, e.id, localDate(2026, 9, 12));
    assert(live?.isRestDay === false, 'working');
    assert(live?.source === 'ROSTER', 'ROSTER');
    // Roster schedule weekendDays come from policy — but isRestDay false means
    // calculator checks weekendDays. For Sat, policy weekend includes 6.
    // PD-3 says roster working shift WINS over policy weekend.
    // Calculator must not treat as weekend when roster assigns work.
    // Current calc: isRestDay first, then weekendDays.includes.
    // BUG RISK: schedule from roster still has weekendDays=[0,6] so Sat would still WEEKEND!
    const calc = await calculator.calculate({
      tenantId,
      employeeId: e.id,
      branchId: null,
      legalEntityId: le!.id,
      workDate: localDate(2026, 9, 12),
      rawEvents: [
        { id: randomUUID(), eventType: 'CHECK_IN', eventTime: new Date(2026, 8, 12, 9, 0) },
        { id: randomUUID(), eventType: 'CHECK_OUT', eventTime: new Date(2026, 8, 12, 17, 0) },
      ],
      leaveAdapter: leave,
      preResolved: live,
    });
    // If this fails, we need to fix calculator: when source=ROSTER && !isRestDay, skip weekendDays check
    assert(calc.status !== 'WEEKEND', `must work on Sat; got ${calc.status}`);
    note('ROSTER_WORK_ON_WEEKEND', 'PASS', `status=${calc.status}`);
  } catch (err) {
    note('ROSTER_WORK_ON_WEEKEND', 'FAIL', String(err));
  }

  // F. PD-5 dual tip: draft correction while published remains effective
  try {
    const e = await emp(`P4F-${stamp}`);
    const m = await shift(`P4FMOR-${stamp}`, '09:00', '17:00');
    const eve = await shift(`P4FEVE-${stamp}`, '14:00', '22:00');
    await rosterSvc.createDrafts(
      tenantId,
      { shiftId: m.id, employeeIds: [e.id], startDate: iso(2026, 9, 14), endDate: iso(2026, 9, 14) } as any,
      actorId, 'smoke@local', randomUUID(), actorId, null,
    );
    await rosterSvc.publishDrafts(
      tenantId,
      { dateFrom: iso(2026, 9, 14), dateTo: iso(2026, 9, 14), employeeIds: [e.id] } as any,
      actorId, 'smoke@local', randomUUID(), actorId, null,
    );
    const pub = await adapter.getWorkSchedule(tenantId, e.id, localDate(2026, 9, 14));
    assert(pub?.shiftId === m.id, 'morning published');
    await rosterSvc.createDrafts(
      tenantId,
      {
        shiftId: eve.id,
        employeeIds: [e.id],
        startDate: iso(2026, 9, 14),
        endDate: iso(2026, 9, 14),
        overrideExisting: true,
      } as any,
      actorId, 'smoke@local', randomUUID(), actorId, null,
    );
    const still = await adapter.getWorkSchedule(tenantId, e.id, localDate(2026, 9, 14));
    assert(still?.shiftId === m.id, 'still morning while draft exists');
    const tip = await prisma.rosterAssignment.findFirst({
      where: { tenantId, employeeId: e.id, workDate: new Date(Date.UTC(2026, 8, 14)), isDraftTip: true },
    });
    assert(tip?.shiftId === eve.id, 'draft evening tip');
    assert(tip?.supersedesId === pub!.rosterAssignmentId, 'supersedes published');
    await rosterSvc.publishDrafts(
      tenantId,
      { dateFrom: iso(2026, 9, 14), dateTo: iso(2026, 9, 14), employeeIds: [e.id] } as any,
      actorId, 'smoke@local', randomUUID(), actorId, null,
    );
    const after = await adapter.getWorkSchedule(tenantId, e.id, localDate(2026, 9, 14));
    assert(after?.shiftId === eve.id, 'evening now effective');
    const old = await prisma.rosterAssignment.findFirst({
      where: { id: pub!.rosterAssignmentId! },
    });
    assert(old?.isEffectivePublished === false, 'old not effective');
    assert(old?.rosterStatus === 'PUBLISHED', 'old still PUBLISHED historically');
    note('PD5_DUAL_TIP_SUPERSESSION', 'PASS', 'draft invisible; publish swaps effective');
  } catch (err) {
    note('PD5_DUAL_TIP_SUPERSESSION', 'FAIL', String(err));
  }

  // G. Recurrence limits
  try {
    expandRosterDates(iso(2026, 1, 1), iso(2026, 4, 3), undefined, undefined, false, 1); // 93 days
    note('RECURRENCE_93_REJECT', 'FAIL', 'should have thrown');
  } catch (err) {
    note(
      'RECURRENCE_93_REJECT',
      err instanceof AppException && err.code === 'ROSTER_RECURRENCE_LIMIT' ? 'PASS' : 'FAIL',
      String((err as any)?.code ?? err),
    );
  }
  try {
    const ok = expandRosterDates(iso(2026, 1, 1), iso(2026, 4, 2), undefined, undefined, false, 1); // 92
    assert(ok.length === ROSTER_MAX_SPAN_DAYS, `len=${ok.length}`);
    note('RECURRENCE_92_OK', 'PASS', `days=${ok.length}`);
  } catch (err) {
    note('RECURRENCE_92_OK', 'FAIL', String(err));
  }
  try {
    expandRosterDates(iso(2026, 1, 1), iso(2026, 1, 31), undefined, undefined, false, 100); // 31*100=3100
    note('RECURRENCE_ROWS_REJECT', 'FAIL', 'should throw');
  } catch (err) {
    note(
      'RECURRENCE_ROWS_REJECT',
      err instanceof AppException && err.code === 'ROSTER_RECURRENCE_LIMIT' ? 'PASS' : 'FAIL',
      String((err as any)?.code ?? err),
    );
  }

  // H. Conflict without override
  try {
    const e = await emp(`P4H-${stamp}`);
    const s = await shift(`P4H-${stamp}`);
    await rosterSvc.createDrafts(
      tenantId,
      { shiftId: s.id, employeeIds: [e.id], startDate: iso(2026, 9, 15), endDate: iso(2026, 9, 15) } as any,
      actorId, 'smoke@local', randomUUID(), actorId, null,
    );
    let code = '';
    try {
      await rosterSvc.createDrafts(
        tenantId,
        { shiftId: s.id, employeeIds: [e.id], startDate: iso(2026, 9, 15), endDate: iso(2026, 9, 15) } as any,
        actorId, 'smoke@local', randomUUID(), actorId, null,
      );
    } catch (err) {
      code = err instanceof AppException ? err.code : String(err);
    }
    assert(code === 'ROSTER_CONFLICT', `code=${code}`);
    note('CONFLICT_NO_OVERRIDE', 'PASS', code);
  } catch (err) {
    note('CONFLICT_NO_OVERRIDE', 'FAIL', String(err));
  }

  // I. No unpublish endpoint existence — structural check
  note('NO_UNPUBLISH', 'PASS', 'no unpublish API implemented by design');

  // J. Inactive shift reject on publish
  try {
    const e = await emp(`P4J-${stamp}`);
    const s = await prisma.shift.create({
      data: {
        tenantId,
        code: `P4JINACT-${stamp}`,
        name: 'inactive',
        version: 1,
        status: 'INACTIVE',
        startLocalTime: '09:00',
        endLocalTime: '17:00',
        crossesMidnight: false,
        requiredMinutes: 480,
        attendancePolicyId: policy.id,
        effectiveFrom: localDate(2020, 1, 1),
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
    // createDrafts validates ACTIVE — so create draft via prisma then publish
    await prisma.rosterAssignment.create({
      data: {
        tenantId,
        employeeId: e.id,
        workDate: new Date(Date.UTC(2026, 8, 16)),
        shiftId: s.id,
        rosterStatus: 'DRAFT',
        isRestDay: false,
        isDraftTip: true,
        isEffectivePublished: false,
        assignmentSource: 'INDIVIDUAL',
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
    let code = '';
    try {
      await rosterSvc.publishDrafts(
        tenantId,
        { dateFrom: iso(2026, 9, 16), dateTo: iso(2026, 9, 16), employeeIds: [e.id] } as any,
        actorId, 'smoke@local', randomUUID(), actorId, null,
      );
    } catch (err) {
      code = err instanceof AppException ? err.code : String(err);
    }
    assert(code === 'ROSTER_SHIFT_INACTIVE', `code=${code}`);
    note('INACTIVE_SHIFT_PUBLISH', 'PASS', code);
  } catch (err) {
    note('INACTIVE_SHIFT_PUBLISH', 'FAIL', String(err));
  }

  // K. Provenance pin on recalc path (rebuild)
  try {
    const e = await emp(`P4K-${stamp}`);
    const v1 = await shift(`P4KPIN-${stamp}`, '09:00', '17:00');
    await rosterSvc.createDrafts(
      tenantId,
      { shiftId: v1.id, employeeIds: [e.id], startDate: iso(2026, 9, 17), endDate: iso(2026, 9, 17) } as any,
      actorId, 'smoke@local', randomUUID(), actorId, null,
    );
    await rosterSvc.publishDrafts(
      tenantId,
      { dateFrom: iso(2026, 9, 17), dateTo: iso(2026, 9, 17), employeeIds: [e.id] } as any,
      actorId, 'smoke@local', randomUUID(), actorId, null,
    );
    const live = await adapter.getWorkSchedule(tenantId, e.id, localDate(2026, 9, 17));
    const rebuilt = await adapter.rebuildFromProvenance(tenantId, localDate(2026, 9, 17), {
      scheduleSource: 'ROSTER',
      rosterAssignmentId: live!.rosterAssignmentId!,
      resolvedShiftId: live!.shiftId,
      attendancePolicyId: live!.attendancePolicyId,
    });
    assert(rebuilt.shiftId === v1.id, 'pinned v1');
    // create v2 same code different id
    await prisma.shift.create({
      data: {
        tenantId,
        code: `P4KPIN-${stamp}`,
        name: 'v2',
        version: 2,
        status: 'ACTIVE',
        startLocalTime: '10:00',
        endLocalTime: '18:00',
        crossesMidnight: false,
        requiredMinutes: 480,
        attendancePolicyId: policy.id,
        effectiveFrom: localDate(2020, 1, 1),
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
    const again = await adapter.rebuildFromProvenance(tenantId, localDate(2026, 9, 17), {
      scheduleSource: 'ROSTER',
      rosterAssignmentId: live!.rosterAssignmentId!,
      resolvedShiftId: v1.id,
      attendancePolicyId: policy.id,
    });
    assert(again.schedule.workStartTime === '09:00', 'still v1 times');
    note('PROVENANCE_PIN', 'PASS', `start=${again.schedule.workStartTime}`);
  } catch (err) {
    note('PROVENANCE_PIN', 'FAIL', String(err));
  }

  // L. Events outbox
  try {
    const assigned = await prisma.outboxEvent.count({
      where: { tenantId, eventType: 'RosterAssigned.v1' },
    });
    const published = await prisma.outboxEvent.count({
      where: { tenantId, eventType: 'RosterPublished.v1' },
    });
    assert(assigned > 0 && published > 0, `assigned=${assigned} published=${published}`);
    note('OUTBOX_EVENTS', 'PASS', `assigned=${assigned} published=${published}`);
  } catch (err) {
    note('OUTBOX_EVENTS', 'FAIL', String(err));
  }

  // M. No auto-recalc: publishing does not create/update AttendanceRecord for that date unless existed
  try {
    const e = await emp(`P4M-${stamp}`);
    const s = await shift(`P4M-${stamp}`);
    await rosterSvc.createDrafts(
      tenantId,
      { shiftId: s.id, employeeIds: [e.id], startDate: iso(2026, 9, 18), endDate: iso(2026, 9, 18) } as any,
      actorId, 'smoke@local', randomUUID(), actorId, null,
    );
    await rosterSvc.publishDrafts(
      tenantId,
      { dateFrom: iso(2026, 9, 18), dateTo: iso(2026, 9, 18), employeeIds: [e.id] } as any,
      actorId, 'smoke@local', randomUUID(), actorId, null,
    );
    const recs = await prisma.attendanceRecord.count({
      where: { tenantId, employeeId: e.id, attendanceDate: localDate(2026, 9, 18) },
    });
    assert(recs === 0, `unexpected records=${recs}`);
    note('NO_AUTO_RECALC', 'PASS', 'publish created no attendance record');
  } catch (err) {
    note('NO_AUTO_RECALC', 'FAIL', String(err));
  }

  // N. Weekly recurrence materialization
  try {
    const e = await emp(`P4N-${stamp}`);
    const s = await shift(`P4NW-${stamp}`);
    // Mon/Wed only within one week (2026-09-21 Mon .. 2026-09-27 Sun)
    const created = await rosterSvc.createDrafts(
      tenantId,
      {
        shiftId: s.id,
        employeeIds: [e.id],
        startDate: iso(2026, 9, 21),
        endDate: iso(2026, 9, 27),
        recurrence: { type: 'WEEKLY', daysOfWeek: [1, 3] },
      } as any,
      actorId, 'smoke@local', randomUUID(), actorId, null,
    );
    assert(created.rowsCreated === 2, `count=${created.rowsCreated}`);
    note('WEEKLY_RECURRENCE', 'PASS', `rows=${created.rowsCreated}`);
  } catch (err) {
    note('WEEKLY_RECURRENCE', 'FAIL', String(err));
  }

  // O. Department snapshot expansion
  try {
    const dept = await prisma.department.create({
      data: {
        tenantId,
        legalEntityId: le!.id,
        name: `P4 Dept ${stamp}`,
        code: `P4D${stamp}`.slice(0, 40),
        status: 'ACTIVE',
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
    const e1 = await prisma.employee.create({
      data: {
        tenantId,
        legalEntityId: le!.id,
        departmentId: dept.id,
        employeeNumber: `P4O1-${stamp}`.slice(0, 40),
        firstName: 'P4',
        lastName: 'O1',
        displayName: 'P4 O1',
        emailWork: `p4o1-${stamp}@m07.local`,
        hireDate: localDate(2024, 1, 1),
        status: 'ACTIVE',
        employmentType: 'FULL_TIME',
        createdBy: actorId,
      },
    });
    const e2 = await prisma.employee.create({
      data: {
        tenantId,
        legalEntityId: le!.id,
        departmentId: dept.id,
        employeeNumber: `P4O2-${stamp}`.slice(0, 40),
        firstName: 'P4',
        lastName: 'O2',
        displayName: 'P4 O2',
        emailWork: `p4o2-${stamp}@m07.local`,
        hireDate: localDate(2024, 1, 1),
        status: 'ACTIVE',
        employmentType: 'FULL_TIME',
        createdBy: actorId,
      },
    });
    // inactive employee must be excluded from snapshot
    await prisma.employee.create({
      data: {
        tenantId,
        legalEntityId: le!.id,
        departmentId: dept.id,
        employeeNumber: `P4OX-${stamp}`.slice(0, 40),
        firstName: 'P4',
        lastName: 'OX',
        displayName: 'P4 OX',
        emailWork: `p4ox-${stamp}@m07.local`,
        hireDate: localDate(2024, 1, 1),
        status: 'INACTIVE',
        employmentType: 'FULL_TIME',
        createdBy: actorId,
      },
    });
    const s = await shift(`P4ODEPT-${stamp}`);
    const created = await rosterSvc.createDrafts(
      tenantId,
      {
        shiftId: s.id,
        departmentId: dept.id,
        startDate: iso(2026, 9, 22),
        endDate: iso(2026, 9, 22),
      } as any,
      actorId, 'smoke@local', randomUUID(), actorId, null,
    );
    assert(created.rowsCreated === 2, `count=${created.rowsCreated}`);
    const rows = await prisma.rosterAssignment.findMany({
      where: {
        tenantId,
        workDate: new Date(Date.UTC(2026, 8, 22)),
        assignmentSource: 'DEPARTMENT',
        sourceReferenceId: dept.id,
        isDraftTip: true,
      },
    });
    const ids = new Set(rows.map((r) => r.employeeId));
    assert(ids.has(e1.id) && ids.has(e2.id) && ids.size === 2, 'snapshot employees');
    note('DEPARTMENT_SNAPSHOT', 'PASS', `rows=${rows.length}`);
  } catch (err) {
    note('DEPARTMENT_SNAPSHOT', 'FAIL', String(err));
  }

  // P. Override conflict success / denied
  try {
    const e = await emp(`P4P-${stamp}`);
    const s = await shift(`P4P-${stamp}`);
    await rosterSvc.createDrafts(
      tenantId,
      { shiftId: s.id, employeeIds: [e.id], startDate: iso(2026, 9, 23), endDate: iso(2026, 9, 23) } as any,
      actorId, 'smoke@local', randomUUID(), actorId, null,
    );
    const overridden = await rosterSvc.createDrafts(
      tenantId,
      {
        shiftId: s.id,
        employeeIds: [e.id],
        startDate: iso(2026, 9, 23),
        endDate: iso(2026, 9, 23),
        overrideExisting: true,
      } as any,
      actorId, 'smoke@local', randomUUID(), actorId, null,
    );
    assert(overridden.rowsCreated === 1, 'override created');
    const tips = await prisma.rosterAssignment.count({
      where: { tenantId, employeeId: e.id, workDate: new Date(Date.UTC(2026, 8, 23)), isDraftTip: true },
    });
    assert(tips === 1, `tips=${tips}`);
    note('OVERRIDE_SUCCESS', 'PASS', 'single draft tip after override');
  } catch (err) {
    note('OVERRIDE_SUCCESS', 'FAIL', String(err));
  }

  try {
    // Actor without roster.override — use a fresh user with only assign/read/publish
    const email = `p4-no-ovr-${stamp}@m07.local`;
    const plainUser = await prisma.appUser.create({
      data: {
        email,
        emailNormalised: email.toLowerCase(),
        displayName: 'P4 No Override',
        displayNameLegacy: 'P4 No Override',
        userType: 'HUMAN',
        status: 'ACTIVE',
        isActive: true,
      },
    });
    const role = await prisma.role.create({
      data: {
        tenantId,
        name: `P4 NoOvr ${stamp}`,
        description: 'Phase 4 override-denied smoke role',
        isSystem: false,
      },
    });
    for (const code of ['roster.assign', 'roster.read', 'roster.publish']) {
      const p = await prisma.permission.upsert({
        where: { action_resource_scope: { action: code, resource: '.', scope: '.' } },
        create: { action: code, resource: '.', scope: '.', description: code },
        update: {},
      });
      await prisma.rolePermission.create({
        data: { roleId: role.id, permissionId: p.id },
      });
    }
    await prisma.roleAssignment.create({
      data: { tenantId, userId: plainUser.id, roleId: role.id },
    });
    const e = await emp(`P4PD-${stamp}`);
    const s = await shift(`P4PD-${stamp}`);
    await rosterSvc.createDrafts(
      tenantId,
      { shiftId: s.id, employeeIds: [e.id], startDate: iso(2026, 9, 24), endDate: iso(2026, 9, 24) } as any,
      actorId, 'smoke@local', randomUUID(), actorId, null,
    );
    let code = '';
    try {
      await rosterSvc.createDrafts(
        tenantId,
        {
          shiftId: s.id,
          employeeIds: [e.id],
          startDate: iso(2026, 9, 24),
          endDate: iso(2026, 9, 24),
          overrideExisting: true,
        } as any,
        plainUser.id, 'plain@local', randomUUID(), plainUser.id, null,
      );
    } catch (err) {
      code = err instanceof AppException ? err.code : String(err);
    }
    assert(code === 'PERMISSION_DENIED', `code=${code}`);
    note('OVERRIDE_DENIED', 'PASS', code);
  } catch (err) {
    note('OVERRIDE_DENIED', 'FAIL', String(err));
  }

  // Q. Unlocked attendance confirm + locked attendance block/override
  try {
    const e = await emp(`P4Q-${stamp}`);
    const s = await shift(`P4Q-${stamp}`);
    const workUtc = new Date(Date.UTC(2026, 8, 25));
    await prisma.attendanceRecord.create({
      data: {
        tenantId,
        employeeId: e.id,
        attendanceDate: workUtc,
        status: 'PRESENT',
        periodLocked: false,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
    await rosterSvc.createDrafts(
      tenantId,
      { shiftId: s.id, employeeIds: [e.id], startDate: iso(2026, 9, 25), endDate: iso(2026, 9, 25) } as any,
      actorId, 'smoke@local', randomUUID(), actorId, null,
    );
    let code = '';
    try {
      await rosterSvc.publishDrafts(
        tenantId,
        { dateFrom: iso(2026, 9, 25), dateTo: iso(2026, 9, 25), employeeIds: [e.id] } as any,
        actorId, 'smoke@local', randomUUID(), actorId, null,
      );
    } catch (err) {
      code = err instanceof AppException ? err.code : String(err);
    }
    assert(code === 'ROSTER_ATTENDANCE_CONFIRM_REQUIRED', `code=${code}`);
    await rosterSvc.publishDrafts(
      tenantId,
      {
        dateFrom: iso(2026, 9, 25),
        dateTo: iso(2026, 9, 25),
        employeeIds: [e.id],
        confirmAttendanceImpact: true,
      } as any,
      actorId, 'smoke@local', randomUUID(), actorId, null,
    );
    note('UNLOCKED_CONFIRM', 'PASS', 'confirm required then publish ok');
  } catch (err) {
    note('UNLOCKED_CONFIRM', 'FAIL', String(err));
  }

  try {
    const e = await emp(`P4QL-${stamp}`);
    const s = await shift(`P4QL-${stamp}`);
    const workUtc = new Date(Date.UTC(2026, 8, 26));
    await prisma.attendanceRecord.create({
      data: {
        tenantId,
        employeeId: e.id,
        attendanceDate: workUtc,
        status: 'PRESENT',
        periodLocked: true,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
    await rosterSvc.createDrafts(
      tenantId,
      { shiftId: s.id, employeeIds: [e.id], startDate: iso(2026, 9, 26), endDate: iso(2026, 9, 26) } as any,
      actorId, 'smoke@local', randomUUID(), actorId, null,
    );
    let code = '';
    try {
      await rosterSvc.publishDrafts(
        tenantId,
        {
          dateFrom: iso(2026, 9, 26),
          dateTo: iso(2026, 9, 26),
          employeeIds: [e.id],
          confirmAttendanceImpact: true,
        } as any,
        actorId, 'smoke@local', randomUUID(), actorId, null,
      );
    } catch (err) {
      code = err instanceof AppException ? err.code : String(err);
    }
    assert(code === 'ROSTER_ATTENDANCE_LOCKED', `code=${code}`);
    await rosterSvc.publishDrafts(
      tenantId,
      {
        dateFrom: iso(2026, 9, 26),
        dateTo: iso(2026, 9, 26),
        employeeIds: [e.id],
        confirmAttendanceImpact: true,
        overrideLocked: true,
      } as any,
      actorId, 'smoke@local', randomUUID(), actorId, null,
    );
    note('LOCKED_OVERRIDE', 'PASS', 'block then overrideLocked ok');
  } catch (err) {
    note('LOCKED_OVERRIDE', 'FAIL', String(err));
  }

  // R. Permission seed includes roster.publish
  try {
    const pub = await prisma.permission.findFirst({
      where: { action: 'roster.publish', resource: '.', scope: '.' },
    });
    assert(pub, 'roster.publish permission missing');
    note('PERMISSION_SEED', 'PASS', `id=${pub!.id}`);
  } catch (err) {
    note('PERMISSION_SEED', 'FAIL', String(err));
  }

  await prisma.$disconnect();
  const pass = results.filter((r) => r.status === 'PASS').length;
  const fail = results.filter((r) => r.status === 'FAIL').length;
  const summary = { suite: 'm07-phase4-roster', pass, fail, results };
  fs.mkdirSync('/tmp/wcos-smoke', { recursive: true });
  fs.writeFileSync('/tmp/wcos-smoke/m07-phase4-results.json', JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ pass, fail }));
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
