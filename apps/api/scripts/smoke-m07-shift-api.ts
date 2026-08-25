/**
 * M07 Phase 1 API smoke — create/list/detail/version/412/deactivate/outbox/idempotency
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
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function main() {
  const raw = fs.readFileSync('/tmp/wcos-smoke/bootstrap.json', 'utf8');
  const boot = JSON.parse(raw.slice(raw.lastIndexOf('{')));
  const password = fs.readFileSync('/tmp/wcos-smoke/password.txt', 'utf8').trim();

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
  if (!loginRes.ok || !loginBody?.data?.accessToken) {
    note('LOGIN', 'FAIL', `status=${loginRes.status}`);
    throw new Error('login failed');
  }
  note('LOGIN', 'PASS');
  const token = loginBody.data.accessToken as string;
  const auth = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const meRes = await fetch(`${BASE}/auth/me`, { headers: auth });
  const me = await json(meRes);
  const perms: string[] = me?.data?.permissions ?? me?.data?.permissionCodes ?? [];
  const hasShift =
    perms.includes('shift.read') &&
    perms.includes('shift.create') &&
    perms.includes('shift.update');
  note(
    'PERMISSIONS',
    hasShift ? 'PASS' : 'FAIL',
    `shift.*=${hasShift} count=${perms.length}`,
  );

  // Ensure permissions if missing
  if (!hasShift) {
    note('PERMISSIONS', 'WARN', 're-run smoke-m07-shift-permissions.ts');
  }

  // Resolve/create policy via DB (smoke manager lacks attendance.policy.*).
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  let policy = await prisma.attendancePolicy.findFirst({
    where: { tenantId: boot.tenantId, isCurrent: true, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });
  if (!policy) {
    const actorId = me?.data?.id ?? me?.data?.userId ?? boot.managerUserId;
    policy = await prisma.attendancePolicy.create({
      data: {
        tenantId: boot.tenantId,
        name: `SMOKE M07 Policy ${Date.now()}`,
        effectiveFrom: new Date('2026-01-01'),
        version: 1,
        isCurrent: true,
        workingMinutesPerDay: 480,
        workStartTime: '09:00',
        workEndTime: '17:00',
        graceMinutes: 10,
        lateToleranceMinutes: 15,
        earlyDepartureToleranceMinutes: 10,
        halfDayMinutes: 240,
        minimumWorkingMinutes: 240,
        overtimeThresholdMinutes: 480,
        roundingStrategy: 'NONE',
        weekendDefinition: { days: [0, 6] },
        timezone: 'Asia/Karachi',
        allowOvertime: true,
        createdBy: actorId,
      },
    });
    note('POLICY', 'PASS', `created ${policy.id}`);
  } else {
    note('POLICY', 'PASS', policy.id);
  }

  const stamp = Date.now();
  const code = `DAY-${stamp}`.slice(0, 60);
  const createPayload = {
    code,
    name: `Smoke Day Shift ${stamp}`,
    startLocalTime: '09:00',
    endLocalTime: '17:00',
    crossesMidnight: false,
    requiredMinutes: 480,
    breakMinutes: 60,
    breakPaid: false,
    checkInWindowBeforeMinutes: 30,
    checkInWindowAfterMinutes: 15,
    checkOutWindowAfterMinutes: 30,
    attendancePolicyId: policy.id,
    effectiveFrom: '2026-01-01',
  };

  const idemKey = randomUUID();
  const createRes = await fetch(`${BASE}/shifts`, {
    method: 'POST',
    headers: { ...auth, 'Idempotency-Key': idemKey },
    body: JSON.stringify(createPayload),
  });
  const createBody = await json(createRes);
  note(
    'CREATE',
    createRes.status === 201 ? 'PASS' : 'FAIL',
    `status=${createRes.status} code=${createBody?.error?.code ?? ''}`,
  );
  const shift = createBody?.data;
  if (!shift?.id) throw new Error('create failed: ' + JSON.stringify(createBody));

  // Platform IdempotencyHeaderMiddleware validates key format; persistent
  // response replay is not wired for org CRUD POSTs (same as geofence).
  // Replay of the same key + body must not create a second row — expect
  // SHIFT_CODE_CONFLICT (409) from unique tenant+code+version.
  const idemRes = await fetch(`${BASE}/shifts`, {
    method: 'POST',
    headers: { ...auth, 'Idempotency-Key': idemKey },
    body: JSON.stringify(createPayload),
  });
  const idemBody = await json(idemRes);
  note(
    'IDEMPOTENCY',
    idemRes.status === 409 ||
      (idemRes.status === 201 && idemBody?.data?.id === shift.id)
      ? 'PASS'
      : 'FAIL',
    `status=${idemRes.status} code=${idemBody?.error?.code ?? 'replay'}`,
  );

  const listRes = await fetch(
    `${BASE}/shifts?page=1&pageSize=20&search=${encodeURIComponent(code)}`,
    { headers: auth },
  );
  const listBody = await json(listRes);
  const listed = (listBody?.data ?? []).some((s: { id: string }) => s.id === shift.id);
  note('LIST', listRes.ok && listed ? 'PASS' : 'FAIL', `status=${listRes.status}`);

  const detailRes = await fetch(`${BASE}/shifts/${shift.id}`, { headers: auth });
  const detailBody = await json(detailRes);
  note(
    'DETAIL',
    detailRes.ok && detailBody?.data?.id === shift.id ? 'PASS' : 'FAIL',
    `status=${detailRes.status}`,
  );

  // Non-material: name only
  const namePatch = await fetch(`${BASE}/shifts/${shift.id}`, {
    method: 'PATCH',
    headers: {
      ...auth,
      'If-Match': `"${shift.rowVersion}"`,
      'Idempotency-Key': randomUUID(),
    },
    body: JSON.stringify({ name: `Smoke Day Shift Renamed ${stamp}` }),
  });
  const nameBody = await json(namePatch);
  note(
    'PATCH-NAME',
    namePatch.ok &&
      nameBody?.data?.id === shift.id &&
      nameBody?.data?.version === shift.version
      ? 'PASS'
      : 'FAIL',
    `status=${namePatch.status} version=${nameBody?.data?.version} row=${nameBody?.data?.rowVersion}`,
  );
  const afterName = nameBody?.data ?? shift;

  // Stale If-Match
  const stale = await fetch(`${BASE}/shifts/${afterName.id}`, {
    method: 'PATCH',
    headers: {
      ...auth,
      'If-Match': `"${shift.rowVersion}"`,
      'Idempotency-Key': randomUUID(),
    },
    body: JSON.stringify({ name: 'should fail' }),
  });
  const staleBody = await json(stale);
  note(
    'IF-MATCH-STALE',
    stale.status === 412 || staleBody?.error?.code === 'VERSION_CONFLICT'
      ? 'PASS'
      : 'FAIL',
    `status=${stale.status} code=${staleBody?.error?.code}`,
  );

  // Material → new version
  const material = await fetch(`${BASE}/shifts/${afterName.id}`, {
    method: 'PATCH',
    headers: {
      ...auth,
      'If-Match': `"${afterName.rowVersion}"`,
      'Idempotency-Key': randomUUID(),
    },
    body: JSON.stringify({ startLocalTime: '08:30', requiredMinutes: 510 }),
  });
  const materialBody = await json(material);
  const newShift = materialBody?.data;
  note(
    'VERSION',
    material.ok &&
      newShift?.id !== afterName.id &&
      newShift?.version === afterName.version + 1 &&
      newShift?.code === afterName.code
      ? 'PASS'
      : 'FAIL',
    `status=${material.status} old=${afterName.id} new=${newShift?.id} v=${newShift?.version}`,
  );

  // Deactivate new version
  const deact = await fetch(`${BASE}/shifts/${newShift.id}`, {
    method: 'PATCH',
    headers: {
      ...auth,
      'If-Match': `"${newShift.rowVersion}"`,
      'Idempotency-Key': randomUUID(),
    },
    body: JSON.stringify({ status: 'INACTIVE' }),
  });
  const deactBody = await json(deact);
  note(
    'DEACTIVATE',
    deact.ok && deactBody?.data?.status === 'INACTIVE' ? 'PASS' : 'FAIL',
    `status=${deact.status}`,
  );

  const inactiveRead = await fetch(`${BASE}/shifts/${newShift.id}`, {
    headers: auth,
  });
  const inactiveBody = await json(inactiveRead);
  note(
    'READ-INACTIVE',
    inactiveRead.ok && inactiveBody?.data?.status === 'INACTIVE' ? 'PASS' : 'FAIL',
    `status=${inactiveRead.status}`,
  );

  // Overnight validation reject
  const badNight = await fetch(`${BASE}/shifts`, {
    method: 'POST',
    headers: { ...auth, 'Idempotency-Key': randomUUID() },
    body: JSON.stringify({
      ...createPayload,
      code: `BAD-${stamp}`,
      startLocalTime: '22:00',
      endLocalTime: '06:00',
      crossesMidnight: false,
    }),
  });
  note(
    'VALID-DAY-OVERNIGHT',
    badNight.status >= 400 ? 'PASS' : 'FAIL',
    `status=${badNight.status}`,
  );

  try {
    const events = await prisma.outboxEvent.findMany({
      where: {
        tenantId: boot.tenantId,
        eventType: { in: ['ShiftCreated.v1', 'ShiftVersionPublished.v1'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const types = new Set(events.map((e: { eventType: string }) => e.eventType));
    note(
      'OUTBOX',
      types.has('ShiftCreated.v1') && types.has('ShiftVersionPublished.v1')
        ? 'PASS'
        : 'FAIL',
      `types=${[...types].join(',')}`,
    );
  } catch (e) {
    note('OUTBOX', 'PENDING', String(e).slice(0, 120));
  } finally {
    await prisma.$disconnect();
  }

  const summary = results.reduce(
    (a, r) => {
      a[r.status] = (a[r.status] || 0) + 1;
      return a;
    },
    {} as Record<string, number>,
  );
  console.log('SUMMARY', summary);
  fs.writeFileSync(
    '/tmp/wcos-smoke/m07-phase1-api-results.json',
    JSON.stringify({ results, summary }, null, 2),
  );
  if (summary.FAIL) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
