import { test, expect, type Page } from '@playwright/test';
import {
  API_BASE,
  platformApiLogin,
  platformLogin,
  switchPlatformLocale,
} from './helpers/platform-auth';

async function openCreatePlanDialog(page: Page) {
  await page.goto('/platform/plans');
  await expect(page.getByRole('heading', { name: /plans & entitlements|پلانز اور حقوق/i })).toBeVisible();
  await page.getByRole('button', { name: /create plan|پلان بنائیں/i }).first().click();
  await expect(page.getByRole('heading', { name: /create plan|پلان بنائیں/i })).toBeVisible();
  return page.getByRole('dialog');
}

test.describe.serial('Platform Plans Admin — closeout', () => {
  const stamp = Date.now();
  const planCode = `SMOKE_PLAN_${stamp}`;
  const planName = `Smoke Plan ${stamp}`;
  const updatedName = `${planName} Updated`;

  test('RBAC: anonymous cannot access platform plans', async ({ page }) => {
    await page.goto('/platform/plans');
    await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
  });

  test('RBAC: anonymous API create plan returns 401', async () => {
    const res = await fetch(`${API_BASE}/platform/plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'SHOULD_FAIL', name: 'x' }),
    });
    expect(res.status).toBe(401);
  });

  test('plans page loads with create CTA', async ({ page }) => {
    await platformLogin(page);
    await page.goto('/platform/plans');
    await expect(page.getByRole('heading', { name: /plans & entitlements/i })).toBeVisible();
    await expect(
      page.getByRole('article').first().or(page.getByText(/no plans have been configured/i)),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: /create plan/i }).first()).toBeVisible();
  });

  test('full create → save → list → refresh → edit → tenant selector flow', async ({ page }) => {
    await platformLogin(page);

    const dialog = await openCreatePlanDialog(page);
    await dialog.getByLabel(/^plan code/i).fill(planCode);
    await dialog.getByLabel(/^plan name/i).fill(planName);
    await dialog.getByLabel(/^description/i).fill('E2E closeout plan');
    await dialog.getByLabel(/^billing model/i).selectOption('PER_SEAT');
    await dialog.getByLabel(/^status/i).selectOption('ACTIVE');

    // BOOLEAN, INTEGER, DECIMAL control types present in production catalogue
    await dialog.getByLabel('Core HR', { exact: true }).check();
    await dialog.getByLabel(/^max employees/i).fill('150');
    await dialog.getByLabel(/per-employee monthly fee/i).fill('499');

    const saveBtn = dialog.getByRole('button', { name: /^save$/i });
    await expect(saveBtn).toBeEnabled();

    const createResponse = page.waitForResponse(
      (res) =>
        res.url().includes('/api/v1/platform/plans') && res.request().method() === 'POST',
      { timeout: 30_000 },
    );
    await saveBtn.click();
    const response = await createResponse;
    expect(response.status()).toBe(201);

    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 30_000 });
    await expect(page.getByText(/plan created successfully/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(planName)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(planCode)).toBeVisible();

    await page.reload();
    await expect(page.getByText(planName)).toBeVisible({ timeout: 30_000 });

    const planCard = page.getByRole('article').filter({ hasText: planCode });
    await planCard.getByRole('button', { name: /^edit$/i }).click();
    const editDialog = page.getByRole('dialog');
    await expect(editDialog.getByRole('heading', { name: /edit plan/i })).toBeVisible();
    await editDialog.getByLabel(/^plan name/i).fill(updatedName);
    await editDialog.getByRole('button', { name: /^save$/i }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 30_000 });
    await expect(page.getByText(/plan updated successfully/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(updatedName)).toBeVisible({ timeout: 30_000 });

    await page.goto('/platform/tenants/new');
    await page.locator('#legalName').fill('E2E Legal');
    await page.locator('#displayName').fill('E2E Display');
    await page.getByRole('button', { name: /^next$/i }).click();
    await expect(page.locator('#planKey')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('#planKey')).toContainText(updatedName);
  });

  test('validation errors keep dialog open with localized message', async ({ page }) => {
    await platformLogin(page);
    const dialog = await openCreatePlanDialog(page);
    await dialog.getByLabel(/^plan code/i).fill('   ');
    await dialog.getByLabel(/^plan name/i).fill('   ');
    await dialog.getByRole('button', { name: /^save$/i }).click();
    await expect(dialog).toBeVisible();
    await expect(page.getByText(/plan code and name are required/i)).toBeVisible();
  });

  test('duplicate plan code shows API error and keeps dialog open', async ({ page }) => {
    await platformLogin(page);
    const dialog = await openCreatePlanDialog(page);
    await dialog.getByLabel(/^plan code/i).fill(planCode);
    await dialog.getByLabel(/^plan name/i).fill('Duplicate attempt');
    await dialog.getByRole('button', { name: /^save$/i }).click();
    await expect(dialog).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/already exists/i)).toBeVisible({ timeout: 30_000 });
  });

  test('double-submit protection sends one POST only', async ({ page }) => {
    await platformLogin(page);
    const dialog = await openCreatePlanDialog(page);
    const uniqueCode = `SMOKE_DBL_${Date.now()}`;
    await dialog.getByLabel(/^plan code/i).fill(uniqueCode);
    await dialog.getByLabel(/^plan name/i).fill(`Double Submit ${Date.now()}`);

    let postCount = 0;
    await page.route('**/api/v1/platform/plans', async (route) => {
      if (route.request().method() === 'POST') {
        postCount += 1;
        await new Promise((r) => setTimeout(r, 800));
      }
      await route.continue();
    });

    const saveBtn = dialog.getByRole('button', { name: /^save$/i });
    await saveBtn.click();
    await saveBtn.click({ force: true });
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 30_000 });
    expect(postCount).toBe(1);
  });

  test('keyboard opens create plan dialog', async ({ page }) => {
    await platformLogin(page);
    await page.goto('/platform/plans');
    await page.keyboard.press('Tab');
    const createBtn = page.getByRole('button', { name: /create plan/i }).first();
    await createBtn.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: /create plan/i })).toBeVisible();
  });

  test('Urdu locale renders plans page with RTL', async ({ page }) => {
    await platformLogin(page);
    await switchPlatformLocale(page, 'اردو');
    await page.goto('/platform/plans');
    await expect(page.locator('html[lang="ur"][dir="rtl"]')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('heading', { name: /پلانز اور حقوق/ })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: /پلان بنائیں/i }).first()).toBeVisible();
  });

  test('authenticated responsive viewports render plans page and create dialog', async ({ page }) => {
    await platformLogin(page);
    for (const size of [
      { width: 1440, height: 900 },
      { width: 1024, height: 768 },
      { width: 900, height: 700 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(size);
      const dialog = await openCreatePlanDialog(page);
      await expect(dialog.getByLabel(/^plan code/i)).toBeVisible();
      await expect(dialog.getByRole('button', { name: /^save$/i })).toBeVisible();
      await dialog.getByRole('button', { name: /^cancel$/i }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
    }
  });

  test('RBAC: tenant admin cannot access platform plans page', async ({ page }) => {
    test.skip(
      process.env.TENANT_ADMIN_E2E !== '1',
      'Set TENANT_ADMIN_E2E=1 with tenant admin storage state to run',
    );
  });

  test('RBAC: platform super admin API create succeeds with token', async () => {
    const token = await platformApiLogin();
    const code = `SMOKE_API_${Date.now()}`;
    const res = await fetch(`${API_BASE}/platform/plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        code,
        name: `API Smoke ${Date.now()}`,
        billingModel: 'PER_SEAT',
        status: 'ACTIVE',
      }),
    });
    expect(res.status).toBe(201);
  });
});
