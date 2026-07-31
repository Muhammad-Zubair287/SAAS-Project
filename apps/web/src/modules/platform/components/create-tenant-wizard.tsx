'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCreateTenant } from '../hooks/use-tenant-mutations';
import { ROUTES } from '../../../constants/routes.constants';
import {
  SUPPORTED_COUNTRIES,
  SUPPORTED_CURRENCIES,
  SUPPORTED_TIMEZONES,
  HOSTING_REGIONS,
} from '../constants/platform.constants';
import type { CreateTenantPayload } from '../types/platform.types';

const INITIAL_FORM: CreateTenantPayload = {
  displayName: '',
  legalName: '',
  countryCode: 'PK',
  baseCurrency: 'PKR',
  defaultTimezone: 'Asia/Karachi',
  defaultLocale: 'en-PK',
  // TODO: replace with real UUID from deployment regions API once available.
  deploymentRegionId: '',
  // TODO: replace with real UUID from plans API (M16) once available.
  planId: '',
  seatLimit: 100,
  billingCycle: 'monthly',
  trialEndsAt: undefined,
  primaryAdmin: { name: '', email: '' },
};

const STEPS = ['company', 'commercial', 'admin'] as const;
type Step = (typeof STEPS)[number];

export function CreateTenantWizard() {
  const t = useTranslations();
  const router = useRouter();
  const create = useCreateTenant();
  const [step, setStep] = useState<Step>('company');
  const [form, setForm] = useState<CreateTenantPayload>(INITIAL_FORM);

  const stepIndex = STEPS.indexOf(step);

  function update<K extends keyof CreateTenantPayload>(key: K, value: CreateTenantPayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateAdmin<K extends keyof CreateTenantPayload['primaryAdmin']>(
    key: K,
    value: string,
  ) {
    setForm((prev) => ({ ...prev, primaryAdmin: { ...prev.primaryAdmin, [key]: value } }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step !== 'admin') {
      setStep(STEPS[stepIndex + 1] as Step);
      return;
    }
    const result = await create.mutateAsync(form);
    router.push(ROUTES.PLATFORM.TENANT_DETAIL(result.data.id));
  }

  const STEP_LABELS: Record<Step, string> = {
    company: t('platform.tenants.create.steps.company'),
    commercial: t('platform.tenants.create.steps.commercial'),
    admin: t('platform.tenants.create.steps.admin'),
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Stepper */}
      <nav aria-label={t('platform.tenants.create.wizardProgress')} className="mb-8">
        <ol className="flex items-center gap-0">
          {STEPS.map((s, i) => {
            const done = STEPS.indexOf(step) > i;
            const active = step === s;
            return (
              <li key={s} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-body-sm font-semibold ${
                      done
                        ? 'bg-brand-blue-600 text-white'
                        : active
                        ? 'border-2 border-brand-blue-600 bg-surface-primary text-brand-blue-600'
                        : 'border-2 border-border-default bg-surface-primary text-text-secondary'
                    }`}
                  >
                    {done ? '✓' : i + 1}
                  </div>
                  <span className={`text-caption ${active ? 'text-brand-blue-600 font-semibold' : 'text-text-secondary'}`}>
                    {STEP_LABELS[s]}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 mb-5 ${done ? 'bg-brand-blue-600' : 'bg-border-default'}`} />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <form onSubmit={handleSubmit} className="rounded-xl border border-border-default bg-surface-primary p-6 shadow-0">
        {step === 'company' && (
          <fieldset className="space-y-4">
            <legend className="text-heading-h3 font-bold text-text-primary mb-4">
              {t('platform.tenants.create.company.title')}
            </legend>

            <div>
              <label className="block text-label-md font-semibold text-text-primary mb-1">
                {t('platform.tenants.create.company.displayName')}
                <span className="text-semantic-danger ml-1">*</span>
              </label>
              <input
                type="text"
                value={form.displayName}
                onChange={(e) => update('displayName', e.target.value)}
                className="w-full rounded-md border border-border-default px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20"
                required
                maxLength={160}
              />
            </div>

            <div>
              <label className="block text-label-md font-semibold text-text-primary mb-1">
                {t('platform.tenants.create.company.legalName')}
                <span className="text-semantic-danger ml-1">*</span>
              </label>
              <input
                type="text"
                value={form.legalName}
                onChange={(e) => update('legalName', e.target.value)}
                className="w-full rounded-md border border-border-default px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20"
                required
                maxLength={200}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-label-md font-semibold text-text-primary mb-1">
                  {t('platform.tenants.create.company.country')}
                  <span className="text-semantic-danger ml-1">*</span>
                </label>
                <select
                  value={form.countryCode}
                  onChange={(e) => update('countryCode', e.target.value)}
                  className="w-full rounded-md border border-border-default px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20"
                >
                  {SUPPORTED_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-label-md font-semibold text-text-primary mb-1">
                  {t('platform.tenants.create.company.currency')}
                  <span className="text-semantic-danger ml-1">*</span>
                </label>
                <select
                  value={form.baseCurrency}
                  onChange={(e) => update('baseCurrency', e.target.value)}
                  className="w-full rounded-md border border-border-default px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-label-md font-semibold text-text-primary mb-1">
                {t('platform.tenants.create.company.timeZone')}
                <span className="text-semantic-danger ml-1">*</span>
              </label>
              <select
                value={form.defaultTimezone}
                onChange={(e) => update('defaultTimezone', e.target.value)}
                className="w-full rounded-md border border-border-default px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20"
              >
                {SUPPORTED_TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-label-md font-semibold text-text-primary mb-1">
                {t('platform.tenants.create.company.hostingRegion')}
                <span className="text-semantic-danger ml-1">*</span>
              </label>
              {/* TODO: values must be UUIDs from a deployment regions API, not key strings. */}
              <select
                value={form.deploymentRegionId}
                onChange={(e) => update('deploymentRegionId', e.target.value)}
                className="w-full rounded-md border border-border-default px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20"
              >
                <option value="">Select a region…</option>
                {HOSTING_REGIONS.map((r) => (
                  <option key={r.key} value={r.key}>{r.label}</option>
                ))}
              </select>
            </div>
          </fieldset>
        )}

        {step === 'commercial' && (
          <fieldset className="space-y-4">
            <legend className="text-heading-h3 font-bold text-text-primary mb-4">
              {t('platform.tenants.create.commercial.title')}
            </legend>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-label-md font-semibold text-text-primary mb-1">
                  {t('platform.tenants.create.commercial.plan')}
                  <span className="text-semantic-danger ml-1">*</span>
                </label>
                {/* TODO: values must be plan UUIDs from the plans API (M16), not code strings. */}
                <select
                  value={form.planId}
                  onChange={(e) => update('planId', e.target.value)}
                  className="w-full rounded-md border border-border-default px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20"
                >
                  <option value="">Select a plan…</option>
                  <option value="essential">Essential</option>
                  <option value="growth">Growth</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div>
                <label className="block text-label-md font-semibold text-text-primary mb-1">
                  {t('platform.tenants.create.commercial.billingCycle')}
                  <span className="text-semantic-danger ml-1">*</span>
                </label>
                <select
                  value={form.billingCycle}
                  onChange={(e) => update('billingCycle', e.target.value as 'monthly' | 'annual')}
                  className="w-full rounded-md border border-border-default px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20"
                >
                  <option value="monthly">{t('platform.billing.monthly')}</option>
                  <option value="annual">{t('platform.billing.annual')}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-label-md font-semibold text-text-primary mb-1">
                {t('platform.tenants.create.commercial.seatLimit')}
                <span className="text-semantic-danger ml-1">*</span>
              </label>
              <input
                type="number"
                value={form.seatLimit}
                onChange={(e) => update('seatLimit', parseInt(e.target.value, 10))}
                className="w-full rounded-md border border-border-default px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20"
                min={1}
                max={100000}
                required
              />
            </div>

            <div>
              <label className="block text-label-md font-semibold text-text-primary mb-1">
                {t('platform.tenants.create.commercial.trialEndsAt')}
                <span className="text-text-secondary ml-1 font-normal">({t('common.optional')})</span>
              </label>
              <input
                type="date"
                value={form.trialEndsAt ?? ''}
                onChange={(e) => update('trialEndsAt', e.target.value || undefined)}
                className="w-full rounded-md border border-border-default px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20"
              />
              <p className="mt-1 text-body-sm text-text-secondary">
                {t('platform.tenants.create.commercial.trialHelp')}
              </p>
            </div>
          </fieldset>
        )}

        {step === 'admin' && (
          <fieldset className="space-y-4">
            <legend className="text-heading-h3 font-bold text-text-primary mb-4">
              {t('platform.tenants.create.admin.title')}
            </legend>

            <div>
              <label className="block text-label-md font-semibold text-text-primary mb-1">
                {t('platform.tenants.create.admin.displayName')}
                <span className="text-semantic-danger ml-1">*</span>
              </label>
              <input
                type="text"
                value={form.primaryAdmin.name}
                onChange={(e) => updateAdmin('name', e.target.value)}
                className="w-full rounded-md border border-border-default px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20"
                required
                maxLength={160}
              />
            </div>

            <div>
              <label className="block text-label-md font-semibold text-text-primary mb-1">
                {t('platform.tenants.create.admin.email')}
                <span className="text-semantic-danger ml-1">*</span>
              </label>
              <input
                type="email"
                value={form.primaryAdmin.email}
                onChange={(e) => updateAdmin('email', e.target.value)}
                className="w-full rounded-md border border-border-default px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20"
                required
                maxLength={255}
              />
              <p className="mt-1 text-body-sm text-text-secondary">
                {t('platform.tenants.create.admin.emailHelp')}
              </p>
            </div>

            {create.error && (
              <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-body-sm text-semantic-danger">
                {t('errors.generic')}
              </div>
            )}
          </fieldset>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-border-default pt-4">
          {stepIndex > 0 ? (
            <button
              type="button"
              onClick={() => setStep(STEPS[stepIndex - 1] as Step)}
              className="rounded-md border border-border-default px-4 py-2 text-body-md font-medium text-text-primary hover:bg-surface-canvas"
            >
              {t('common.previous')}
            </button>
          ) : (
            <div />
          )}
          <button
            type="submit"
            disabled={create.isPending}
            className="rounded-md bg-brand-blue-600 px-6 py-2 text-body-md font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {create.isPending
              ? t('common.loading')
              : step === 'admin'
              ? t('platform.tenants.create.submitButton')
              : t('common.next')}
          </button>
        </div>
      </form>
    </div>
  );
}
