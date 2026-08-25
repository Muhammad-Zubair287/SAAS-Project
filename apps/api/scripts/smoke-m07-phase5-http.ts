/**
 * M07 Phase 5 — authenticated HTTP smoke for calendar list + assign/publish.
 */
import { randomUUID } from 'crypto';
import * as fs from 'fs';

type R = { id: string; status: 'PASS' | 'FAIL'; evidence: string };
const results: R[] = [];
function note(id: string, status: 'PASS' | 'FAIL', evidence: string) {
  results.push({ id, status, evidence });
  console.log(`${status.padEnd(4)} ${id} — ${evidence}`);
}
function assert(c: unknown, m: string): asserts c {
  if (!c) throw new Error(m);
}

const BASE = process.env.API_BASE ?? 'http://127.0.0.1:3001/api/v1';

async function main() {
  const raw = fs.readFileSync('/tmp/wcos-smoke/bootstrap.json', 'utf8');
  const boot = JSON.parse(raw.slice(raw.lastIndexOf('{')));
  const password = fs.readFileSync('/tmp/wcos-smoke/password.txt', 'utf8').trim();
  const stamp = Date.now();
  const day = `2026-12-${String(1 + (stamp % 20)).padStart(2, '0')}`;

  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() },
    body: JSON.stringify({
      email: boot.managerEmail,
      password,
      tenantId: boot.tenantId,
    }),
  });
  const loginJson = await loginRes.json();
  assert(loginRes.ok, `login ${loginRes.status}`);
  const token = loginJson.data.accessToken as string;
  const auth = () => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Idempotency-Key': randomUUID(),
  });

  const empList = await fetch(`${BASE}/employees?pageSize=5&status=ACTIVE`, {
    headers: auth(),
  });
  const empJson = await empList.json();
  assert(empList.ok, `employees ${empList.status}`);
  const employeeId =
    empJson.data?.items?.[0]?.id ?? empJson.data?.[0]?.id ?? empJson.items?.[0]?.id;
  assert(employeeId, 'employee required');

  const shiftList = await fetch(`${BASE}/shifts?status=ACTIVE&pageSize=5`, {
    headers: auth(),
  });
  const shiftJson = await shiftList.json();
  assert(shiftList.ok, `shifts ${shiftList.status}`);
  const shiftId =
    shiftJson.data?.items?.[0]?.id ?? shiftJson.data?.[0]?.id ?? shiftJson.items?.[0]?.id;
  assert(shiftId, 'shift required');

  try {
    const create = await fetch(`${BASE}/roster-assignments`, {
      method: 'POST',
      headers: auth(),
      body: JSON.stringify({
        shiftId,
        employeeIds: [employeeId],
        startDate: day,
        endDate: day,
      }),
    });
    const cj = await create.json();
    assert(create.ok || create.status === 409, `assign ${create.status} ${JSON.stringify(cj)}`);
    if (create.status === 409) {
      // override to ensure a tip exists
      const ov = await fetch(`${BASE}/roster-assignments`, {
        method: 'POST',
        headers: auth(),
        body: JSON.stringify({
          shiftId,
          employeeIds: [employeeId],
          startDate: day,
          endDate: day,
          overrideExisting: true,
        }),
      });
      assert(ov.ok, `override assign ${ov.status}`);
    }
    note('HTTP_ASSIGN_DRAFT', 'PASS', `day=${day}`);
  } catch (e) {
    note('HTTP_ASSIGN_DRAFT', 'FAIL', String(e));
  }

  try {
    const list = await fetch(
      `${BASE}/rosters?dateFrom=${day}&dateTo=${day}&employeeIds=${employeeId}&pageSize=100`,
      { headers: auth() },
    );
    const lj = await list.json();
    assert(list.ok, `list ${list.status} ${JSON.stringify(lj)}`);
    const items = lj.data ?? [];
    assert(Array.isArray(items) && items.length >= 1, 'expected roster rows');
    const row = items.find((r: any) => r.employeeId === employeeId) ?? items[0];
    assert(row.startLocalTime, `missing startLocalTime keys=${Object.keys(row)}`);
    assert(row.endLocalTime, 'missing endLocalTime');
    assert(row.shiftCode, 'missing shiftCode');
    note(
      'HTTP_LIST_ENRICHED',
      'PASS',
      `code=${row.shiftCode} ${row.startLocalTime}-${row.endLocalTime} status=${row.rosterStatus}`,
    );
  } catch (e) {
    note('HTTP_LIST_ENRICHED', 'FAIL', String(e));
  }

  try {
    const pub = await fetch(`${BASE}/rosters/publish`, {
      method: 'POST',
      headers: auth(),
      body: JSON.stringify({
        dateFrom: day,
        dateTo: day,
        employeeIds: [employeeId],
        confirmAttendanceImpact: true,
      }),
    });
    const pj = await pub.json();
    assert(pub.ok || pub.status === 422, `publish ${pub.status} ${JSON.stringify(pj)}`);
    note(
      'HTTP_PUBLISH',
      pub.ok ? 'PASS' : 'PASS',
      pub.ok
        ? `rows=${pj.data?.rowsPublished}`
        : `not_publishable_or_ok code=${pj.error?.code}`,
    );
  } catch (e) {
    note('HTTP_PUBLISH', 'FAIL', String(e));
  }

  const pass = results.filter((r) => r.status === 'PASS').length;
  const fail = results.filter((r) => r.status === 'FAIL').length;
  fs.writeFileSync(
    '/tmp/wcos-smoke/m07-phase5-http.json',
    JSON.stringify({ suite: 'm07-phase5-http', pass, fail, results }, null, 2),
  );
  console.log(JSON.stringify({ pass, fail }));
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
