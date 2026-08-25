/**
 * Platform Super Admin API smoke — catalogue, tenants, audit, usage, auth.
 */
const BASE = process.env.API_BASE ?? 'http://127.0.0.1:3001/api/v1';
const PLATFORM_EMAIL = process.env.PLATFORM_SUPER_ADMIN_EMAIL ?? 'zubair.m1815@gmail.com';
const PLATFORM_PASSWORD = process.env.PLATFORM_SUPER_ADMIN_PASSWORD ?? 'Super@123';

type R = { id: string; status: 'PASS' | 'FAIL'; evidence: string };
const results: R[] = [];
function note(id: string, status: 'PASS' | 'FAIL', evidence: string) {
  results.push({ id, status, evidence });
  console.log(`${status.padEnd(4)} ${id} — ${evidence}`);
}

function unwrap<T>(json: unknown): T {
  return ((json as { data?: T })?.data ?? json) as T;
}

async function jsonFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, init);
  const body = await res.json().catch(() => null);
  return { res, body };
}

async function main() {
  let accessToken = '';

  // AUTH — platform login
  {
    const { res, body } = await jsonFetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: PLATFORM_EMAIL, password: PLATFORM_PASSWORD }),
    });
    const data = unwrap<{ accessToken: string; user?: { scope?: string } }>(body);
    accessToken = data.accessToken ?? (body as { accessToken?: string })?.accessToken ?? '';
    note('AUTH-LOGIN', res.ok && !!accessToken ? 'PASS' : 'FAIL', `status=${res.status} scope=${data.user?.scope ?? 'n/a'}`);
  }

  const auth = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

  // CATALOGUE — plans
  {
    const { res, body } = await jsonFetch('/platform/plans', { headers: auth });
    const plans = unwrap<Array<{ id: string; name: string; code: string }>>(body);
    note('PLANS-LIST', res.ok && plans.length > 0 ? 'PASS' : 'FAIL', `count=${plans.length}`);
  }

  // CATALOGUE — regions
  {
    const { res, body } = await jsonFetch('/platform/deployment-regions', { headers: auth });
    const regions = unwrap<Array<{ id: string; name: string }>>(body);
    note('REGIONS-LIST', res.ok && regions.length > 0 ? 'PASS' : 'FAIL', `count=${regions.length}`);
  }

  // TENANTS — list enriched
  {
    const { res, body } = await jsonFetch('/platform/tenants?page=1&pageSize=5', { headers: auth });
    const page = body as { data?: Array<{ id?: string; planName?: string; planId?: string; slug?: string }> };
    const first = page.data?.[0];
    const hasName = !first || !!first.planName || !first.planId;
    note('TENANTS-LIST', res.ok && hasName ? 'PASS' : 'FAIL', `firstPlan=${first?.planName ?? first?.planId ?? 'none'} slug=${first?.slug ?? 'n/a'}`);

    if (first?.id) {
      const detail = await jsonFetch(`/platform/tenants/${first.id}`, { headers: auth });
      const tenant = unwrap<{ id: string; planName?: string; administrators?: unknown[] }>(detail.body);
      note(
        'TENANT-DETAIL',
        detail.res.ok && tenant.id === first.id && !JSON.stringify(detail.body).includes('tokenHash') ? 'PASS' : 'FAIL',
        `plan=${tenant.planName ?? 'n/a'} admins=${Array.isArray(tenant.administrators) ? tenant.administrators.length : 0}`,
      );

      const usage = await jsonFetch(`/platform/tenants/${first.id}/usage`, { headers: auth });
      const usageDto = unwrap<{ tenantId: string; seatUtilisationPct?: number }>(usage.body);
      note('TENANT-USAGE', usage.res.ok && usageDto.tenantId === first.id ? 'PASS' : 'FAIL', `status=${usage.res.status}`);
    } else {
      note('TENANT-DETAIL', 'FAIL', 'no tenant in directory');
      note('TENANT-USAGE', 'FAIL', 'no tenant in directory');
    }
  }

  // STATS
  {
    const { res, body } = await jsonFetch('/platform/tenants/stats', { headers: auth });
    const stats = unwrap<{ total: number; trial?: number }>(body);
    note('STATS', res.ok && typeof stats.total === 'number' ? 'PASS' : 'FAIL', `total=${stats.total} trial=${stats.trial ?? 0}`);
  }

  // USAGE SUMMARY
  {
    const { res, body } = await jsonFetch('/platform/tenants/usage/summary', { headers: auth });
    const usage = unwrap<{ totalSeatLimit: number }>(body);
    note('USAGE-SUMMARY', res.ok && typeof usage.totalSeatLimit === 'number' ? 'PASS' : 'FAIL', `seats=${usage.totalSeatLimit}`);
  }

  // AUDIT
  {
    const { res, body } = await jsonFetch('/platform/audit-events?page=1&pageSize=5', { headers: auth });
    const page = body as { data?: unknown[] };
    note('AUDIT-LIST', res.ok && Array.isArray(page.data) ? 'PASS' : 'FAIL', `events=${page.data?.length ?? 0}`);
  }

  // SUPPORT GRANTS
  {
    const { res, body } = await jsonFetch('/platform/support-grants?page=1&pageSize=5', { headers: auth });
    const page = body as { data?: unknown[] };
    note('SUPPORT-LIST', res.ok && Array.isArray(page.data) ? 'PASS' : 'FAIL', `grants=${page.data?.length ?? 0}`);
  }

  // CREATE DRAFT + storage entitlement + activate (plan required)
  {
    const plansRes = await jsonFetch('/platform/plans', { headers: auth });
    const regionsRes = await jsonFetch('/platform/deployment-regions', { headers: auth });
    const plans = unwrap<Array<{ id: string }>>(plansRes.body);
    const regions = unwrap<Array<{ id: string }>>(regionsRes.body);
    const stamp = Date.now();
    const { res, body } = await jsonFetch('/platform/tenants', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        displayName: `Smoke Draft ${stamp}`,
        legalName: `Smoke Draft Legal ${stamp}`,
        countryCode: 'PK',
        baseCurrency: 'PKR',
        defaultTimezone: 'Asia/Karachi',
        defaultLocale: 'en-PK',
        deploymentRegionId: regions[0]?.id,
        planId: plans[0]?.id,
        seatLimit: 25,
        storageLimitGb: 12,
        billingCycle: 'monthly',
        primaryAdmin: { name: 'Smoke Admin', email: `smoke.admin.${stamp}@example.com` },
        sendInvitation: false,
      }),
    });
    const created = unwrap<{ id: string; status?: string; storageLimitGb?: number | null }>(body);
    note(
      'TENANT-CREATE-DRAFT',
      res.status === 201 && created.status === 'DRAFT' && created.storageLimitGb === 12 ? 'PASS' : 'FAIL',
      `status=${res.status} tenantStatus=${created.status ?? 'n/a'} storage=${created.storageLimitGb ?? 'n/a'}`,
    );

    if (created.id) {
      const usage = await jsonFetch(`/platform/tenants/${created.id}/usage`, { headers: auth });
      const usageDto = unwrap<{ storageLimitGb?: number | null }>(usage.body);
      note(
        'TENANT-STORAGE-USAGE',
        usage.res.ok && usageDto.storageLimitGb === 12 ? 'PASS' : 'FAIL',
        `storageLimitGb=${usageDto.storageLimitGb ?? 'n/a'}`,
      );

      const filtered = await jsonFetch('/platform/tenants?page=1&pageSize=5&minSeatUtilisationPct=80', { headers: auth });
      const filteredBody = filtered.body as { data?: unknown[] };
      note(
        'TENANTS-USAGE-FILTER',
        filtered.res.ok && Array.isArray(filteredBody.data) ? 'PASS' : 'FAIL',
        `status=${filtered.res.status} count=${filteredBody.data?.length ?? 0}`,
      );

      const activated = await jsonFetch(`/platform/tenants/${created.id}/activate`, { method: 'POST', headers: auth });
      const activatedDto = unwrap<{ status?: string }>(activated.body);
      note(
        'TENANT-ACTIVATE-DRAFT',
        activated.res.ok && activatedDto.status === 'ACTIVE' ? 'PASS' : 'FAIL',
        `status=${activated.res.status} tenantStatus=${activatedDto.status ?? 'n/a'}`,
      );
    } else {
      note('TENANT-STORAGE-USAGE', 'FAIL', 'create failed');
      note('TENANTS-USAGE-FILTER', 'FAIL', 'create failed');
      note('TENANT-ACTIVATE-DRAFT', 'FAIL', 'create failed');
    }
  }

  // RBAC — unauthenticated platform
  {
    const { res } = await jsonFetch('/platform/tenants');
    note('AUTH-UNAUTH', res.status === 401 ? 'PASS' : 'FAIL', `status=${res.status}`);
  }

  {
    const { res } = await jsonFetch('/platform/tenants/stats');
    note('STATS-UNAUTH', res.status === 401 ? 'PASS' : 'FAIL', `status=${res.status}`);
  }

  // AUTH — me + logout
  {
    const { res, body } = await jsonFetch('/auth/me', { headers: auth });
    const me = unwrap<{ scope?: string; platformRole?: string; email?: string }>(body);
    note('AUTH-ME', res.ok && me.scope === 'platform' ? 'PASS' : 'FAIL', `scope=${me.scope ?? 'n/a'} role=${me.platformRole ?? 'n/a'}`);
  }

  {
    const { res } = await jsonFetch('/auth/logout', { method: 'POST', headers: auth });
    note('AUTH-LOGOUT', res.ok || res.status === 204 ? 'PASS' : 'FAIL', `status=${res.status}`);
  }

  const failed = results.filter((r) => r.status === 'FAIL');
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
