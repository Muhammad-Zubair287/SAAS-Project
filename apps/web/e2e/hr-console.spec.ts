/**
 * HR Console Scope A smoke (gated).
 * Run with: HR_CONSOLE_E2E=1 npx playwright test e2e/hr-console.spec.ts
 */
import { test, expect } from '@playwright/test';

const enabled = process.env.HR_CONSOLE_E2E === '1';

test.describe('HR Console Scope A', () => {
  test.skip(!enabled, 'Set HR_CONSOLE_E2E=1 with authenticated storage to run');

  test('HR dashboard and employees directory load', async ({ page }) => {
    await page.goto('/hr');
    await expect(page.getByRole('heading', { name: /HR Dashboard/i })).toBeVisible({
      timeout: 30_000,
    });
    await page.goto('/employees');
    await expect(page.getByRole('heading').first()).toBeVisible();
    await page.goto('/employees/data-quality');
    await expect(page.getByText(/data quality/i)).toBeVisible();
  });
});
