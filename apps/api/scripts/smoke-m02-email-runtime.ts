/**
 * M02 auth email runtime smoke (local capture + optional SMTP):
 * platform login → create tenant/primary admin invite → accept →
 * user invite → password reset.
 *
 * Tokens are read from EMAIL_CAPTURE_DIR artifacts and never printed.
 */
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

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
const PLATFORM_EMAIL = process.env.PLATFORM_SUPER_ADMIN_EMAIL ?? 'zubair.m1815@gmail.com';
const PLATFORM_PASSWORD = process.env.PLATFORM_SUPER_ADMIN_PASSWORD ?? 'Super@123';
const CAPTURE_DIR = process.env.EMAIL_CAPTURE_DIR ?? '.email-capture';

type CapturedEmail = {
  kind: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  capturedAt: string;
};

function unwrapData<T>(json: any): T {
  return (json?.data ?? json) as T;
}

async function fetchJson(pathName: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${pathName}`, init);
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { res, json };
}

async function waitForCapture(opts: {
  kind: string;
  to: string;
  afterMs: number;
  timeoutMs?: number;
}): Promise<CapturedEmail> {
  const deadline = Date.now() + (opts.timeoutMs ?? 20000);
  while (Date.now() < deadline) {
    if (fs.existsSync(CAPTURE_DIR)) {
      const files = fs
        .readdirSync(CAPTURE_DIR)
        .filter((f) => f.endsWith('.json'))
        .map((f) => path.join(CAPTURE_DIR, f));
      for (const file of files) {
        const stat = fs.statSync(file);
        if (stat.mtimeMs < opts.afterMs) continue;
        if (stat.size < 32) continue;
        let raw: CapturedEmail;
        try {
          raw = JSON.parse(fs.readFileSync(file, 'utf8')) as CapturedEmail;
        } catch {
          continue; // partial write — retry
        }
        if (raw.kind === opts.kind && raw.to.toLowerCase() === opts.to.toLowerCase()) {
          return raw;
        }
      }
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Timed out waiting for captured ${opts.kind} email to=${opts.to}`);
}

function extractToken(content: string, pathMarker: string): string | null {
  const re = new RegExp(`${pathMarker}\\?token=([a-f0-9]{64})`, 'i');
  const match = content.match(re);
  return match?.[1] ?? null;
}

async function main() {
  const prisma = new PrismaClient();
  const stamp = Date.now();
  const primaryEmail = `primary.admin.${stamp}@example.com`;
  const userEmail = `user.invite.${stamp}@example.com`;
  const primaryName = `Primary Admin ${stamp}`;
  const password = 'Invitee@12345';
  const resetPassword = 'ResetPass@12345';

  try {
    const plan =
      (await prisma.plan.findFirst({ where: { code: 'essential', status: 'ACTIVE' } })) ??
      (await prisma.plan.findFirst({ where: { status: 'ACTIVE' } }));
    const region = await prisma.deploymentRegion.findFirst({ where: { status: 'ACTIVE' } })
      ?? (await prisma.deploymentRegion.findFirst());
    assert(plan, 'no active plan in DB');
    assert(region, 'no deployment region in DB');

    const login = await fetchJson('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() },
      body: JSON.stringify({ email: PLATFORM_EMAIL, password: PLATFORM_PASSWORD }),
    });
    assert(login.res.ok, `platform login failed ${login.res.status} ${JSON.stringify(login.json)}`);
    const accessToken =
      login.json?.data?.accessToken ?? unwrapData<{ accessToken: string }>(login.json).accessToken;
    assert(accessToken, 'missing access token');
    note('AUTH-PLATFORM', 'PASS', 'platform super admin login ok');

    const authHeaders = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': randomUUID(),
    };

    const afterTenant = Date.now();
    const createTenant = await fetchJson('/platform/tenants', {
      method: 'POST',
      headers: { ...authHeaders, 'Idempotency-Key': randomUUID() },
      body: JSON.stringify({
        displayName: `Email Smoke Co ${stamp}`,
        legalName: `Email Smoke Co ${stamp} Ltd`,
        countryCode: 'PK',
        baseCurrency: 'PKR',
        defaultTimezone: 'Asia/Karachi',
        defaultLocale: 'en-PK',
        deploymentRegionId: region.id,
        planId: plan.id,
        seatLimit: 25,
        billingCycle: 'monthly',
        primaryAdmin: { name: primaryName, email: primaryEmail },
      }),
    });
    assert(
      createTenant.res.status === 201 || createTenant.res.ok,
      `create tenant failed ${createTenant.res.status} ${JSON.stringify(createTenant.json)}`,
    );
    const tenant = unwrapData<any>(createTenant.json);
    const tenantId = tenant.id as string;
    assert(tenantId, 'tenant id missing');
    note('TENANT-CREATE', 'PASS', `tenantId=${tenantId}`);

    const primaryMail = await waitForCapture({
      kind: 'invitation',
      to: primaryEmail,
      afterMs: afterTenant - 1000,
    });
    assert(
      primaryMail.subject.toLowerCase().includes('invited'),
      `unexpected subject: ${primaryMail.subject}`,
    );
    assert(
      primaryMail.html.includes(tenant.displayName) || primaryMail.text.includes(tenant.displayName),
      'tenant name missing from primary admin invitation email',
    );
    const inviteToken = extractToken(`${primaryMail.html}\n${primaryMail.text}`, '/invitations/accept');
    assert(inviteToken, 'primary admin invitation token missing from captured email');
    note('EMAIL-PRIMARY-ADMIN', 'PASS', `subject="${primaryMail.subject}" tokenPresent=yes`);

    const accept = await fetchJson('/auth/invitations/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() },
      body: JSON.stringify({ token: inviteToken, password }),
    });
    assert(accept.res.ok, `accept invitation ${accept.res.status} ${JSON.stringify(accept.json)}`);
    note('INVITE-ACCEPT', 'PASS', 'primary admin accepted invitation');

    const tenantLogin = await fetchJson('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() },
      body: JSON.stringify({ email: primaryEmail, password, tenantId }),
    });
    assert(
      tenantLogin.res.ok,
      `tenant login ${tenantLogin.res.status} ${JSON.stringify(tenantLogin.json)}`,
    );
    const tenantToken =
      tenantLogin.json?.data?.accessToken ?? unwrapData<any>(tenantLogin.json).accessToken;
    assert(tenantToken, 'tenant access token missing');
    note('TENANT-LOGIN', 'PASS', 'primary admin login with tenant context ok');

    const afterUserInvite = Date.now();
    const inviteUser = await fetchJson('/auth/invitations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tenantToken}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': randomUUID(),
        'X-Tenant-Id': tenantId,
      },
      body: JSON.stringify({ email: userEmail, tenantId }),
    });
    assert(
      inviteUser.res.status === 201 || inviteUser.res.ok,
      `user invite ${inviteUser.res.status} ${JSON.stringify(inviteUser.json)}`,
    );
    const inviteBody = JSON.stringify(inviteUser.json);
    assert(!inviteBody.includes(inviteToken), 'API response must not echo invitation token');
    note('USER-INVITE-API', 'PASS', 'user invitation created');

    const userMail = await waitForCapture({
      kind: 'invitation',
      to: userEmail,
      afterMs: afterUserInvite - 1000,
    });
    const userToken = extractToken(`${userMail.html}\n${userMail.text}`, '/invitations/accept');
    assert(userToken, 'user invitation token missing');
    note('EMAIL-USER-INVITE', 'PASS', `subject="${userMail.subject}" tokenPresent=yes`);

    const acceptUser = await fetchJson('/auth/invitations/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() },
      body: JSON.stringify({ token: userToken, password: 'UserInvitee@12345' }),
    });
    assert(
      acceptUser.res.ok,
      `user accept ${acceptUser.res.status} ${JSON.stringify(acceptUser.json)}`,
    );
    note('USER-INVITE-ACCEPT', 'PASS', 'user invitation accepted');

    const afterReset = Date.now();
    const resetReq = await fetchJson('/auth/password-reset/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() },
      body: JSON.stringify({ email: primaryEmail }),
    });
    assert(resetReq.res.status === 204 || resetReq.res.ok, `reset request ${resetReq.res.status}`);
    note('RESET-REQUEST', 'PASS', 'generic password-reset request accepted');

    const resetMail = await waitForCapture({
      kind: 'password_reset',
      to: primaryEmail,
      afterMs: afterReset - 1000,
    });
    const resetToken = extractToken(`${resetMail.html}\n${resetMail.text}`, '/password-reset/confirm');
    assert(resetToken, 'reset token missing from captured email');
    note('EMAIL-RESET', 'PASS', `subject="${resetMail.subject}" tokenPresent=yes`);

    const confirm = await fetchJson('/auth/password-reset/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() },
      body: JSON.stringify({ token: resetToken, newPassword: resetPassword }),
    });
    assert(
      confirm.res.status === 204 || confirm.res.ok,
      `reset confirm ${confirm.res.status} ${JSON.stringify(confirm.json)}`,
    );
    note('RESET-CONFIRM', 'PASS', 'password reset confirmed');

    const relogin = await fetchJson('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() },
      body: JSON.stringify({ email: primaryEmail, password: resetPassword, tenantId }),
    });
    assert(relogin.res.ok, `relogin after reset ${relogin.res.status} ${JSON.stringify(relogin.json)}`);
    note('RESET-RELOGIN', 'PASS', 'login with new password ok');
  } finally {
    await prisma.$disconnect();
  }

  const failed = results.filter((r) => r.status === 'FAIL');
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
