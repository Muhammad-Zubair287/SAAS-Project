import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { defaultLocale, locales, type Locale } from './lib/i18n/config';

export function middleware(request: NextRequest) {
  const existing = request.cookies.get('NEXT_LOCALE')?.value;
  const locale = locales.includes(existing as Locale)
    ? (existing as Locale)
    : defaultLocale;

  const response = NextResponse.next();
  if (!existing) {
    response.cookies.set('NEXT_LOCALE', locale, {
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
};
