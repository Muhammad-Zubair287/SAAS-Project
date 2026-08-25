/**
 * M07 Phase 5 — calendar list contract smoke (enrichment + department membership filter).
 */
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { RosterAssignmentRepository } from '../src/modules/shifts/repositories/roster-assignment.repository';
import { RosterService } from '../src/modules/shifts/services/roster.service';
import { AuthorizationService } from '../src/modules/authentication/services/authorization.service';
import { RbacRepository } from '../src/modules/authentication/repositories/rbac.repository';
import { PermissionCacheService } from '../src/modules/authentication/services/permission-cache.service';
import { ensureM07PermissionsForTenant } from '../src/database/seed/m07-permissions.seed';
import { toRosterAssignmentResponse } from '../src/modules/shifts/dto/roster.dto';

type R = { id: string; status: 'PASS' | 'FAIL'; evidence: string };
const results: R[] = [];
function note(id: string, status: 'PASS' | 'FAIL', evidence: string) {
  results.push({ id, status, evidence });
  console.log(`${status.padEnd(4)} ${id} — ${evidence}`);
}
function assert(c: unknown, m: string): asserts c {
  if (!c) throw new Error(m);
}

async function main() {
  const raw = fs.readFileSync('/tmp/wcos-smoke/bootstrap.json', 'utf8');
  const boot = JSON.parse(raw.slice(raw.lastIndexOf('{')));
  const tenantId = boot.tenantId as string;
  const actorId = boot.managerUserId as string;
  const stamp = Date.now();

  const prisma = new PrismaService();
  await prisma.$connect();
  await prisma.$executeRawUnsafe(`SELECT set_config('app.tenant_id', '${tenantId}', false)`);
  await ensureM07PermissionsForTenant(prisma, tenantId);

  const authz = new AuthorizationService(
    new RbacRepository(prisma),
    new PermissionCacheService(),
    prisma,
  );
  const rosterSvc = new RosterService(
    new RosterAssignmentRepository(prisma),
    prisma,
    authz,
  );

  const le = await prisma.legalEntity.findFirst({ where: { tenantId } });
  assert(le, 'legal entity');

  const dept = await prisma.department.create({
    data: {
      tenantId,
      legalEntityId: le!.id,
      name: `P5 Dept ${stamp}`,
      code: `P5D${stamp}`.slice(0, 40),
      status: 'ACTIVE',
      createdBy: actorId,
      updatedBy: actorId,
    },
  });

  const emp = await prisma.employee.create({
    data: {
      tenantId,
      legalEntityId: le!.id,
      departmentId: dept.id,
      employeeNumber: `P5E-${stamp}`.slice(0, 40),
      firstName: 'P5',
      lastName: 'Cal',
      displayName: 'P5 Calendar',
      emailWork: `p5cal-${stamp}@m07.local`,
      hireDate: new Date(Date.UTC(2024, 0, 1)),
      status: 'ACTIVE',
      employmentType: 'FULL_TIME',
      createdBy: actorId,
    },
  });

  const policy =
    (await prisma.attendancePolicy.findFirst({
      where: { tenantId, isCurrent: true, deletedAt: null },
    })) ??
    (await prisma.attendancePolicy.create({
      data: {
        tenantId,
        name: `P5 Pol ${stamp}`,
        effectiveFrom: new Date(Date.UTC(2020, 0, 1)),
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

  const shift = await prisma.shift.create({
    data: {
      tenantId,
      code: `P5SH-${stamp}`,
      name: 'P5 Morning',
      version: 1,
      status: 'ACTIVE',
      startLocalTime: '09:00',
      endLocalTime: '17:00',
      crossesMidnight: false,
      requiredMinutes: 480,
      attendancePolicyId: policy.id,
      effectiveFrom: new Date(Date.UTC(2020, 0, 1)),
      createdBy: actorId,
      updatedBy: actorId,
    },
  });

  await rosterSvc.createDrafts(
    tenantId,
    {
      shiftId: shift.id,
      employeeIds: [emp.id],
      startDate: '2026-11-10',
      endDate: '2026-11-10',
    } as any,
    actorId,
    'smoke@local',
    randomUUID(),
    actorId,
    null,
  );

  try {
    const listed = await rosterSvc.list(tenantId, {
      dateFrom: '2026-11-10',
      dateTo: '2026-11-10',
      departmentId: dept.id,
      page: 1,
      pageSize: 50,
    } as any);
    const arr = listed.data ?? [];
    assert(arr.length >= 1, `expected rows got ${arr.length}`);
    const dto = arr[0]!;
    assert(dto.startLocalTime === '09:00', `start=${dto.startLocalTime}`);
    assert(dto.endLocalTime === '17:00', `end=${dto.endLocalTime}`);
    assert(dto.shiftCode === shift.code, `code=${dto.shiftCode}`);
    assert(dto.crossesMidnight === false, 'crossesMidnight');
    note('ENRICHMENT_DEPT_FILTER', 'PASS', `code=${dto.shiftCode} start=${dto.startLocalTime}`);
  } catch (e) {
    note('ENRICHMENT_DEPT_FILTER', 'FAIL', String(e));
  }

  try {
    const listed = await rosterSvc.list(tenantId, {
      dateFrom: '2026-11-10',
      dateTo: '2026-11-10',
      employeeIds: [emp.id],
      pageSize: 2000,
    } as any);
    const list = listed.data ?? [];
    assert(list.length >= 1, 'employeeIds filter');
    note('EMPLOYEE_IDS_FILTER', 'PASS', `n=${list.length}`);
  } catch (e) {
    note('EMPLOYEE_IDS_FILTER', 'FAIL', String(e));
  }

  try {
    const mapped = toRosterAssignmentResponse({
      id: randomUUID(),
      tenantId,
      employeeId: emp.id,
      workDate: new Date(Date.UTC(2026, 10, 10)),
      shiftId: shift.id,
      branchId: null,
      rosterStatus: 'DRAFT',
      isRestDay: false,
      isDraftTip: true,
      isEffectivePublished: false,
      publishedAt: null,
      publishedBy: null,
      supersedesId: null,
      assignmentSource: 'INDIVIDUAL',
      sourceReferenceId: null,
      createdBy: actorId,
      updatedBy: actorId,
      createdAt: new Date(),
      updatedAt: new Date(),
      rowVersion: BigInt(1),
      employee: { displayName: 'X' },
      shift: {
        name: shift.name,
        code: shift.code,
        startLocalTime: '09:00',
        endLocalTime: '17:00',
        crossesMidnight: false,
      },
      branch: null,
    });
    assert(mapped.startLocalTime === '09:00', 'mapper times');
    note('MAPPER_TIMES', 'PASS', 'ok');
  } catch (e) {
    note('MAPPER_TIMES', 'FAIL', String(e));
  }

  await prisma.$disconnect();
  const pass = results.filter((r) => r.status === 'PASS').length;
  const fail = results.filter((r) => r.status === 'FAIL').length;
  fs.writeFileSync(
    '/tmp/wcos-smoke/m07-phase5-calendar-api.json',
    JSON.stringify({ suite: 'm07-phase5-calendar-api', pass, fail, results }, null, 2),
  );
  console.log(JSON.stringify({ pass, fail }));
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
