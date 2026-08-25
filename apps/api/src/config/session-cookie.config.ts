import { registerAs } from '@nestjs/config';

// Browser refresh-token cookie (HttpOnly). Centralised — no hardcoded production domain.
export const sessionCookieConfig = registerAs('sessionCookie', () => {
  const sameSiteRaw = (process.env['AUTH_REFRESH_COOKIE_SAMESITE'] ?? 'lax').toLowerCase();
  const sameSite =
    sameSiteRaw === 'strict' || sameSiteRaw === 'none' || sameSiteRaw === 'lax'
      ? sameSiteRaw
      : 'lax';

  const secureEnv = process.env['AUTH_REFRESH_COOKIE_SECURE'];
  const isProduction = (process.env['APP_ENV'] ?? 'development') === 'production';
  const secure =
    secureEnv === 'true' ? true : secureEnv === 'false' ? false : isProduction;

  return {
    name: process.env['AUTH_REFRESH_COOKIE_NAME'] ?? 'wcos_refresh',
    path: process.env['AUTH_REFRESH_COOKIE_PATH'] ?? '/api/v1/auth',
    secure,
    sameSite: sameSite as 'lax' | 'strict' | 'none',
    // Optional domain — omit in local/dev so host-only cookies work across ports via CORS credentials.
    domain: process.env['AUTH_REFRESH_COOKIE_DOMAIN'] || undefined,
    httpOnly: true as const,
  };
});
