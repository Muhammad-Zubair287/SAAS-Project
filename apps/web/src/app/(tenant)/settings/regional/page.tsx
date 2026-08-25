'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../../components/common/page-header';
import { LoadingSpinner } from '../../../../components/feedback/loading-spinner';
import {
  useTenantRegional,
  useUpdateTenantRegional,
} from '../../../../modules/tenant/hooks/use-tenant-admin';

const LOCALE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'ur', label: 'Urdu' },
] as const;

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const DEFAULT_WORKING_WEEK = [true, true, true, true, true, false, false];

export default function RegionalSettingsPage() {
  const t = useTranslations();
  const { data, isLoading } = useTenantRegional();
  const mutation = useUpdateTenantRegional();
  const form = useForm({
    defaultValues: {
      defaultLocale: 'en',
      dateFormat: 'DD/MM/YYYY',
      numberFormat: '1,234.56',
      currencyDisplay: 'symbol',
      defaultTimezone: 'Asia/Karachi',
      weekStart: 1,
      enabledLocales: ['en'],
      workingWeekPattern: DEFAULT_WORKING_WEEK,
    },
  });

  useEffect(() => {
    const r = data?.data;
    if (!r) return;
    form.reset({
      defaultLocale: r.defaultLocale,
      dateFormat: r.dateFormat ?? 'DD/MM/YYYY',
      numberFormat: r.numberFormat ?? '1,234.56',
      currencyDisplay: r.currencyDisplay ?? 'symbol',
      defaultTimezone: r.defaultTimezone,
      weekStart: r.weekStart ?? 1,
      enabledLocales: r.enabledLocales?.length ? r.enabledLocales : ['en'],
      workingWeekPattern:
        r.workingWeekPattern?.length === 7 ? r.workingWeekPattern : DEFAULT_WORKING_WEEK,
    });
  }, [data, form]);

  const enabledLocales = form.watch('enabledLocales');
  const workingWeekPattern = form.watch('workingWeekPattern');

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title={t('tenant.settings.regional.title')}
        description={t('tenant.settings.regional.description')}
      />
      <form
        className="space-y-3 rounded-lg border border-border-default bg-surface-card p-4"
        onSubmit={form.handleSubmit(async (values) => {
          await mutation.mutateAsync({
            ...values,
            weekStart: Number(values.weekStart),
            enabledLocales: values.enabledLocales.includes(values.defaultLocale)
              ? values.enabledLocales
              : [values.defaultLocale, ...values.enabledLocales],
            workingWeekPattern: values.workingWeekPattern,
          });
        })}
      >
        {(
          [
            'defaultLocale',
            'dateFormat',
            'numberFormat',
            'currencyDisplay',
            'defaultTimezone',
            'weekStart',
          ] as const
        ).map((name) => (
          <label key={name} className="block space-y-1">
            <span className="text-body-sm font-medium">{name}</span>
            <input
              className="w-full rounded-md border border-border-default px-3 py-2"
              {...form.register(name)}
            />
          </label>
        ))}
        <fieldset className="space-y-2 rounded-md border border-border-default p-3">
          <legend className="px-1 text-body-sm font-medium">
            {t('tenant.settings.regional.enabledLocales')}
          </legend>
          <div className="flex flex-wrap gap-3">
            {LOCALE_OPTIONS.map((locale) => (
              <label key={locale.value} className="flex items-center gap-2 text-body-sm">
                <input
                  type="checkbox"
                  checked={enabledLocales.includes(locale.value)}
                  onChange={(e) => {
                    form.setValue(
                      'enabledLocales',
                      e.target.checked
                        ? [...enabledLocales, locale.value].filter((v, i, a) => a.indexOf(v) === i)
                        : enabledLocales.filter((v) => v !== locale.value),
                      { shouldDirty: true },
                    );
                  }}
                />
                {locale.label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="space-y-2 rounded-md border border-border-default p-3">
          <legend className="px-1 text-body-sm font-medium">
            {t('tenant.settings.regional.workingWeekPattern')}
          </legend>
          <div className="flex flex-wrap gap-3">
            {WEEKDAYS.map((day, index) => (
              <label key={day} className="flex items-center gap-2 text-body-sm">
                <input
                  type="checkbox"
                  checked={Boolean(workingWeekPattern[index])}
                  onChange={(e) => {
                    const next = [...workingWeekPattern];
                    next[index] = e.target.checked;
                    form.setValue('workingWeekPattern', next, { shouldDirty: true });
                  }}
                />
                {day}
              </label>
            ))}
          </div>
        </fieldset>
        <div dir="rtl" className="rounded-md border border-dashed border-border-default p-3">
          <p className="text-caption text-text-secondary">{t('tenant.settings.regional.rtlPreview')}</p>
          <p className="text-body-md">آپ کا ٹیننٹ مقامی ترتیبات کے ساتھ تیار ہے۔</p>
        </div>
        {mutation.isSuccess ? (
          <p className="text-body-sm text-status-success">{t('tenant.settings.regional.saved')}</p>
        ) : null}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-md bg-brand-blue-600 px-4 py-2 text-white disabled:opacity-60"
        >
          {t('tenant.settings.regional.save')}
        </button>
      </form>
    </div>
  );
}
