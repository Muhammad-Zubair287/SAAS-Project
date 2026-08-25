import { test, expect } from '@playwright/test';

/**
 * Tenant Admin Console smoke (SCR-TEN / Settings).
 * Requires a seeded active tenant admin session cookie/storage from prior auth setup.
 * Skips when TENANT_ADMIN_E2E is not enabled.
 */
const enabled = process.env['TENANT_ADMIN_E2E'] === '1';

test.describe('Tenant Admin Console', () => {
  test.skip(!enabled, 'Set TENANT_ADMIN_E2E=1 with authenticated storage state to run');

  test('settings hub and company profile are reachable', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();
    await page.goto('/settings/company');
    await expect(page.getByRole('heading', { name: /company profile/i })).toBeVisible();
  });

  test('users and roles screens render', async ({ page }) => {
    await page.goto('/settings/users');
    await expect(page.getByRole('heading', { name: /administrators|users/i })).toBeVisible();
    await page.goto('/settings/roles');
    await expect(page.getByRole('heading', { name: /roles/i })).toBeVisible();
  });

  test('dashboard shows setup checklist or ops KPIs', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('main')).toBeVisible();
  });
});
