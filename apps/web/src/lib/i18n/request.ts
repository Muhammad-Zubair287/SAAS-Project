import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import type { AbstractIntlMessages } from 'next-intl';
import { defaultLocale, locales, type Locale } from './config';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get('NEXT_LOCALE')?.value;
  const locale = locales.includes(raw as Locale) ? (raw as Locale) : defaultLocale;

  const messages = (
    await import(`../../localization/${locale}.json`)
  ).default as AbstractIntlMessages;

  return {
    locale,
    messages,
  };
});
