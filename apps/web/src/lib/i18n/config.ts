export const locales = ['en', 'ur'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export const localeConfig: Record<
  Locale,
  { dir: 'ltr' | 'rtl'; label: string; nativeLabel: string }
> = {
  en: { dir: 'ltr', label: 'English', nativeLabel: 'English' },
  ur: { dir: 'rtl', label: 'Urdu', nativeLabel: 'اردو' },
};
