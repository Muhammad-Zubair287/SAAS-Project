/**
 * ESS Scope A smoke (gated).
 * Run with: ESS_E2E=1 npx playwright test e2e/ess.spec.ts
 */
import { test, expect } from '@playwright/test';

const enabled = process.env.ESS_E2E === '1';

test.describe('Employee Self-Service Scope A', () => {
  test.skip(!enabled, 'Set ESS_E2E=1 with authenticated employee storage to run');

  test('ESS home and core modules load', async ({ page }) => {
    await page.goto('/my');
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 30_000 });

    await page.goto('/my/attendance');
    await expect(page.getByRole('heading').first()).toBeVisible();

    await page.goto('/my/profile');
    await expect(page.getByRole('heading').first()).toBeVisible();

    await page.goto('/my/documents');
    await expect(page.getByRole('heading').first()).toBeVisible();

    await page.goto('/my/requests');
    await expect(page.getByRole('heading').first()).toBeVisible();

    await page.goto('/my/notifications');
    await expect(page.getByRole('heading').first()).toBeVisible();

    await page.goto('/my/leave');
    await expect(page.getByRole('heading').first()).toBeVisible();

    await page.goto('/my/payslips');
    await expect(page.getByRole('heading').first()).toBeVisible();
  });
});
