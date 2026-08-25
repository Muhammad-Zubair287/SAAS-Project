'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../../components/common/page-header';
import { LoadingSpinner } from '../../../../components/feedback/loading-spinner';
import {
  useTenantProfile,
  useUpdateTenantProfile,
} from '../../../../modules/tenant/hooks/use-tenant-admin';

const schema = z.object({
  displayName: z.string().min(2).max(160),
  legalName: z.string().min(2).max(200),
  registrationNumber: z.string().max(120).optional().or(z.literal('')),
  industry: z.string().max(120).optional().or(z.literal('')),
  employeeSizeBand: z.string().max(40).optional().or(z.literal('')),
  addressLine1: z.string().max(200).optional().or(z.literal('')),
  addressLine2: z.string().max(200).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  stateProvince: z.string().max(100).optional().or(z.literal('')),
  postalCode: z.string().max(30).optional().or(z.literal('')),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().max(40).optional().or(z.literal('')),
  countryCode: z.string().length(2),
  baseCurrency: z.string().length(3),
  defaultTimezone: z.string().min(1),
  financialYearStart: z.string().max(10).optional().or(z.literal('')),
  payrollMonthConfig: z.string().max(40).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

export default function CompanySettingsPage() {
  const t = useTranslations();
  const { data, isLoading } = useTenantProfile();
  const mutation = useUpdateTenantProfile();
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    const profile = data?.data;
    if (!profile) return;
    form.reset({
      displayName: profile.displayName,
      legalName: profile.legalName,
      registrationNumber: profile.registrationNumber ?? '',
      industry: profile.industry ?? '',
      employeeSizeBand: profile.employeeSizeBand ?? '',
      addressLine1: profile.addressLine1 ?? '',
      addressLine2: profile.addressLine2 ?? '',
      city: profile.city ?? '',
      stateProvince: profile.stateProvince ?? '',
      postalCode: profile.postalCode ?? '',
      contactEmail: profile.contactEmail ?? '',
      contactPhone: profile.contactPhone ?? '',
      countryCode: profile.countryCode,
      baseCurrency: profile.baseCurrency,
      defaultTimezone: profile.defaultTimezone,
      financialYearStart: profile.financialYearStart ?? '',
      payrollMonthConfig: profile.payrollMonthConfig ?? '',
    });
  }, [data, form]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={t('tenant.settings.company.title')}
        description={t('tenant.settings.company.description')}
      />
      <form
        className="space-y-4 rounded-lg border border-border-default bg-surface-card p-4 sm:p-6"
        onSubmit={form.handleSubmit(async (values) => {
          await mutation.mutateAsync(values);
        })}
      >
        {(
          [
            ['displayName', 'Display name'],
            ['legalName', 'Legal name'],
            ['registrationNumber', 'Registration'],
            ['industry', 'Industry'],
            ['employeeSizeBand', 'Employee size'],
            ['addressLine1', 'Address line 1'],
            ['addressLine2', 'Address line 2'],
            ['city', 'City'],
            ['stateProvince', 'State / province'],
            ['postalCode', 'Postal code'],
            ['contactEmail', 'Contact email'],
            ['contactPhone', 'Contact phone'],
            ['countryCode', 'Country code'],
            ['baseCurrency', 'Currency'],
            ['defaultTimezone', 'Timezone'],
            ['financialYearStart', 'Financial year start'],
            ['payrollMonthConfig', 'Payroll month config'],
          ] as const
        ).map(([name, label]) => (
          <label key={name} className="block space-y-1">
            <span className="text-body-sm font-medium text-text-primary">{label}</span>
            <input
              className="w-full rounded-md border border-border-default px-3 py-2 text-body-md"
              {...form.register(name)}
            />
            {form.formState.errors[name] ? (
              <span className="text-caption text-status-danger">
                {form.formState.errors[name]?.message}
              </span>
            ) : null}
          </label>
        ))}
        {mutation.isSuccess ? (
          <p className="text-body-sm text-status-success">{t('tenant.settings.company.saved')}</p>
        ) : null}
        {mutation.isError ? (
          <p className="text-body-sm text-status-danger">{t('common.error')}</p>
        ) : null}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-md bg-brand-blue-600 px-4 py-2 text-body-sm font-medium text-white disabled:opacity-60"
        >
          {t('tenant.settings.company.save')}
        </button>
      </form>
    </div>
  );
}
