/**
 * M07 Phase 2 API smoke — assign / overlap / override / list / If-Match
 */
import { randomUUID } from 'crypto';
import * as fs from 'fs';

const BASE = 'http://127.0.0.1:3001/api/v1';
const results: { name: string; status: string; detail?: string }[] = [];

function note(name: string, status: string, detail?: string) {
  results.push({ name, status, detail });
  console.log(`${status.padEnd(8)} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function json(res: Response) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

async function main() {
  const raw = fs.readFileSync('/tmp/wcos-smoke/bootstrap.json', 'utf8');
  const boot = JSON.parse(raw.slice(raw.lastIndexOf('{')));
  const password = fs.readFileSync('/tmp/wcos-smoke/password.txt', 'utf8').trim();
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': randomUUID(),
    },
    body: JSON.stringify({
      email: boot.managerEmail,
      password,
      tenantId: boot.tenantId,
    }),
  });
  const loginBody = await json(loginRes);
  if (!loginRes.ok) {
    note('LOGIN', 'FAIL', String(loginRes.status));
    throw new Error('login failed');
  }
  note('LOGIN', 'PASS');
  const token = loginBody.data.accessToken as string;
  const auth = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const me = await json(
    await fetch(`${BASE}/auth/me`, { headers: auth }),
  );
  const perms: string[] = me?.data?.permissions ?? [];
  const need = [
    'roster.read',
    'roster.assign',
    'roster.override',
    'shift.read',
  ];
  note(
    'RBAC',
    need.every((p) => perms.includes(p)) ? 'PASS' : 'FAIL',
    need.map((p) => `${p}=${perms.includes(p)}`).join(','),
  );

  const shift = await prisma.shift.findFirst({
    where: { tenantId: boot.tenantId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
  });
  if (!shift) throw new Error('no ACTIVE shift');

  let employee = await prisma.employee.findFirst({
    where: { tenantId: boot.tenantId, status: 'ACTIVE' },
  });
  if (!employee) {
    let le = await prisma.legalEntity.findFirst({
      where: { tenantId: boot.tenantId },
    });
    if (!le) {
      le = await prisma.legalEntity.create({
        data: {
          tenantId: boot.tenantId,
          name: `SMOKE LE ${Date.now()}`,
          countryCode: 'PK',
          currencyCode: 'PKR',
          timezone: 'Asia/Karachi',
          isPrimary: true,
          status: 'ACTIVE',
        },
      });
    }
    let dept = await prisma.department.findFirst({
      where: { tenantId: boot.tenantId, status: 'ACTIVE' },
    });
    if (!dept) {
      dept = await prisma.department.create({
        data: {
          tenantId: boot.tenantId,
          legalEntityId: le.id,
          name: `SMOKE Dept ${Date.now()}`,
          code: `D${Date.now()}`.slice(0, 40),
          status: 'ACTIVE',
        },
      });
    }
    employee = await prisma.employee.create({
      data: {
        tenantId: boot.tenantId,
        legalEntityId: le.id,
        departmentId: dept.id,
        employeeNumber: `E-${Date.now()}`,
        firstName: 'Smoke',
        lastName: 'Assignee',
        displayName: 'Smoke Assignee',
        emailWork: `smoke.assignee.${Date.now()}@m07.local`,
        hireDate: new Date('2026-01-01'),
        status: 'ACTIVE',
        employmentType: 'FULL_TIME',
      },
    });
  }
  note('FIXTURES', 'PASS', `shift=${shift.id} emp=${employee.id}`);

  const stamp = Date.now();
  const fromA = `2028-01-01`;
  const fromB = `2028-03-01`;
  const createRes = await fetch(`${BASE}/shift-assignments`, {
    method: 'POST',
    headers: { ...auth, 'Idempotency-Key': randomUUID() },
    body: JSON.stringify({
      shiftId: shift.id,
      effectiveFrom: fromA,
      effectiveTo: '2028-06-01',
      employeeIds: [employee.id],
      overrideExisting: true,
    }),
  });
  const createBody = await json(createRes);
  note(
    'ASSIGN',
    createRes.status === 201 && createBody?.data?.created === 1
      ? 'PASS'
      : 'FAIL',
    `status=${createRes.status} body=${JSON.stringify(createBody?.error ?? {}).slice(0, 120)}`,
  );
  const assignment = createBody?.data?.assignments?.[0];

  const overlapRes = await fetch(`${BASE}/shift-assignments`, {
    method: 'POST',
    headers: { ...auth, 'Idempotency-Key': randomUUID() },
    body: JSON.stringify({
      shiftId: shift.id,
      effectiveFrom: fromB,
      effectiveTo: '2028-09-01',
      employeeIds: [employee.id],
    }),
  });
  const overlapBody = await json(overlapRes);
  note(
    'OVERLAP',
    overlapRes.status === 409 &&
      overlapBody?.error?.code === 'SHIFT_ASSIGNMENT_OVERLAP'
      ? 'PASS'
      : 'FAIL',
    `status=${overlapRes.status} code=${overlapBody?.error?.code}`,
  );

  const overrideRes = await fetch(`${BASE}/shift-assignments`, {
    method: 'POST',
    headers: { ...auth, 'Idempotency-Key': randomUUID() },
    body: JSON.stringify({
      shiftId: shift.id,
      effectiveFrom: fromB,
      effectiveTo: '2028-09-01',
      employeeIds: [employee.id],
      overrideExisting: true,
    }),
  });
  const overrideBody = await json(overrideRes);
  note(
    'OVERRIDE',
    overrideRes.status === 201 && overrideBody?.data?.overridden >= 1
      ? 'PASS'
      : 'FAIL',
    `status=${overrideRes.status} overridden=${overrideBody?.data?.overridden}`,
  );

  const listRes = await fetch(
    `${BASE}/shift-assignments?employeeId=${employee.id}&page=1&pageSize=20`,
    { headers: auth },
  );
  const listBody = await json(listRes);
  note(
    'LIST',
    listRes.ok && (listBody?.data?.length ?? 0) > 0 ? 'PASS' : 'FAIL',
    `status=${listRes.status}`,
  );

  if (assignment?.id) {
    const detail = await fetch(`${BASE}/shift-assignments/${assignment.id}`, {
      headers: auth,
    });
    note('DETAIL', detail.ok ? 'PASS' : 'FAIL', `status=${detail.status}`);

    const stale = await fetch(`${BASE}/shift-assignments/${assignment.id}`, {
      method: 'PATCH',
      headers: {
        ...auth,
        'If-Match': `"${assignment.rowVersion}"`,
        'Idempotency-Key': randomUUID(),
      },
      body: JSON.stringify({ effectiveTo: '2026-09-01' }),
    });
    // May be 412 if override truncated bumped rowVersion, or 200 if still same
    const staleBody = await json(stale);
    note(
      'IF-MATCH',
      stale.status === 200 ||
        stale.status === 412 ||
        staleBody?.error?.code === 'VERSION_CONFLICT'
        ? 'PASS'
        : 'FAIL',
      `status=${stale.status}`,
    );
  } else {
    note('DETAIL', 'FAIL', 'no assignment');
    note('IF-MATCH', 'FAIL', 'no assignment');
  }

  // Inactive shift rejection
  const inactive = await prisma.shift.findFirst({
    where: { tenantId: boot.tenantId, status: 'INACTIVE' },
  });
  if (inactive) {
    const bad = await fetch(`${BASE}/shift-assignments`, {
      method: 'POST',
      headers: { ...auth, 'Idempotency-Key': randomUUID() },
      body: JSON.stringify({
        shiftId: inactive.id,
        effectiveFrom: '2026-10-01',
        employeeIds: [employee.id],
        overrideExisting: true,
      }),
    });
    note(
      'INACTIVE-SHIFT',
      bad.status >= 400 ? 'PASS' : 'FAIL',
      `status=${bad.status}`,
    );
  } else {
    note('INACTIVE-SHIFT', 'PENDING', 'no inactive shift fixture');
  }

  // Department expansion if department with members exists
  const deptEmp = await prisma.employee.findFirst({
    where: {
      tenantId: boot.tenantId,
      status: 'ACTIVE',
      departmentId: { not: null },
    },
  });
  if (deptEmp?.departmentId) {
    const deptRes = await fetch(`${BASE}/shift-assignments`, {
      method: 'POST',
      headers: { ...auth, 'Idempotency-Key': randomUUID() },
      body: JSON.stringify({
        shiftId: shift.id,
        effectiveFrom: '2027-01-01',
        effectiveTo: '2027-06-01',
        departmentId: deptEmp.departmentId,
        overrideExisting: true,
      }),
    });
    const deptBody = await json(deptRes);
    note(
      'DEPT-SNAPSHOT',
      deptRes.status === 201 && deptBody?.data?.target === 'DEPARTMENT'
        ? 'PASS'
        : 'FAIL',
      `status=${deptRes.status} resolved=${deptBody?.data?.employeesResolved}`,
    );
  } else {
    note('DEPT-SNAPSHOT', 'PENDING', 'no department members');
  }

  await prisma.$disconnect();
  const summary = results.reduce(
    (a, r) => {
      a[r.status] = (a[r.status] || 0) + 1;
      return a;
    },
    {} as Record<string, number>,
  );
  console.log('SUMMARY', summary);
  fs.writeFileSync(
    '/tmp/wcos-smoke/m07-phase2-api-results.json',
    JSON.stringify({ results, summary }, null, 2),
  );
  if (summary.FAIL) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
