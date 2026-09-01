import { expect, type Page } from '@playwright/test';

export const PLATFORM_EMAIL = process.env.PLATFORM_SUPER_ADMIN_EMAIL ?? 'zubair.m1815@gmail.com';
export const PLATFORM_PASSWORD = process.env.PLATFORM_SUPER_ADMIN_PASSWORD ?? 'Super@123';
export const API_BASE = process.env.API_BASE ?? 'http://127.0.0.1:3001/api/v1';

export async function platformLogin(page: Page) {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(PLATFORM_EMAIL);
  await page.locator('input[name="password"]').fill(PLATFORM_PASSWORD);
  await page.getByRole('button', { name: /sign in securely/i }).click();
  await expect(page).toHaveURL(/\/platform\/dashboard/, { timeout: 30_000 });
}

export async function switchPlatformLocale(page: Page, localeLabel: string) {
  await page.getByRole('button', { name: /^language$/i }).click();
  await page.getByRole('listbox').getByRole('button', { name: localeLabel }).click();
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator(`html[dir="${localeLabel === 'اردو' ? 'rtl' : 'ltr'}"]`)).toBeVisible({
    timeout: 30_000,
  });
}

export async function platformApiLogin(): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: PLATFORM_EMAIL, password: PLATFORM_PASSWORD }),
  });
  expect(res.ok).toBeTruthy();
  const body = (await res.json()) as { data?: { accessToken?: string }; accessToken?: string };
  const token = body.data?.accessToken ?? body.accessToken;
  if (!token) {
    throw new Error('Platform login did not return an access token');
  }
  return token;
}
