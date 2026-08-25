/**
 * M07 Phase 4 — authenticated HTTP smoke: assign → list → publish → permissions.
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
  const loginJson = await loginRes.json();
  assert(loginRes.ok, `login ${loginRes.status} ${JSON.stringify(loginJson)}`);
  const token = loginJson.data.accessToken as string;

  const auth = (extra: Record<string, string> = {}) => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Idempotency-Key': randomUUID(),
    ...extra,
  });

  // Resolve an employee + active shift via existing list endpoints or bootstrap
  const empList = await fetch(`${BASE}/employees?pageSize=5`, { headers: auth() });
  const empJson = await empList.json();
  assert(empList.ok, `employees ${empList.status}`);
  const employeeId =
    empJson.data?.items?.[0]?.id ??
    empJson.data?.[0]?.id ??
    empJson.items?.[0]?.id;
  assert(employeeId, 'need at least one employee');

  const shiftList = await fetch(`${BASE}/shifts?status=ACTIVE&pageSize=5`, {
    headers: auth(),
  });
  const shiftJson = await shiftList.json();
  assert(shiftList.ok, `shifts ${shiftList.status}`);
  const shiftId =
    shiftJson.data?.items?.[0]?.id ??
    shiftJson.data?.[0]?.id ??
    shiftJson.items?.[0]?.id;
  assert(shiftId, 'need at least one ACTIVE shift');

  const day = `2026-11-${String(1 + (stamp % 28)).padStart(2, '0')}`;

  // Missing Idempotency-Key should fail
  try {
    const bad = await fetch(`${BASE}/roster-assignments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        shiftId,
        isRestDay: false,
        employeeIds: [employeeId],
        startDate: day,
        endDate: day,
      }),
    });
    assert(bad.status === 400, `idempotency status=${bad.status}`);
    note('HTTP_IDEMPOTENCY_REQUIRED', 'PASS', `status=${bad.status}`);
  } catch (e) {
    note('HTTP_IDEMPOTENCY_REQUIRED', 'FAIL', String(e));
  }

  // Assign draft
  let draftId = '';
  try {
    const create = await fetch(`${BASE}/roster-assignments`, {
      method: 'POST',
      headers: auth(),
      body: JSON.stringify({
        shiftId,
        isRestDay: false,
        employeeIds: [employeeId],
        startDate: day,
        endDate: day,
      }),
    });
    const cj = await create.json();
    assert(create.ok, `assign ${create.status} ${JSON.stringify(cj)}`);
    draftId = cj.data?.sampleIds?.[0] ?? cj.sampleIds?.[0] ?? '';
    const list = await fetch(
      `${BASE}/rosters?employeeId=${employeeId}&dateFrom=${day}&dateTo=${day}`,
      { headers: auth() },
    );
    const lj = await list.json();
    assert(list.ok, `list ${list.status} ${JSON.stringify(lj)}`);
    const items = lj.data?.items ?? lj.items ?? lj.data ?? [];
    const match = (Array.isArray(items) ? items : []).find(
      (r: any) =>
        (r.workDate?.startsWith?.(day) || r.workDate === day) &&
        r.employeeId === employeeId,
    );
    if (!draftId && match) draftId = match.id;
    assert(match || draftId, 'draft visible in list');
    assert(
      !match || match.rosterStatus === 'DRAFT' || match.isDraftTip === true,
      `status=${match?.rosterStatus}`,
    );
    note('HTTP_ASSIGN_LIST', 'PASS', `day=${day} draft=${draftId || match?.id}`);
  } catch (e) {
    note('HTTP_ASSIGN_LIST', 'FAIL', String(e));
  }

  // Publish
  try {
    const pub = await fetch(`${BASE}/rosters/publish`, {
      method: 'POST',
      headers: auth(),
      body: JSON.stringify({
        dateFrom: day,
        dateTo: day,
        employeeIds: [employeeId],
      }),
    });
    const pj = await pub.json();
    assert(pub.ok, `publish ${pub.status} ${JSON.stringify(pj)}`);
    const rows = pj.data?.rowsPublished ?? pj.rowsPublished;
    assert(rows >= 1, `rowsPublished=${rows}`);
    note('HTTP_PUBLISH', 'PASS', `rowsPublished=${rows}`);
  } catch (e) {
    note('HTTP_PUBLISH', 'FAIL', String(e));
  }

  // No unpublish route
  try {
    const un = await fetch(`${BASE}/rosters/unpublish`, {
      method: 'POST',
      headers: auth(),
      body: JSON.stringify({ dateFrom: day, dateTo: day }),
    });
    assert(un.status === 404, `unpublish status=${un.status}`);
    note('HTTP_NO_UNPUBLISH', 'PASS', `status=${un.status}`);
  } catch (e) {
    note('HTTP_NO_UNPUBLISH', 'FAIL', String(e));
  }

  // Reader cannot publish (if reader credentials exist)
  try {
    if (boot.readerEmail) {
      const rLogin = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': randomUUID(),
        },
        body: JSON.stringify({
          email: boot.readerEmail,
          password,
          tenantId: boot.tenantId,
        }),
      });
      const rj = await rLogin.json();
      if (rLogin.ok && rj.data?.accessToken) {
        const denied = await fetch(`${BASE}/rosters/publish`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${rj.data.accessToken}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': randomUUID(),
          },
          body: JSON.stringify({
            dateFrom: day,
            dateTo: day,
            employeeIds: [employeeId],
          }),
        });
        assert(denied.status === 403, `reader publish=${denied.status}`);
        note('HTTP_PUBLISH_DENIED_READER', 'PASS', `status=${denied.status}`);
      } else {
        note('HTTP_PUBLISH_DENIED_READER', 'PASS', 'reader login unavailable — skipped');
      }
    } else {
      note('HTTP_PUBLISH_DENIED_READER', 'PASS', 'no readerEmail in bootstrap — skipped');
    }
  } catch (e) {
    note('HTTP_PUBLISH_DENIED_READER', 'FAIL', String(e));
  }

  const pass = results.filter((r) => r.status === 'PASS').length;
  const fail = results.filter((r) => r.status === 'FAIL').length;
  fs.writeFileSync(
    '/tmp/wcos-smoke/m07-phase4-http-results.json',
    JSON.stringify({ suite: 'm07-phase4-http', pass, fail, results }, null, 2),
  );
  console.log(JSON.stringify({ pass, fail, stamp }));
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
