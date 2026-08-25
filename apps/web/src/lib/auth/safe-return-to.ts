import { buildTenantLoginPath, readPreferredTenantSlug } from './login-context';

/**
 * Allows only same-origin relative paths. Blocks open redirects.
 */
export function sanitizeReturnTo(
  value: string | null | undefined,
  fallback = '/dashboard',
): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (!trimmed.startsWith('/')) return fallback;
  if (trimmed.startsWith('//')) return fallback;
  if (trimmed.includes('://')) return fallback;
  if (trimmed.includes('\\')) return fallback;
  // Block auth loops
  if (
    trimmed.startsWith('/login') ||
    trimmed.startsWith('/t/') ||
    trimmed.startsWith('/logout') ||
    trimmed.startsWith('/session-expired') ||
    trimmed.startsWith('/password-reset') ||
    trimmed.startsWith('/invitations') ||
    trimmed.startsWith('/mfa/') ||
    trimmed.startsWith('/unauthorized') ||
    trimmed.startsWith('/forbidden')
  ) {
    return fallback;
  }
  return trimmed;
}

/** Platform login URL, or last tenant-specific login URL when known. */
export function buildLoginHref(returnTo?: string | null): string {
  const slug = readPreferredTenantSlug();
  const base = slug ? buildTenantLoginPath(slug) : '/login';
  const safe = returnTo ? sanitizeReturnTo(returnTo, '') : '';
  if (!safe) return base;
  return `${base}?returnTo=${encodeURIComponent(safe)}`;
}
