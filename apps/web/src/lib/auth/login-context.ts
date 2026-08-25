/**
 * Non-secret preference for returning tenant users to the tenant-specific
 * SCR-AUTH-01 URL after session expiry. Slug is already public in the URL.
 * Never stores tokens or UUIDs.
 */
const COOKIE = 'wcos_login_slug';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // 180 days

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function readPreferredTenantSlug(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE}=`));
  if (!match) return null;
  const value = decodeURIComponent(match.slice(COOKIE.length + 1));
  return SLUG_RE.test(value) ? value : null;
}

export function rememberTenantLoginSlug(slug: string): void {
  if (typeof document === 'undefined') return;
  const normalised = slug.toLowerCase().trim();
  if (!SLUG_RE.test(normalised)) return;
  document.cookie = `${COOKIE}=${encodeURIComponent(normalised)}; path=/; max-age=${MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function clearPreferredTenantSlug(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export function buildTenantLoginPath(slug: string): string {
  return `/t/${encodeURIComponent(slug)}/login`;
}
