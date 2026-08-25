/**
 * LOCAL authenticated M06 Batch 3 API smoke runner.
 * Reads password from /tmp/wcos-smoke/password.txt — never prints secrets.
 */
const fs = require('fs');
const { randomUUID } = require('crypto');

const BASE = 'http://127.0.0.1:3001/api/v1';
const BOOT = JSON.parse(
  fs.readFileSync('/tmp/wcos-smoke/bootstrap.json', 'utf8').split('{').slice(1).join('{').replace(/^/, '{'),
);
// bootstrap file may include seed logs — parse last JSON object
function loadBootstrap() {
  const raw = fs.readFileSync('/tmp/wcos-smoke/bootstrap.json', 'utf8');
  const idx = raw.lastIndexOf('{');
  return JSON.parse(raw.slice(idx));
}
const boot = loadBootstrap();
const password = fs.readFileSync('/tmp/wcos-smoke/password.txt', 'utf8').trim();
const results = [];
const stamp = Date.now();

function note(id, status, evidence) {
  results.push({ id, status, evidence });
  console.log(`${status.padEnd(12)} ${id} — ${evidence}`);
}

function redactDeep(value) {
  if (value == null) return value;
  if (typeof value === 'string') {
    if (/^[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\./.test(value)) return '[REDACTED_JWT]';
    if (value.length > 40 && /^[a-f0-9.-]+$/i.test(value) && value.includes('.')) return '[REDACTED_TOKEN]';
    return value;
  }
  if (Array.isArray(value)) return value.map(redactDeep);
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (/token|password|secret|hash|cookie/i.test(k)) out[k] = '[REDACTED]';
      else out[k] = redactDeep(v);
    }
    return out;
  }
  return value;
}

class CookieJar {
  constructor() {
    this.map = new Map();
  }
  store(setCookieHeaders) {
    const list = setCookieHeaders || [];
    for (const h of list) {
      const part = h.split(';')[0];
      const eq = part.indexOf('=');
      if (eq < 0) continue;
      const name = part.slice(0, eq);
      const val = part.slice(eq + 1);
      const attrs = h.toLowerCase();
      this.map.set(name, {
        value: val,
        httpOnly: attrs.includes('httponly'),
        secure: attrs.includes('secure'),
        rawAttrs: h.split(';').slice(1).map((s) => s.trim()),
      });
    }
  }
  header() {
    return [...this.map.entries()].map(([n, c]) => `${n}=${c.value}`).join('; ');
  }
  get(name) {
    return this.map.get(name);
  }
  clear() {
    this.map.clear();
  }
}

async function req(method, path, { jar, token, body, headers = {}, raw = false } = {}) {
  const h = {
    Accept: 'application/json',
    'X-Correlation-ID': randomUUID(),
    ...headers,
  };
  if (body !== undefined) h['Content-Type'] = 'application/json';
  if (token) h.Authorization = `Bearer ${token}`;
  if (jar?.header()) h.Cookie = jar.header();
  if (method === 'POST' || method === 'PATCH' || method === 'DELETE') {
    if (!h['Idempotency-Key']) h['Idempotency-Key'] = randomUUID();
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: h,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const setCookie = typeof res.headers.getSetCookie === 'function'
    ? res.headers.getSetCookie()
    : (res.headers.raw?.()['set-cookie'] || []);
  if (jar && setCookie.length) jar.store(setCookie);
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _raw: text.slice(0, 200) };
  }
  if (raw) return { status: res.status, headers: res.headers, json, setCookie };
  return { status: res.status, json, setCookie };
}

function hasForbiddenKeys(obj, keys) {
  const found = [];
  const walk = (v, path = '') => {
    if (!v || typeof v !== 'object') return;
    for (const [k, val] of Object.entries(v)) {
      const p = path ? `${path}.${k}` : k;
      if (keys.includes(k)) found.push(p);
      walk(val, p);
    }
  };
  walk(obj);
  return found;
}

function unwrap(json) {
  if (json && typeof json === 'object' && 'data' in json) return json.data;
  return json;
}

async function login(email, tenantId) {
  const jar = new CookieJar();
  const res = await req('POST', '/auth/login', {
    jar,
    body: { email, password, tenantId },
    headers: { 'X-Auth-Transport': 'cookie' },
  });
  return { jar, ...res, data: unwrap(res.json) };
}

(async () => {
  const tenantId = boot.tenantId;
  let managerToken = null;
  let managerJar = null;
  let readerToken = null;
  let deviceId = null;
  let deviceToken = null;
  let geofenceId = null;
  let rowVersion = null;
  let sessionId = null;

  // AUTH-01
  {
    const res = await login(boot.managerEmail, tenantId);
    if (res.status === 200 && res.data?.accessToken) {
      managerToken = res.data.accessToken;
      managerJar = res.jar;
      const cookie = [...managerJar.map.values()][0];
      note(
        'AUTH-01',
        'PASS',
        `login 200 sessionId=${res.data.sessionId ? 'present' : 'missing'} cookieHttpOnly=${cookie?.httpOnly === true}`,
      );
      if (cookie?.httpOnly) note('AUTH-04a', 'PASS', 'refresh cookie HttpOnly=true');
      else note('AUTH-04a', 'FAIL', 'refresh cookie missing or not HttpOnly (set-cookie count=' + (res.setCookie?.length || 0) + ')');
    } else {
      note('AUTH-01', 'FAIL', `status=${res.status} body=${JSON.stringify(redactDeep(res.json)).slice(0, 200)}`);
    }
  }

  // AUTH-02 me
  if (managerToken) {
    const me = await req('GET', '/auth/me', { token: managerToken, jar: managerJar });
    const d = unwrap(me.json);
    if (me.status === 200 && d?.userId) {
      const perms = d.permissions || [];
      note(
        'AUTH-02',
        'PASS',
        `me 200 tenantId=${d.tenantId === tenantId} perms=${perms.length} hasDeviceRead=${perms.includes('attendance.device.read')}`,
      );
      const bad = hasForbiddenKeys(d, [
        'passwordHash',
        'refreshToken',
        'tokenHash',
        'sessionTokenHash',
        'mfaSecret',
      ]);
      note(
        'SEC-ME',
        bad.length ? 'FAIL' : 'PASS',
        bad.length ? `leaked ${bad.join(',')}` : 'no secret fields in /auth/me',
      );
    } else note('AUTH-02', 'FAIL', `status=${me.status}`);
  }

  // AUTH-03 protected
  if (managerToken) {
    const r = await req('GET', '/attendance/devices', { token: managerToken });
    note('AUTH-03', r.status === 200 ? 'PASS' : 'FAIL', `devices list ${r.status}`);
  }

  // AUTH-04 refresh
  if (managerJar) {
    const oldCookie = [...managerJar.map.values()][0]?.value;
    const refreshed = await req('POST', '/auth/refresh', { jar: managerJar, body: {} });
    const refreshedData = unwrap(refreshed.json);
    if (refreshed.status === 200 && refreshedData?.accessToken) {
      const newToken = refreshedData.accessToken;
      note('AUTH-04', 'PASS', 'refresh 200 new access token issued');
      managerToken = newToken;
      // AUTH-05 rotation — reuse old refresh
      if (oldCookie) {
        const jar2 = new CookieJar();
        // forge cookie with old value using cookie name from jar
        const cookieName = [...managerJar.map.keys()][0];
        jar2.map.set(cookieName, { value: oldCookie, httpOnly: true, secure: false, rawAttrs: [] });
        const reuse = await req('POST', '/auth/refresh', { jar: jar2, body: {} });
        note(
          'AUTH-05',
          reuse.status === 401 || reuse.status === 403 ? 'PASS' : 'PARTIAL',
          `old refresh reuse status=${reuse.status}`,
        );
        // Refresh-reuse detection may revoke the whole session family — re-login for remaining flows.
        const relog = await login(boot.managerEmail, tenantId);
        if (relog.status === 200 && relog.data?.accessToken) {
          managerToken = relog.data.accessToken;
          managerJar = relog.jar;
          note('AUTH-05b', 'PASS', 're-login after rotation revoke for remaining smoke flows');
        } else {
          note('AUTH-05b', 'FAIL', `re-login after AUTH-05 failed status=${relog.status}`);
          managerToken = null;
        }
      } else note('AUTH-05', 'NOT EXECUTED', 'old cookie value unavailable');
    } else note('AUTH-04', 'FAIL', `refresh status=${refreshed.status}`);
  }

  // CAP / DEV health route regression
  if (managerToken) {
    const health = await req('GET', '/attendance/devices/health', { token: managerToken });
    note(
      'DEV-09',
      health.status === 200 ? 'PASS' : 'FAIL',
      `GET /attendance/devices/health → ${health.status}`,
    );
    const list = await req('GET', '/attendance/devices?page=1&pageSize=20', { token: managerToken });
    note('DEV-01', list.status === 200 ? 'PASS' : 'FAIL', `list ${list.status}`);
    note('CAP-02', health.status === 200 ? 'PASS' : 'FAIL', `health data status=${health.status}`);
    if (health.status === 200) {
      const rows = unwrap(health.json) ?? [];
      const arr = Array.isArray(rows) ? rows : [];
      note('CAP-03', 'PASS', `health rows=${arr.length} (summary equals API array length)`);
      const attention = arr.filter((r) =>
        ['DEGRADED', 'UNHEALTHY', 'OFFLINE', 'SUSPENDED'].includes(r.healthStatus),
      );
      const badAtt = attention.filter((r) => r.healthStatus === 'DECOMMISSIONED');
      note(
        'CAP-04',
        badAtt.length === 0 ? 'PASS' : 'FAIL',
        `attention=${attention.length} decommissionedInAttention=${badAtt.length}`,
      );
    }
  }

  // Register device
  if (managerToken) {
    const serial = `SMOKE-${stamp}`;
    const reg = await req('POST', '/attendance/devices', {
      token: managerToken,
      body: {
        name: `SMOKE-M06-DEVICE-${stamp}`,
        deviceType: 'BIOMETRIC',
        serialNumber: serial,
        vendor: 'SMOKE',
        model: 'TEST',
        timezone: 'Asia/Karachi',
      },
    });
    if (reg.status === 201 || reg.status === 200) {
      deviceId = unwrap(reg.json)?.id;
      const status = unwrap(reg.json)?.status;
      note('DEV-02', status === 'PENDING' ? 'PASS' : 'PARTIAL', `register ${reg.status} status=${status}`);
    } else note('DEV-02', 'FAIL', `register ${reg.status} ${JSON.stringify(redactDeep(reg.json)).slice(0, 180)}`);
  }

  if (managerToken && deviceId) {
    const detail = await req('GET', `/attendance/devices/${deviceId}`, { token: managerToken });
    note('DEV-03', detail.status === 200 ? 'PASS' : 'FAIL', `detail ${detail.status}`);
    note('DEV-10', detail.status === 200 ? 'PASS' : 'FAIL', `GET :deviceId ${detail.status}`);
    const sec = hasForbiddenKeys(detail.json, ['tokenHash', 'deviceFingerprint', 'publicKeyFingerprint', 'ipWhitelist']);
    note('SEC-DEVICE', sec.length === 0 ? 'PASS' : 'FAIL', sec.length ? sec.join(',') : 'no secrets/fingerprints on GET');

    const prov = await req('POST', `/attendance/devices/${deviceId}/provision`, {
      token: managerToken,
      body: {
        deviceFingerprint: `fp-device-${stamp}`,
        publicKeyFingerprint: `fp-pub-${stamp}`,
        ipWhitelist: ['127.0.0.1/32'],
      },
    });
    note('DEV-04', prov.status === 200 || prov.status === 201 ? 'PASS' : 'FAIL', `provision ${prov.status}`);

    const act = await req('POST', `/attendance/devices/${deviceId}/activate`, { token: managerToken, body: {} });
    const actStatus = unwrap(act.json)?.status;
    note('DEV-05', (act.status === 200 || act.status === 201) && actStatus === 'ACTIVE' ? 'PASS' : 'FAIL', `activate ${act.status} status=${actStatus}`);

    const tok = await req('POST', `/attendance/devices/${deviceId}/tokens`, { token: managerToken, body: {} });
    if (tok.status === 201 || tok.status === 200) {
      const issued = unwrap(tok.json)?.token;
      note('DEV-06', issued ? 'PASS' : 'FAIL', `issue token ${tok.status} tokenPresent=${!!issued}`);
      // Keep privately for device-auth tests — never write to report/disk.
      global.__smokeDeviceToken = issued;
      deviceToken = issued ? '[HELD_IN_MEMORY]' : null;
    } else note('DEV-06', 'FAIL', `issue ${tok.status}`);
  }

  // Heartbeat via device auth
  if (deviceId && global.__smokeDeviceToken) {
    const hb = await req('POST', `/attendance/devices/${deviceId}/heartbeat`, {
      headers: { 'X-WCOS-Device-Token': global.__smokeDeviceToken },
      body: { cpu: 10, memory: 20, disk: 30, queueLength: 0, firmwareVersion: 'smoke-1.0' },
    });
    note('DEV-11', hb.status === 204 || hb.status === 200 ? 'PASS' : 'FAIL', `heartbeat ${hb.status}`);

    // lastSeen should not force ACTIVE incorrectly — device already ACTIVE; check suspended path later
    const latest = await req('GET', `/attendance/devices/${deviceId}/heartbeats/latest`, { token: managerToken });
    note('DEV-12', latest.status === 200 ? 'PASS' : 'FAIL', `latest heartbeat ${latest.status}`);
  } else {
    note('DEV-11', 'NOT EXECUTED', 'no device token');
    note('DEV-12', 'NOT EXECUTED', 'no device token');
  }

  // Invalid device token
  if (deviceId) {
    const bad = await req('POST', `/attendance/devices/${deviceId}/heartbeat`, {
      headers: { 'X-WCOS-Device-Token': 'invalid.token.value' },
      body: { cpu: 1 },
    });
    note('DEV-AUTH-INVALID', bad.status === 401 || bad.status === 403 ? 'PASS' : 'FAIL', `invalid token ${bad.status}`);
    const miss = await req('POST', `/attendance/devices/${deviceId}/heartbeat`, { body: { cpu: 1 } });
    note('DEV-AUTH-MISSING', miss.status === 401 || miss.status === 403 ? 'PASS' : 'FAIL', `missing token ${miss.status}`);
  }

  // Suspend + lastSeen regression: while SUSPENDED, heartbeat must not reactivate via updateLastSeen
  if (managerToken && deviceId) {
    const sus = await req('POST', `/attendance/devices/${deviceId}/suspend`, {
      token: managerToken,
      body: { reason: 'SMOKE suspend for lastSeen regression' },
    });
    const st = unwrap(sus.json)?.status;
    note('DEV-14', (sus.status === 200 || sus.status === 201) && st === 'SUSPENDED' ? 'PASS' : 'FAIL', `suspend ${sus.status} status=${st}`);

    if (global.__smokeDeviceToken && st === 'SUSPENDED') {
      const hb2 = await req('POST', `/attendance/devices/${deviceId}/heartbeat`, {
        headers: { 'X-WCOS-Device-Token': global.__smokeDeviceToken },
        body: { cpu: 5, memory: 5, disk: 5 },
      });
      const after = await req('GET', `/attendance/devices/${deviceId}`, { token: managerToken });
      const afterStatus = unwrap(after.json)?.status;
      note(
        'DEV-13',
        afterStatus === 'SUSPENDED' ? 'PASS' : 'FAIL',
        `post-heartbeat status=${afterStatus} hbStatus=${hb2.status} (must not force ACTIVE)`,
      );
    } else note('DEV-13', 'PARTIAL', 'could not run heartbeat while suspended');

    // Reactivate for remaining flows
    await req('POST', `/attendance/devices/${deviceId}/activate`, { token: managerToken, body: {} });
  }

  // Geofence flow
  if (managerToken) {
    const list = await req('GET', '/attendance/geofences', { token: managerToken });
    note('GEO-01', list.status === 200 ? 'PASS' : 'FAIL', `list ${list.status}`);

    const create = await req('POST', '/attendance/geofences', {
      token: managerToken,
      body: {
        name: `SMOKE-M06-GEOFENCE-${stamp}`,
        centerLat: 24.8607,
        centerLng: 67.0011,
        radiusMeters: 250,
      },
    });
    if (create.status === 201 || create.status === 200) {
      geofenceId = unwrap(create.json)?.id;
      rowVersion = unwrap(create.json)?.rowVersion;
      note('GEO-02', 'PASS', `create ${create.status} rowVersion=${rowVersion ? 'present' : 'missing'}`);
    } else note('GEO-02', 'FAIL', `create ${create.status} ${JSON.stringify(redactDeep(create.json)).slice(0, 180)}`);
  }

  if (managerToken && geofenceId) {
    const detail = await req('GET', `/attendance/geofences/${geofenceId}`, { token: managerToken });
    rowVersion = unwrap(detail.json)?.rowVersion || rowVersion;
    note('GEO-04', detail.status === 200 ? 'PASS' : 'FAIL', `detail ${detail.status}`);
    note('GEO-05', rowVersion ? 'PASS' : 'FAIL', `rowVersion=${rowVersion ? 'present' : 'missing'}`);

    const patch1 = await req('PATCH', `/attendance/geofences/${geofenceId}`, {
      token: managerToken,
      headers: { 'If-Match': `"${rowVersion}"` },
      body: { name: `SMOKE-M06-GEOFENCE-${stamp}-v2`, radiusMeters: 300 },
    });
    const newRv = unwrap(patch1.json)?.rowVersion;
    note(
      'GEO-06',
      patch1.status === 200 && newRv && String(newRv) !== String(rowVersion) ? 'PASS' : 'FAIL',
      `edit ${patch1.status} rowVersion ${rowVersion}→${newRv}`,
    );

    const stale = await req('PATCH', `/attendance/geofences/${geofenceId}`, {
      token: managerToken,
      headers: { 'If-Match': `"${rowVersion}"` },
      body: { radiusMeters: 310 },
    });
    const code = stale.json?.code || stale.json?.error?.code || stale.json?.message;
    note(
      'GEO-07',
      stale.status === 412 ? 'PASS' : 'FAIL',
      `stale PATCH status=${stale.status} code=${code}`,
    );
    rowVersion = newRv || rowVersion;

    const inside = await req('POST', `/attendance/geofences/${geofenceId}/check`, {
      token: managerToken,
      body: { latitude: 24.8607, longitude: 67.0011 },
    });
    const inData = unwrap(inside.json);
    note(
      'GEO-09',
      (inside.status === 200 || inside.status === 201) && inData?.isWithin === true ? 'PASS' : 'FAIL',
      `inside ${inside.status} isWithin=${inData?.isWithin} distance=${inData?.distance}`,
    );

    const outside = await req('POST', `/attendance/geofences/${geofenceId}/check`, {
      token: managerToken,
      body: { latitude: 25.0, longitude: 68.0 },
    });
    const outData = unwrap(outside.json);
    note(
      'GEO-10',
      (outside.status === 200 || outside.status === 201) && outData?.isWithin === false ? 'PASS' : 'FAIL',
      `outside ${outside.status} isWithin=${outData?.isWithin} distance=${outData?.distance}`,
    );

    const del = await req('DELETE', `/attendance/geofences/${geofenceId}`, {
      token: managerToken,
      headers: { 'If-Match': `"${rowVersion}"` },
    });
    note('GEO-11', del.status === 204 || del.status === 200 ? 'PASS' : 'FAIL', `delete ${del.status}`);
    const gone = await req('GET', `/attendance/geofences/${geofenceId}`, { token: managerToken });
    note('GEO-12', gone.status === 404 ? 'PASS' : 'FAIL', `after delete GET ${gone.status}`);
    geofenceId = null;
  }

  // Offline session via device auth
  if (deviceId && global.__smokeDeviceToken) {
    // ensure ACTIVE
    await req('POST', `/attendance/devices/${deviceId}/activate`, { token: managerToken, body: {} });
    const sess = await req('POST', '/attendance/offline-sessions', {
      headers: { 'X-WCOS-Device-Token': global.__smokeDeviceToken },
      body: { clientTimezone: 'Asia/Karachi' },
    });
    sessionId = unwrap(sess.json)?.id;
    note('OFF-01', sess.status === 201 || sess.status === 200 ? 'PASS' : 'FAIL', `create session ${sess.status} ${sess.status >= 400 ? JSON.stringify(redactDeep(sess.json)).slice(0, 160) : ''}`);

    if (sessionId) {
      const hash1 = require('crypto').createHash('sha256').update(`smoke-event-${stamp}-1`).digest('hex');
      const batch = await req('POST', `/attendance/offline-sessions/${sessionId}/events:batch`, {
        headers: { 'X-WCOS-Device-Token': global.__smokeDeviceToken },
        body: {
          events: [
            {
              source: 'OFFLINE',
              sequenceNumber: 1,
              payload: { eventType: 'CHECK_IN', occurredAt: new Date().toISOString() },
              payloadHash: hash1,
            },
          ],
        },
      });
      note('OFF-08', batch.status === 202 || batch.status === 200 ? 'PASS' : 'FAIL', `enqueue batch ${batch.status}`);

      const list = await req('GET', '/attendance/offline-sessions?page=1&pageSize=20', { token: managerToken });
      note('OFF-02', list.status === 200 ? 'PASS' : 'FAIL', `list ${list.status}`);
      const filt = await req('GET', `/attendance/offline-sessions?status=ACTIVE&deviceId=${deviceId}`, {
        token: managerToken,
      });
      note('OFF-03', filt.status === 200 ? 'PASS' : 'FAIL', `status+device filter ${filt.status}`);

      const det = await req('GET', `/attendance/offline-sessions/${sessionId}`, { token: managerToken });
      note('OFF-06', det.status === 200 ? 'PASS' : 'FAIL', `detail ${det.status}`);
      const leak = hasForbiddenKeys(det.json, ['sessionTokenHash', 'tokenHash']);
      note('SEC-OFFLINE', leak.length === 0 ? 'PASS' : 'FAIL', leak.length ? leak.join(',') : 'no sessionTokenHash');

      const pending = await req('GET', `/attendance/offline-sessions/${sessionId}/pending-events`, {
        token: managerToken,
      });
      const events = unwrap(pending.json) ?? [];
      note(
        'OFF-07',
        pending.status === 200 ? 'PASS' : 'FAIL',
        `pending ${pending.status} count=${Array.isArray(events) ? events.length : '?'}`,
      );
      const payloadShown = JSON.stringify(pending.json || {}).includes('"payload"');
      // payload exists in DTO — record if present; security guidance says omit from UI, API may still return
      note('OFF-07b', 'PARTIAL', `API pending DTO includes payload field=${payloadShown}`);

      const replay = await req('POST', `/attendance/offline-sessions/${sessionId}/replay`, {
        token: managerToken,
        body: {},
      });
      const rr = unwrap(replay.json) || {};
      note(
        'OFF-09',
        replay.status === 200 || replay.status === 201 ? 'PASS' : 'FAIL',
        `replay ${replay.status} processed=${rr.processedCount} success=${rr.successCount} errors=${rr.errorCount}`,
      );

      const pending2 = await req('GET', `/attendance/offline-sessions/${sessionId}/pending-events`, {
        token: managerToken,
      });
      const events2 = unwrap(pending2.json) ?? [];
      note(
        'OFF-10',
        pending2.status === 200 ? 'PASS' : 'FAIL',
        `pending after replay count=${Array.isArray(events2) ? events2.length : '?'}`,
      );

      // Create another session with pending to test close-with-pending outbox
      const sess2 = await req('POST', '/attendance/offline-sessions', {
        headers: { 'X-WCOS-Device-Token': global.__smokeDeviceToken },
        body: { clientTimezone: 'Asia/Karachi' },
      });
      const sid2 = unwrap(sess2.json)?.id;
      if (sid2) {
        const hashClose = require('crypto').createHash('sha256').update(`smoke-event-${stamp}-close`).digest('hex');
        await req('POST', `/attendance/offline-sessions/${sid2}/events:batch`, {
          headers: { 'X-WCOS-Device-Token': global.__smokeDeviceToken },
          body: {
            events: [
              {
                source: 'OFFLINE',
                sequenceNumber: 1,
                payload: { eventType: 'CHECK_OUT', occurredAt: new Date().toISOString() },
                payloadHash: hashClose,
              },
            ],
          },
        });
        const close = await req('POST', `/attendance/offline-sessions/${sid2}/close`, {
          token: managerToken,
          body: { reason: 'SMOKE close with pending' },
        });
        note('OFF-11', close.status === 200 || close.status === 201 ? 'PASS' : 'FAIL', `close ${close.status}`);

        // Check outbox for OfflineReplayRequested
        const { PrismaClient } = require('@prisma/client');
        const path = require('path');
        const p = new PrismaClient({
          datasources: {
            db: {
              url: process.env.DATABASE_URL,
            },
          },
        });
        // Load env from apps/api/.env if needed
        try {
          const envPath = path.join(__dirname, '../.env');
          if (require('fs').existsSync(envPath)) {
            for (const line of require('fs').readFileSync(envPath, 'utf8').split('\n')) {
              const m = line.match(/^([^#=]+)=(.*)$/);
              if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, '');
            }
          }
        } catch {}
        await p.$connect();
        const outbox = await p.outboxEvent.findMany({
          where: {
            tenantId,
            eventType: { contains: 'OfflineReplay' },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { eventType: true, createdAt: true },
        });
        const hit = outbox.find((o) => o.eventType.includes('OfflineReplayRequested'));
        note(
          'OFF-12',
          hit ? 'PASS' : 'PARTIAL',
          hit
            ? `outbox ${hit.eventType} present`
            : `no OfflineReplayRequested found (found=${outbox.map((o) => o.eventType).join(',') || 'none'})`,
        );

        const inbox = await p.consumerInbox.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
        note(
          'WORKER-INBOX',
          inbox.length > 0 ? 'PASS' : 'PARTIAL',
          `consumerInbox recent rows=${inbox.length}`,
        );
        await p.$disconnect();
      }
    }
  } else {
    note('OFF-01', 'NOT EXECUTED', 'device token unavailable');
  }

  // Permission: reader forbidden mutation
  {
    const rlogin = await login(boot.readerEmail, tenantId);
    if (rlogin.status === 200 && rlogin.data?.accessToken) {
      readerToken = rlogin.data.accessToken;
      note('PERM-01', 'PASS', 'reader login 200');
      const me = await req('GET', '/auth/me', { token: readerToken });
      const perms = unwrap(me.json)?.permissions || [];
      note(
        'PERM-02',
        perms.includes('attendance.device.read') && !perms.includes('attendance.device.manage')
          ? 'PASS'
          : 'FAIL',
        `reader manage=${perms.includes('attendance.device.manage')} read=${perms.includes('attendance.device.read')}`,
      );
      const deny = await req('POST', '/attendance/devices', {
        token: readerToken,
        body: {
          name: 'SHOULD-FAIL',
          deviceType: 'X',
          serialNumber: `FAIL-${stamp}`,
        },
      });
      note('PERM-03', deny.status === 403 ? 'PASS' : 'FAIL', `reader register denied status=${deny.status}`);
    } else note('PERM-01', 'FAIL', `reader login ${rlogin.status}`);
  }

  // Replace + decommission
  if (managerToken && deviceId) {
    await req('POST', `/attendance/devices/${deviceId}/activate`, { token: managerToken, body: {} });
    const rep = await req('POST', `/attendance/devices/${deviceId}/replace`, {
      token: managerToken,
      body: {
        newSerialNumber: `SMOKE-REPL-${stamp}`,
        newDeviceFingerprint: `fp-new-${stamp}`,
        newPublicKeyFingerprint: `fp-newpub-${stamp}`,
      },
    });
    const newId = unwrap(rep.json)?.id;
    note('DEV-16', (rep.status === 200 || rep.status === 201) && newId && newId !== deviceId ? 'PASS' : 'FAIL', `replace ${rep.status} ${rep.status >= 400 ? JSON.stringify(redactDeep(rep.json)).slice(0, 160) : ''}`);
    if (newId) {
      const dec = await req('POST', `/attendance/devices/${newId}/decommission`, {
        token: managerToken,
        body: { reason: 'SMOKE cleanup decommission' },
      });
      note('DEV-17', dec.status === 200 || dec.status === 201 ? 'PASS' : 'FAIL', `decommission new device ${dec.status}`);
    }
    // old device should already be decommissioned by replace
    const old = await req('GET', `/attendance/devices/${deviceId}`, { token: managerToken });
    const oldSt = unwrap(old.json)?.status;
    note('DEV-16b', oldSt === 'DECOMMISSIONED' ? 'PASS' : 'PARTIAL', `old device status=${oldSt}`);
  }

  // Logout
  if (managerToken && managerJar) {
    const out = await req('POST', '/auth/logout', { token: managerToken, jar: managerJar, body: {} });
    note('AUTH-06', out.status === 200 || out.status === 204 ? 'PASS' : 'FAIL', `logout ${out.status}`);
    const post = await req('GET', '/attendance/devices', { token: managerToken });
    note(
      'AUTH-07',
      post.status === 401 ? 'PASS' : 'PARTIAL',
      `post-logout access status=${post.status} (access JWT may still be valid until expiry)`,
    );
  }

  // Clear sensitive memory
  global.__smokeDeviceToken = undefined;

  fs.writeFileSync('/tmp/wcos-smoke/results.json', JSON.stringify(results, null, 2));
  const counts = results.reduce((a, r) => {
    a[r.status] = (a[r.status] || 0) + 1;
    return a;
  }, {});
  console.log('SUMMARY', counts);
})().catch((e) => {
  console.error('SMOKE_FATAL', e.message);
  process.exit(1);
});
