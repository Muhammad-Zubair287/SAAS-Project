'use client';

import { useLocale } from 'next-intl';
import { localeConfig, type Locale } from '../lib/i18n/config';

export function useLocaleInfo() {
  const locale = useLocale() as Locale;
  const cfg = localeConfig[locale] ?? localeConfig['en'];
  return {
    locale,
    dir: cfg.dir,
    label: cfg.label,
    nativeLabel: cfg.nativeLabel,
    isRtl: cfg.dir === 'rtl',
  };
}
