'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useCreateTenant } from '../hooks/use-tenant-mutations';
import { usePlans, useDeploymentRegions } from '../hooks/use-tenants';
import { ROUTES } from '../../../constants/routes.constants';
import {
  LAUNCH_COUNTRY_CODES,
  LAUNCH_CURRENCY_CODES,
  LAUNCH_LOCALES,
  LAUNCH_TIMEZONES,
} from '../constants/platform.constants';
import type { CreateTenantPayload, Tenant } from '../types/platform.types';
import { LoadingSpinner } from '../../../components/feedback/loading-spinner';
import { ApiError } from '../../../lib/api/types';
import { ProductSetupSummary } from './product-setup-summary';
import { platformApi } from '../api/platform-api';

const FORM_STEPS = ['company', 'commercial', 'product', 'admin', 'review'] as const;
type FormStep = (typeof FORM_STEPS)[number];

const INITIAL_FORM: CreateTenantPayload = {
  displayName: '',
  legalName: '',
  countryCode: 'PK',
  baseCurrency: 'PKR',
  defaultTimezone: 'Asia/Karachi',
  defaultLocale: 'en-PK',
  deploymentRegionId: '',
  planId: '',
  seatLimit: 100,
  storageLimitGb: undefined,
  billingCycle: 'monthly',
  trialEndsAt: undefined,
  primaryAdmin: { name: '', email: '' },
};

export function CreateTenantWizard() {
  const t = useTranslations();
  const create = useCreateTenant();
  const { data: plansData, isLoading: plansLoading } = usePlans(true);
  const { data: regionsData, isLoading: regionsLoading } = useDeploymentRegions();

  const [step, setStep] = useState<FormStep>('company');
  const [form, setForm] = useState<CreateTenantPayload>(INITIAL_FORM);
  const [subscriptionStart, setSubscriptionStart] = useState<'trial' | 'paid'>('paid');
  const [createdTenant, setCreatedTenant] = useState<Tenant | null>(null);
  const [invitationSent, setInvitationSent] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [emailCheckPending, setEmailCheckPending] = useState(false);

  const plans = plansData?.data ?? [];
  const regions = regionsData?.data ?? [];
  const stepIndex = FORM_STEPS.indexOf(step);

  useEffect(() => {
    if (!form.deploymentRegionId && regions.length === 1) {
      setForm((prev) => ({ ...prev, deploymentRegionId: regions[0]!.id }));
    }
  }, [regions, form.deploymentRegionId]);

  useEffect(() => {
    const email = form.primaryAdmin.email.trim();
    if (!email.includes('@') || email.length < 5) {
      setEmailAvailable(null);
      return;
    }
    setEmailCheckPending(true);
    const handle = window.setTimeout(() => {
      void platformApi.tenants
        .validateAdminEmail(email)
        .then((res) => setEmailAvailable(res.data.available))
        .catch(() => setEmailAvailable(null))
        .finally(() => setEmailCheckPending(false));
    }, 400);
    return () => window.clearTimeout(handle);
  }, [form.primaryAdmin.email]);

  function parseEntitlementNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const n = Number(value);
      return Number.isFinite(n) ? n : undefined;
    }
    return undefined;
  }

  function selectPlan(planId: string) {
    const plan = plans.find((p) => p.id === planId);
    const fromPlan = parseEntitlementNumber(
      plan?.entitlements?.find((e) => e.code === 'storage_limit_gb')?.defaultValue,
    );
    setForm((prev) => ({
      ...prev,
      planId,
      storageLimitGb: fromPlan ?? prev.storageLimitGb,
    }));
  }

  function update<K extends keyof CreateTenantPayload>(key: K, value: CreateTenantPayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateAdmin(key: 'name' | 'email', value: string) {
    setForm((prev) => ({ ...prev, primaryAdmin: { ...prev.primaryAdmin, [key]: value } }));
  }

  function canAdvanceFrom(stepKey: FormStep): boolean {
    switch (stepKey) {
      case 'company':
        return form.displayName.trim().length > 0 && form.legalName.trim().length > 0;
      case 'commercial':
        return form.planId.length > 0
          && form.seatLimit >= 1
          && (form.storageLimitGb == null || form.storageLimitGb >= 1)
          && (subscriptionStart === 'paid' || !!form.trialEndsAt);
      case 'product':
        return form.deploymentRegionId.length > 0;
      case 'admin':
        return (
          form.primaryAdmin.name.trim().length > 0 &&
          form.primaryAdmin.email.includes('@') &&
          emailAvailable !== false &&
          !emailCheckPending
        );
      default:
        return true;
    }
  }

  async function submit(sendInvitation: boolean) {
    const result = await create.mutateAsync({ ...form, sendInvitation });
    setInvitationSent(sendInvitation && !!result.data.primaryAdminInvitation);
    setCreatedTenant(result.data);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step !== 'review') {
      if (canAdvanceFrom(step)) {
        setStep(FORM_STEPS[stepIndex + 1] as FormStep);
      }
      return;
    }
    await submit(true);
  }

  const STEP_LABELS: Record<FormStep, string> = {
    company: t('platform.tenants.create.steps.company'),
    commercial: t('platform.tenants.create.steps.commercial'),
    product: t('platform.tenants.create.steps.product'),
    admin: t('platform.tenants.create.steps.admin'),
    review: t('platform.tenants.create.steps.review'),
  };

  const selectedPlan = plans.find((p) => p.id === form.planId);
  const selectedRegion = regions.find((r) => r.id === form.deploymentRegionId);
  const planEntitlements = selectedPlan?.entitlements ?? [];

  if (createdTenant) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-border-default bg-surface-primary p-8 text-center shadow-0">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-semantic-success">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h2 className="text-heading-h2 font-bold text-text-primary">
          {invitationSent ? t('platform.tenants.create.success.titleInvited') : t('platform.tenants.create.success.title')}
        </h2>
        <p className="mt-2 text-body-md text-text-secondary">
          {invitationSent ? t('platform.tenants.create.success.descriptionInvited') : t('platform.tenants.create.success.description')}
        </p>
        <dl className="mt-6 space-y-3 rounded-lg bg-surface-canvas p-4 text-start">
          <div className="flex justify-between gap-4">
            <dt className="text-body-sm text-text-secondary">{t('platform.tenants.columns.name')}</dt>
            <dd className="text-body-sm font-medium text-text-primary">{createdTenant.displayName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-body-sm text-text-secondary">{t('platform.tenants.columns.status')}</dt>
            <dd className="text-body-sm font-medium text-text-primary">{t(`platform.tenants.status.${createdTenant.status.toLowerCase()}`)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-body-sm text-text-secondary">{t('platform.tenants.columns.plan')}</dt>
            <dd className="text-body-sm font-medium text-text-primary">{createdTenant.planName ?? createdTenant.planKey ?? '—'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-body-sm text-text-secondary">{t('platform.tenants.detail.region')}</dt>
            <dd className="text-body-sm font-medium text-text-primary">{createdTenant.deploymentRegionName ?? createdTenant.deploymentRegionCode ?? '—'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-body-sm text-text-secondary">{t('platform.tenants.create.commercial.subscriptionStart')}</dt>
            <dd className="text-body-sm font-medium text-text-primary">
              {createdTenant.trialEndsAt
                ? t('platform.tenants.create.commercial.trial')
                : t('platform.tenants.create.commercial.paid')}
            </dd>
          </div>
          {createdTenant.primaryAdminInvitation && (
            <>
              <div className="flex justify-between gap-4">
                <dt className="text-body-sm text-text-secondary">{t('platform.tenants.create.admin.email')}</dt>
                <dd className="text-body-sm font-medium text-text-primary ltr:text-end">{createdTenant.primaryAdminInvitation.email}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-body-sm text-text-secondary">{t('platform.tenants.create.success.invitationStatus')}</dt>
                <dd className="text-body-sm font-medium text-text-primary">{createdTenant.primaryAdminInvitation.status}</dd>
              </div>
            </>
          )}
        </dl>
        {invitationSent && !createdTenant.primaryAdminInvitation && (
          <p className="mt-4 text-body-sm text-semantic-warning">{t('platform.tenants.create.success.invitationPending')}</p>
        )}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href={ROUTES.PLATFORM.TENANT_DETAIL(createdTenant.id)} className="rounded-md bg-brand-blue-600 px-6 py-2 text-body-md font-semibold text-white hover:bg-blue-700">
            {t('platform.tenants.create.success.viewTenant')}
          </Link>
          <Link href={ROUTES.PLATFORM.TENANTS} className="rounded-md border border-border-default px-6 py-2 text-body-md font-medium text-text-primary hover:bg-surface-canvas">
            {t('platform.tenants.create.success.backToDirectory')}
          </Link>
        </div>
      </div>
    );
  }

  if (plansLoading || regionsLoading) {
    return (
      <div className="flex justify-center p-12">
        <LoadingSpinner />
      </div>
    );
  }

  const inputCls = 'w-full rounded-md border border-border-default px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20';

  return (
    <div className="mx-auto max-w-2xl">
      <nav aria-label={t('platform.tenants.create.wizardProgress')} className="mb-8">
        <ol className="flex items-center gap-0">
          {FORM_STEPS.map((s, i) => {
            const done = stepIndex > i;
            const active = step === s;
            return (
              <li key={s} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-1">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-body-sm font-semibold ${
                    done ? 'bg-brand-blue-600 text-white' : active ? 'border-2 border-brand-blue-600 bg-surface-primary text-brand-blue-600' : 'border-2 border-border-default bg-surface-primary text-text-secondary'
                  }`}>
                    {done ? '✓' : i + 1}
                  </div>
                  <span className={`hidden text-caption sm:block ${active ? 'font-semibold text-brand-blue-600' : 'text-text-secondary'}`}>
                    {STEP_LABELS[s]}
                  </span>
                </div>
                {i < FORM_STEPS.length - 1 && <div className={`mx-2 mb-5 h-0.5 flex-1 ${done ? 'bg-brand-blue-600' : 'bg-border-default'}`} />}
              </li>
            );
          })}
        </ol>
      </nav>

      <form onSubmit={handleSubmit} className="rounded-xl border border-border-default bg-surface-primary p-6 shadow-0">
        {step === 'company' && (
          <fieldset className="space-y-4">
            <legend className="mb-4 text-heading-h3 font-bold text-text-primary">{t('platform.tenants.create.company.title')}</legend>
            <div>
              <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="displayName">
                {t('platform.tenants.create.company.displayName')}<span className="ml-1 text-semantic-danger">*</span>
              </label>
              <input id="displayName" name="displayName" type="text" value={form.displayName} onChange={(e) => update('displayName', e.target.value)} className={inputCls} required maxLength={160} />
            </div>
            <div>
              <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="legalName">
                {t('platform.tenants.create.company.legalName')}<span className="ml-1 text-semantic-danger">*</span>
              </label>
              <input id="legalName" name="legalName" type="text" value={form.legalName} onChange={(e) => update('legalName', e.target.value)} className={inputCls} required maxLength={200} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="countryCode">
                  {t('platform.tenants.create.company.country')}<span className="ml-1 text-semantic-danger">*</span>
                </label>
                <select id="countryCode" name="countryCode" value={form.countryCode} onChange={(e) => update('countryCode', e.target.value)} className={inputCls}>
                  {LAUNCH_COUNTRY_CODES.map((code) => <option key={code} value={code}>{t(`platform.catalogue.countries.${code}`)}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="baseCurrency">
                  {t('platform.tenants.create.company.currency')}<span className="ml-1 text-semantic-danger">*</span>
                </label>
                <select id="baseCurrency" name="baseCurrency" value={form.baseCurrency} onChange={(e) => update('baseCurrency', e.target.value)} className={inputCls}>
                  {LAUNCH_CURRENCY_CODES.map((code) => <option key={code} value={code}>{code} — {t(`platform.catalogue.currencies.${code}`)}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="defaultTimezone">
                {t('platform.tenants.create.company.timeZone')}<span className="ml-1 text-semantic-danger">*</span>
              </label>
              <select id="defaultTimezone" name="defaultTimezone" value={form.defaultTimezone} onChange={(e) => update('defaultTimezone', e.target.value)} className={inputCls}>
                {LAUNCH_TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="defaultLocale">
                {t('platform.tenants.create.company.language')}<span className="ml-1 text-semantic-danger">*</span>
              </label>
              <select id="defaultLocale" name="defaultLocale" value={form.defaultLocale} onChange={(e) => update('defaultLocale', e.target.value)} className={inputCls}>
                {LAUNCH_LOCALES.map((loc) => <option key={loc} value={loc}>{t(`platform.catalogue.locales.${loc}`)}</option>)}
              </select>
            </div>
          </fieldset>
        )}

        {step === 'commercial' && (
          <fieldset className="space-y-4">
            <legend className="mb-4 text-heading-h3 font-bold text-text-primary">{t('platform.tenants.create.commercial.title')}</legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="planId">
                  {t('platform.tenants.create.commercial.plan')}<span className="ml-1 text-semantic-danger">*</span>
                </label>
                <select id="planId" name="planId" value={form.planId} onChange={(e) => selectPlan(e.target.value)} className={inputCls} required>
                  <option value="">{t('platform.tenants.create.selectPlan')}</option>
                  {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="billingCycle">
                  {t('platform.tenants.create.commercial.billingCycle')}<span className="ml-1 text-semantic-danger">*</span>
                </label>
                <select id="billingCycle" name="billingCycle" value={form.billingCycle} onChange={(e) => update('billingCycle', e.target.value as 'monthly' | 'annual')} className={inputCls}>
                  <option value="monthly">{t('platform.billing.monthly')}</option>
                  <option value="annual">{t('platform.billing.annual')}</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="seatLimit">
                {t('platform.tenants.create.commercial.seatLimit')}<span className="ml-1 text-semantic-danger">*</span>
              </label>
              <input id="seatLimit" name="seatLimit" type="number" value={form.seatLimit} onChange={(e) => update('seatLimit', parseInt(e.target.value, 10))} className={inputCls} min={1} max={100000} required />
            </div>
            <div>
              <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="storageLimitGb">
                {t('platform.tenants.create.commercial.storageLimit')}
                <span className="ml-1 font-normal text-text-secondary">({t('common.optional')})</span>
              </label>
              <input
                id="storageLimitGb"
                name="storageLimitGb"
                type="number"
                value={form.storageLimitGb ?? ''}
                onChange={(e) => update('storageLimitGb', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                className={inputCls}
                min={1}
                max={100000}
              />
            </div>
            <fieldset>
              <legend className="mb-2 text-label-md font-semibold text-text-primary">
                {t('platform.tenants.create.commercial.subscriptionStart')}<span className="ml-1 text-semantic-danger">*</span>
              </legend>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-body-md text-text-primary">
                  <input
                    type="radio"
                    name="subscriptionStart"
                    value="paid"
                    checked={subscriptionStart === 'paid'}
                    onChange={() => {
                      setSubscriptionStart('paid');
                      update('trialEndsAt', undefined);
                    }}
                  />
                  {t('platform.tenants.create.commercial.paid')}
                </label>
                <label className="flex items-center gap-2 text-body-md text-text-primary">
                  <input
                    type="radio"
                    name="subscriptionStart"
                    value="trial"
                    checked={subscriptionStart === 'trial'}
                    onChange={() => setSubscriptionStart('trial')}
                  />
                  {t('platform.tenants.create.commercial.trial')}
                </label>
              </div>
            </fieldset>
            {subscriptionStart === 'trial' && (
              <div>
                <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="trialEndsAt">
                  {t('platform.tenants.create.commercial.trialEndsAt')}<span className="ml-1 text-semantic-danger">*</span>
                </label>
                <input id="trialEndsAt" name="trialEndsAt" type="date" value={form.trialEndsAt ?? ''} onChange={(e) => update('trialEndsAt', e.target.value || undefined)} className={inputCls} required />
                <p className="mt-1 text-body-sm text-text-secondary">{t('platform.tenants.create.commercial.trialHelp')}</p>
              </div>
            )}
          </fieldset>
        )}

        {step === 'product' && (
          <fieldset className="space-y-4">
            <legend className="mb-4 text-heading-h3 font-bold text-text-primary">{t('platform.tenants.create.product.title')}</legend>
            <div>
              <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="deploymentRegionId">
                {t('platform.tenants.create.company.hostingRegion')}<span className="ml-1 text-semantic-danger">*</span>
              </label>
              <select id="deploymentRegionId" name="deploymentRegionId" value={form.deploymentRegionId} onChange={(e) => update('deploymentRegionId', e.target.value)} className={inputCls} required>
                <option value="">{t('platform.tenants.create.selectRegion')}</option>
                {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <p className="text-body-sm text-text-secondary">{t('platform.tenants.create.product.entitlementNote')}</p>
            <div className="rounded-lg bg-surface-canvas p-4">
              <ProductSetupSummary
                planName={selectedPlan?.name}
                entitlements={planEntitlements}
              />
            </div>
          </fieldset>
        )}

        {step === 'admin' && (
          <fieldset className="space-y-4">
            <legend className="mb-4 text-heading-h3 font-bold text-text-primary">{t('platform.tenants.create.admin.title')}</legend>
            <div>
              <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="primaryAdminName">
                {t('platform.tenants.create.admin.displayName')}<span className="ml-1 text-semantic-danger">*</span>
              </label>
              <input id="primaryAdminName" name="primaryAdminName" type="text" value={form.primaryAdmin.name} onChange={(e) => updateAdmin('name', e.target.value)} className={inputCls} required maxLength={160} />
            </div>
            <div>
              <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="primaryAdminEmail">
                {t('platform.tenants.create.admin.email')}<span className="ml-1 text-semantic-danger">*</span>
              </label>
              <input id="primaryAdminEmail" name="primaryAdminEmail" type="email" value={form.primaryAdmin.email} onChange={(e) => updateAdmin('email', e.target.value)} className={inputCls} required maxLength={255} />
              <p className="mt-1 text-body-sm text-text-secondary">{t('platform.tenants.create.admin.emailHelp')}</p>
              {emailCheckPending && (
                <p className="mt-1 text-caption text-text-secondary">{t('common.loading')}</p>
              )}
              {emailAvailable === false && (
                <p role="alert" className="mt-1 text-caption text-semantic-danger">
                  {t('platform.tenants.create.admin.emailTaken')}
                </p>
              )}
              {emailAvailable === true && (
                <p className="mt-1 text-caption text-semantic-success">
                  {t('platform.tenants.create.admin.emailAvailable')}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="primaryAdminRole">
                {t('platform.tenants.create.admin.role')}
              </label>
              <input id="primaryAdminRole" name="primaryAdminRole" type="text" value={t('platform.tenants.create.admin.roleValue')} className={inputCls} readOnly />
            </div>
          </fieldset>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            <h3 className="text-heading-h3 font-bold text-text-primary">{t('platform.tenants.create.review.title')}</h3>
            <p className="text-body-md text-text-secondary">{t('platform.tenants.create.review.description')}</p>
            <dl className="space-y-3 rounded-lg bg-surface-canvas p-4">
              <div className="flex justify-between gap-4"><dt className="text-body-sm text-text-secondary">{t('platform.tenants.create.company.displayName')}</dt><dd className="text-body-sm font-medium">{form.displayName}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-body-sm text-text-secondary">{t('platform.tenants.create.company.legalName')}</dt><dd className="text-body-sm font-medium">{form.legalName}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-body-sm text-text-secondary">{t('platform.tenants.create.company.country')}</dt><dd className="text-body-sm font-medium">{t.has(`platform.catalogue.countries.${form.countryCode}`) ? t(`platform.catalogue.countries.${form.countryCode}`) : form.countryCode}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-body-sm text-text-secondary">{t('platform.tenants.create.company.currency')}</dt><dd className="text-body-sm font-medium ltr">{form.baseCurrency}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-body-sm text-text-secondary">{t('platform.tenants.create.company.timeZone')}</dt><dd className="text-body-sm font-medium ltr">{form.defaultTimezone}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-body-sm text-text-secondary">{t('platform.tenants.create.company.language')}</dt><dd className="text-body-sm font-medium">{t.has(`platform.catalogue.locales.${form.defaultLocale}`) ? t(`platform.catalogue.locales.${form.defaultLocale}`) : form.defaultLocale}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-body-sm text-text-secondary">{t('platform.tenants.create.commercial.plan')}</dt><dd className="text-body-sm font-medium">{selectedPlan?.name ?? '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-body-sm text-text-secondary">{t('platform.tenants.create.commercial.billingCycle')}</dt><dd className="text-body-sm font-medium">{t(`platform.billing.${form.billingCycle}`)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-body-sm text-text-secondary">{t('platform.tenants.create.commercial.seatLimit')}</dt><dd className="text-body-sm font-medium tabular-nums">{form.seatLimit}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-body-sm text-text-secondary">{t('platform.tenants.create.commercial.storageLimit')}</dt><dd className="text-body-sm font-medium tabular-nums">{form.storageLimitGb ?? '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-body-sm text-text-secondary">{t('platform.tenants.create.commercial.subscriptionStart')}</dt><dd className="text-body-sm font-medium">{t(`platform.tenants.create.commercial.${subscriptionStart}`)}</dd></div>
              {subscriptionStart === 'trial' && (
                <div className="flex justify-between gap-4"><dt className="text-body-sm text-text-secondary">{t('platform.tenants.create.commercial.trialEndsAt')}</dt><dd className="text-body-sm font-medium">{form.trialEndsAt ?? '—'}</dd></div>
              )}
            </dl>
            <div className="rounded-lg bg-surface-canvas p-4">
              <h4 className="mb-3 text-label-md font-semibold text-text-primary">{t('platform.tenants.create.product.title')}</h4>
              <ProductSetupSummary
                planName={selectedPlan?.name}
                entitlements={planEntitlements}
                regionName={selectedRegion?.name}
              />
            </div>
            <dl className="space-y-3 rounded-lg bg-surface-canvas p-4">
              <div className="flex justify-between gap-4"><dt className="text-body-sm text-text-secondary">{t('platform.tenants.create.admin.displayName')}</dt><dd className="text-body-sm font-medium">{form.primaryAdmin.name}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-body-sm text-text-secondary">{t('platform.tenants.create.admin.email')}</dt><dd className="text-body-sm font-medium ltr:text-end">{form.primaryAdmin.email}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-body-sm text-text-secondary">{t('platform.tenants.create.admin.role')}</dt><dd className="text-body-sm font-medium">{t('platform.tenants.create.admin.roleValue')}</dd></div>
            </dl>
            {create.error && (
              <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-body-sm text-semantic-danger">
                {create.error instanceof ApiError ? create.error.message : t('errors.generic')}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 border-t border-border-default pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            {stepIndex > 0 ? (
              <button type="button" onClick={() => setStep(FORM_STEPS[stepIndex - 1] as FormStep)} className="rounded-md border border-border-default px-4 py-2 text-body-md font-medium text-text-primary hover:bg-surface-canvas">{t('common.previous')}</button>
            ) : (
              <Link href={ROUTES.PLATFORM.TENANTS} className="rounded-md border border-border-default px-4 py-2 text-body-md font-medium text-text-primary hover:bg-surface-canvas">{t('common.cancel')}</Link>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {step === 'review' && (
              <button type="button" disabled={create.isPending} onClick={() => void submit(false)} className="rounded-md border border-border-default px-4 py-2 text-body-md font-medium text-text-primary hover:bg-surface-canvas disabled:opacity-50">
                {t('platform.tenants.create.saveDraft')}
              </button>
            )}
            <button type="submit" disabled={create.isPending || (step !== 'review' && !canAdvanceFrom(step))} className="rounded-md bg-brand-blue-600 px-6 py-2 text-body-md font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
              {create.isPending ? t('common.loading') : step === 'review' ? t('platform.tenants.create.submitButton') : t('common.next')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
