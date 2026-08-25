import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const CAPTURE_DIR = path.resolve(__dirname, '..', '..', 'api', '.email-capture');

type CapturedEmail = {
  kind: 'invitation' | 'password_reset';
  to: string;
  subject: string;
  html: string;
  text: string;
  capturedAt: string;
};

function clearCaptureDir() {
  if (!fs.existsSync(CAPTURE_DIR)) return;
  for (const f of fs.readdirSync(CAPTURE_DIR)) {
    if (!f.endsWith('.json')) continue;
    fs.unlinkSync(path.join(CAPTURE_DIR, f));
  }
}

function extractInvitationToken(html: string): string | null {
  // email adapter uses: /invitations/accept?token=<secure-token>
  const m = html.match(/token=([a-f0-9]{64})/i);
  return m?.[1] ?? null;
}

async function waitForInvitationToken(opts: { toEmail: string; afterMs: number; timeoutMs?: number }) {
  const deadline = Date.now() + (opts.timeoutMs ?? 20_000);
  while (Date.now() < deadline) {
    if (fs.existsSync(CAPTURE_DIR)) {
      const files = fs.readdirSync(CAPTURE_DIR).filter((f) => f.endsWith('.json'));
      for (const file of files) {
        const full = path.join(CAPTURE_DIR, file);
        const stat = fs.statSync(full);
        if (stat.mtimeMs < opts.afterMs) continue;

        let parsed: CapturedEmail;
        try {
          parsed = JSON.parse(fs.readFileSync(full, 'utf8')) as CapturedEmail;
        } catch {
          continue; // partial write
        }

        if (parsed.kind !== 'invitation') continue;
        if (parsed.to.toLowerCase() !== opts.toEmail.toLowerCase()) continue;

        const token = extractInvitationToken(parsed.html);
        if (token) return token;
      }
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Timed out waiting for invitation email to=${opts.toEmail}`);
}

test.describe.serial('Platform Super Admin — end-to-end', () => {
  test('creates tenant, accepts primary admin invitation, verifies tenant access', async ({ page }) => {
    const stamp = Date.now();
    const tenantDisplayName = `E2E Tenant ${stamp}`;
    const tenantLegalName = `E2E Tenant Legal ${stamp}`;
    const primaryAdminEmail = `primary.admin.${stamp}@example.com`;

    // Clean out old captured emails so token wait is deterministic.
    clearCaptureDir();

    const PLATFORM_EMAIL = process.env.PLATFORM_SUPER_ADMIN_EMAIL ?? 'zubair.m1815@gmail.com';
    const PLATFORM_PASSWORD = process.env.PLATFORM_SUPER_ADMIN_PASSWORD ?? 'Super@123';

    // AUTH — Platform Super Admin (use UI login path for reliability)
    await page.goto('/login');
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('input[name="password"]')).toBeVisible({ timeout: 30_000 });
    await page.locator('input[name="email"]').fill(PLATFORM_EMAIL);
    await page.locator('input[name="password"]').fill(PLATFORM_PASSWORD);
    await page.getByRole('button', { name: /sign in securely/i }).click();
    await expect(page).toHaveURL(/\/platform\/dashboard/, { timeout: 30_000 });
    await expect(page.getByRole('link', { name: /create tenant/i })).toBeVisible({ timeout: 30_000 });

    // TENANT DIRECTORY — client navigation (full reloads race refresh-token rotation).
    await page.locator('nav a[href="/platform/tenants"]').first().click();
    await expect(page).toHaveURL(/\/platform\/tenants$/);

    // CREATE TENANT
    await page.getByRole('link', { name: /create tenant/i }).click();
    await expect(page).toHaveURL(/\/platform\/tenants\/new/);

    await expect(page.locator('#displayName')).toBeVisible({ timeout: 30_000 });
    await page.locator('#displayName').fill(tenantDisplayName);
    await expect(page.locator('#legalName')).toBeVisible({ timeout: 30_000 });
    await page.locator('#legalName').fill(tenantLegalName);
    await page.locator('button[type="submit"]').click();

    // Step 2 — Commercial
    await expect(page.locator('#planId')).toBeVisible({ timeout: 30_000 });
    await page.locator('#planId').selectOption({ index: 1 }).catch(() => {});
    await expect(page.locator('#seatLimit')).toBeVisible({ timeout: 30_000 });
    await page.locator('#seatLimit').fill('50');
    const storage = page.locator('#storageLimitGb');
    if (await storage.isVisible()) {
      await storage.fill('25');
    }
    await page.locator('button[type="submit"]').click();

    // Step 3 — Product (hosting region + plan entitlements)
    await expect(page.locator('#deploymentRegionId')).toBeVisible({ timeout: 30_000 });
    await page.locator('#deploymentRegionId').selectOption({ index: 1 }).catch(() => {});
    await page.locator('button[type="submit"]').click();

    // Step 4 — Administrator
    await expect(page.locator('#primaryAdminName')).toBeVisible({ timeout: 30_000 });
    await page.locator('#primaryAdminName').fill('Primary Admin E2E');
    await expect(page.locator('#primaryAdminEmail')).toBeVisible({ timeout: 30_000 });
    await page.locator('#primaryAdminEmail').fill(primaryAdminEmail);
    await page.locator('button[type="submit"]').click();

    // REVIEW + CREATE
    const afterCreate = Date.now();
    await page.getByRole('button', { name: /create and send invitation/i }).click();

    const token = await waitForInvitationToken({
      toEmail: primaryAdminEmail,
      afterMs: afterCreate - 2000,
      timeoutMs: 30_000,
    });

    // Guest-only invitation page: leave the platform session first.
    await page.getByRole('button', { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });

    await page.goto(`/invitations/accept?token=${token}`);
    await expect(page).toHaveURL(/\/invitations\/accept/);
    await expect(page.locator('input[name="password"]')).toBeVisible({ timeout: 30_000 });
    await page.locator('input[name="password"]').fill('Invitee@12345');
    await page.locator('input[name="confirmPassword"]').fill('Invitee@12345');
    await page.locator('input[type="checkbox"][name="acceptTerms"]').check();
    await page.locator('button[type="submit"]').click();

    // Tenant dashboard should load (not the platform shell).
    await expect(page).toHaveURL(/localhost:\d+\/dashboard(?:\?.*)?$/, { timeout: 30_000 });

    // Tenant identity cannot use Platform Super Admin routes.
    await page.goto('/platform/dashboard');
    await expect(page).toHaveURL(/\/forbidden/, { timeout: 30_000 });

    await page.goto('/logout');
    await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });

    await page.locator('input[name="email"]').fill(PLATFORM_EMAIL);
    await page.locator('input[name="password"]').fill(PLATFORM_PASSWORD);
    await page.getByRole('button', { name: /sign in securely/i }).click();
    await expect(page).toHaveURL(/\/platform\/dashboard/, { timeout: 30_000 });
    await page.locator('nav a[href="/platform/tenants"]').first().click();
    await expect(page.getByRole('link', { name: tenantDisplayName }).first()).toBeVisible({ timeout: 30_000 });
  });

  test('save draft provisions DRAFT without invitation', async ({ page }) => {
    const stamp = Date.now();
    const tenantDisplayName = `E2E Draft ${stamp}`;
    const tenantLegalName = `E2E Draft Legal ${stamp}`;
    const PLATFORM_EMAIL = process.env.PLATFORM_SUPER_ADMIN_EMAIL ?? 'zubair.m1815@gmail.com';
    const PLATFORM_PASSWORD = process.env.PLATFORM_SUPER_ADMIN_PASSWORD ?? 'Super@123';

    await page.goto('/login');
    await page.locator('input[name="email"]').fill(PLATFORM_EMAIL);
    await page.locator('input[name="password"]').fill(PLATFORM_PASSWORD);
    await page.getByRole('button', { name: /sign in securely/i }).click();
    await expect(page).toHaveURL(/\/platform\/dashboard/, { timeout: 30_000 });

    await page.locator('nav a[href="/platform/tenants"]').first().click();
    await page.getByRole('link', { name: /create tenant/i }).click();
    await expect(page.locator('#displayName')).toBeVisible({ timeout: 30_000 });
    await page.locator('#displayName').fill(tenantDisplayName);
    await page.locator('#legalName').fill(tenantLegalName);
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('#planId')).toBeVisible({ timeout: 30_000 });
    await page.locator('#planId').selectOption({ index: 1 }).catch(() => {});
    await page.locator('#seatLimit').fill('25');
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('#deploymentRegionId')).toBeVisible({ timeout: 30_000 });
    await page.locator('#deploymentRegionId').selectOption({ index: 1 }).catch(() => {});
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('#primaryAdminName')).toBeVisible({ timeout: 30_000 });
    await page.locator('#primaryAdminName').fill('Draft Admin E2E');
    await page.locator('#primaryAdminEmail').fill(`draft.admin.${stamp}@example.com`);
    await page.locator('button[type="submit"]').click();

    await page.getByRole('button', { name: /save draft/i }).click();
    await expect(page.getByText(/tenant created/i).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/draft/i).first()).toBeVisible();
    await expect(page.getByText(/invitation status/i)).toHaveCount(0);
  });

  test('RTL sanity: creates tenant flow page renders RTL', async ({ page }) => {
    const PLATFORM_EMAIL = process.env.PLATFORM_SUPER_ADMIN_EMAIL ?? 'zubair.m1815@gmail.com';
    const PLATFORM_PASSWORD = process.env.PLATFORM_SUPER_ADMIN_PASSWORD ?? 'Super@123';

    // Login in English first, then switch locale for the platform surface.
    await page.goto('/login');
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 30_000 });
    await page.locator('input[name="email"]').fill(PLATFORM_EMAIL);
    await page.locator('input[name="password"]').fill(PLATFORM_PASSWORD);
    await page.locator('form button[type="submit"]').click();
    await expect(page).toHaveURL(/\/platform\/dashboard/, { timeout: 30_000 });
    await page.getByRole('button', { name: 'اردو' }).click();
    await expect(page.locator('html[dir="rtl"]')).toBeVisible({ timeout: 30_000 });
  });

  test('sidebar navigation returns to Platform Overview without reload', async ({ page }) => {
    const PLATFORM_EMAIL = process.env.PLATFORM_SUPER_ADMIN_EMAIL ?? 'zubair.m1815@gmail.com';
    const PLATFORM_PASSWORD = process.env.PLATFORM_SUPER_ADMIN_PASSWORD ?? 'Super@123';

    await page.goto('/login');
    await page.locator('input[name="email"]').fill(PLATFORM_EMAIL);
    await page.locator('input[name="password"]').fill(PLATFORM_PASSWORD);
    await page.getByRole('button', { name: /sign in securely/i }).click();
    await expect(page).toHaveURL(/\/platform\/dashboard/, { timeout: 30_000 });

    const overviewLink = page.locator('nav a[href="/platform/dashboard"]').first();
    const tenantsLink = page.locator('nav a[href="/platform/tenants"]').first();
    const usageLink = page.locator('nav a[href="/platform/usage"]').first();
    const healthLink = page.locator('nav a[href="/platform/integration-health"]').first();

    await tenantsLink.click();
    await expect(page).toHaveURL(/\/platform\/tenants$/);
    await expect(page.locator('#usage-threshold')).toBeVisible();
    await page.getByRole('table', { name: /tenants/i }).getByRole('button', { name: 'More', exact: true }).first().click();
    await expect(page.getByRole('menuitem', { name: /view audit/i })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /edit/i })).toBeVisible();
    await page.keyboard.press('Escape');
    await usageLink.click();
    await expect(page).toHaveURL(/\/platform\/usage/);
    await overviewLink.click();
    await expect(page).toHaveURL(/\/platform\/dashboard/);
    await healthLink.click();
    await expect(page).toHaveURL(/\/platform\/integration-health/);
    await overviewLink.click();
    await expect(page).toHaveURL(/\/platform\/dashboard/);
    await expect(overviewLink).toHaveAttribute('aria-current', 'page');
  });

  test('sign out revokes session and blocks /platform after reload', async ({ page }) => {
    const PLATFORM_EMAIL = process.env.PLATFORM_SUPER_ADMIN_EMAIL ?? 'zubair.m1815@gmail.com';
    const PLATFORM_PASSWORD = process.env.PLATFORM_SUPER_ADMIN_PASSWORD ?? 'Super@123';

    await page.goto('/login');
    await page.locator('input[name="email"]').fill(PLATFORM_EMAIL);
    await page.locator('input[name="password"]').fill(PLATFORM_PASSWORD);
    await page.getByRole('button', { name: /sign in securely/i }).click();
    await expect(page).toHaveURL(/\/platform\/dashboard/, { timeout: 30_000 });

    await page.getByRole('button', { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });

    await page.goto('/platform/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });

    await page.reload();
    await page.goto('/platform/tenants');
    await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
  });
});

test.describe('Platform Super Admin — responsive shell', () => {
  test('desktop rail, tablet drawer, and mobile cards', async ({ page }) => {
    const PLATFORM_EMAIL = process.env.PLATFORM_SUPER_ADMIN_EMAIL ?? 'zubair.m1815@gmail.com';
    const PLATFORM_PASSWORD = process.env.PLATFORM_SUPER_ADMIN_PASSWORD ?? 'Super@123';

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/login');
    await page.locator('input[name="email"]').fill(PLATFORM_EMAIL);
    await page.locator('input[name="password"]').fill(PLATFORM_PASSWORD);
    await page.getByRole('button', { name: /sign in securely/i }).click();
    await expect(page).toHaveURL(/\/platform\/dashboard/, { timeout: 30_000 });
    await expect(page.locator('aside').first()).toBeVisible();

    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(page.locator('aside').first()).toBeVisible();

    await page.setViewportSize({ width: 900, height: 700 });
    await expect(page.getByRole('button', { name: 'Open navigation menu' })).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    await page.locator('[role="dialog"] nav a[href="/platform/tenants"]').click();
    await expect(page).toHaveURL(/\/platform\/tenants/, { timeout: 30_000 });
    await expect(page.locator('article').first()).toBeVisible({ timeout: 30_000 });
  });
});
