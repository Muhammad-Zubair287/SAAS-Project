'use client';

import { useEffect, useMemo, useState } from 'react';
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
import type { CreateTenantPayload, PlanEntitlement, Tenant } from '../types/platform.types';
import { LoadingSpinner } from '../../../components/feedback/loading-spinner';
import { ApiError } from '../../../lib/api/types';
import { CreateTenantMfaDialog } from './create-tenant-mfa-dialog';
import { isEntitlementIncluded } from '../utils/plan-pricing';
import {
  createTenantAdminStepSchema,
  createTenantCommercialStepSchema,
  createTenantCompanyStepSchema,
  createTenantProductStepSchema,
  type CreateTenantStepErrors,
  zodFieldErrors,
} from '../schemas/create-tenant.schema';
import {
  filterDigitsOnly,
  filterInternationalPhoneInput,
  filterOrganizationNameInput,
  filterPersonNameInput,
  sanitizeTrimmed,
} from '../../../lib/validation/input-security';

const FORM_STEPS = ['company', 'commercial', 'product', 'admin', 'review'] as const;
type FormStep = (typeof FORM_STEPS)[number];

const SSO_CODE = 'feature_sso';
const API_ACCESS_CODE = 'feature_api_access';
const DEDICATED_SUPPORT_CODE = 'feature_dedicated_support';

type WizardForm = CreateTenantPayload & {
  trialOn: boolean;
  supportTierKey: string;
  moduleToggles: Record<string, boolean>;
  ssoEnabled: boolean;
  apiAccessEnabled: boolean;
};

const INITIAL_FORM: WizardForm = {
  displayName: '',
  legalName: '',
  countryCode: 'PK',
  currency: 'PKR',
  timeZone: 'Asia/Karachi',
  primaryLocale: 'en-PK',
  hostingRegion: '',
  planKey: '',
  seatLimit: 100,
  storageLimitGb: 10,
  billingCycle: 'monthly',
  trialEndsAt: undefined,
  trialOn: false,
  supportTierKey: '',
  moduleToggles: {},
  ssoEnabled: false,
  apiAccessEnabled: false,
  primaryAdmin: { name: '', email: '' },
};

function moduleEntitlements(entitlements: PlanEntitlement[]): PlanEntitlement[] {
  return entitlements.filter(
    (e) =>
      e.dataType === 'BOOLEAN' &&
      e.code.startsWith('feature_') &&
      e.code !== SSO_CODE &&
      e.code !== API_ACCESS_CODE &&
      e.code !== DEDICATED_SUPPORT_CODE,
  );
}

function supportTierOptions(entitlements: PlanEntitlement[]): PlanEntitlement[] {
  return entitlements.filter((e) => e.code === DEDICATED_SUPPORT_CODE || e.code.includes('support'));
}

export function CreateTenantWizard() {
  const t = useTranslations();
  const create = useCreateTenant();
  const { data: plansData, isLoading: plansLoading } = usePlans(true);
  const { data: regionsData, isLoading: regionsLoading } = useDeploymentRegions();

  const [step, setStep] = useState<FormStep>('company');
  const [form, setForm] = useState<WizardForm>(INITIAL_FORM);
  const [createdTenant, setCreatedTenant] = useState<Tenant | null>(null);
  const [invitationSent, setInvitationSent] = useState(false);
  const [mfaOpen, setMfaOpen] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<{ sendInvitation: boolean } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<CreateTenantStepErrors>({});

  const plans = plansData?.data ?? [];
  const regions = regionsData?.data ?? [];
  const stepIndex = FORM_STEPS.indexOf(step);
  const selectedPlan = plans.find((p) => p.code === form.planKey);
  const planEntitlements = selectedPlan?.entitlements ?? [];
  const modules = moduleEntitlements(planEntitlements);
  const supportOptions = supportTierOptions(planEntitlements);

  useEffect(() => {
    if (!form.hostingRegion && regions.length === 1) {
      setForm((prev) => ({ ...prev, hostingRegion: regions[0]!.hostingRegion }));
    }
  }, [regions, form.hostingRegion]);

  useEffect(() => {
    if (!selectedPlan?.entitlements) return;
    const nextModules: Record<string, boolean> = {};
    for (const mod of moduleEntitlements(selectedPlan.entitlements)) {
      nextModules[mod.code] = isEntitlementIncluded(mod.defaultValue);
    }
    const sso = selectedPlan.entitlements.find((e) => e.code === SSO_CODE);
    const api = selectedPlan.entitlements.find((e) => e.code === API_ACCESS_CODE);
    const support = supportTierOptions(selectedPlan.entitlements)[0];
    setForm((prev) => ({
      ...prev,
      moduleToggles: nextModules,
      ssoEnabled: sso ? isEntitlementIncluded(sso.defaultValue) : false,
      apiAccessEnabled: api ? isEntitlementIncluded(api.defaultValue) : false,
      supportTierKey: support?.code ?? DEDICATED_SUPPORT_CODE,
      storageLimitGb:
        prev.storageLimitGb ||
        parseStorageDefault(selectedPlan.entitlements ?? []) ||
        prev.storageLimitGb,
    }));
  }, [selectedPlan?.code]);

  function parseStorageDefault(entitlements: PlanEntitlement[]): number | undefined {
    const row = entitlements.find((e) => e.code === 'storage_limit_gb');
    if (typeof row?.defaultValue === 'number') return row.defaultValue;
    if (typeof row?.defaultValue === 'string') {
      const n = Number(row.defaultValue);
      return Number.isFinite(n) ? n : undefined;
    }
    return undefined;
  }

  function selectPlan(planKey: string) {
    const plan = plans.find((p) => p.code === planKey);
    setForm((prev) => ({
      ...prev,
      planKey,
      storageLimitGb: parseStorageDefault(plan?.entitlements ?? []) ?? prev.storageLimitGb,
    }));
  }

  function update<K extends keyof WizardForm>(key: K, value: WizardForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateAdmin(key: keyof WizardForm['primaryAdmin'], value: string) {
    setForm((prev) => ({ ...prev, primaryAdmin: { ...prev.primaryAdmin, [key]: value } }));
  }

  function validationMessage(code: string): string {
    const known = ['required', 'unsafe', 'format', 'maxLength'] as const;
    if (known.includes(code as (typeof known)[number])) {
      return t(`platform.tenants.create.validation.${code}` as 'platform.tenants.create.validation.required');
    }
    return t('errors.validationFailed');
  }

  function getStepValidation(stepKey: FormStep) {
    switch (stepKey) {
      case 'company':
        return createTenantCompanyStepSchema.safeParse({
          displayName: form.displayName,
          legalName: form.legalName,
          countryCode: form.countryCode,
          currency: form.currency,
          timeZone: form.timeZone,
          primaryLocale: form.primaryLocale,
        });
      case 'commercial':
        return createTenantCommercialStepSchema.safeParse({
          planKey: form.planKey,
          billingCycle: form.billingCycle,
          trialOn: form.trialOn,
          trialEndsAt: form.trialEndsAt,
          seatLimit: form.seatLimit,
          storageLimitGb: form.storageLimitGb,
        });
      case 'product':
        return createTenantProductStepSchema.safeParse({
          hostingRegion: form.hostingRegion,
          supportTierKey: form.supportTierKey,
        });
      case 'admin':
        return createTenantAdminStepSchema.safeParse({
          name: form.primaryAdmin.name,
          email: form.primaryAdmin.email,
          phone: form.primaryAdmin.phone,
        });
      default:
        return { success: true as const, data: undefined };
    }
  }

  function isStepValid(stepKey: FormStep): boolean {
    return getStepValidation(stepKey).success;
  }

  function validateStep(stepKey: FormStep): boolean {
    const result = getStepValidation(stepKey);
    if (!result.success) {
      setFieldErrors(zodFieldErrors(result.error));
      return false;
    }
    setFieldErrors({});
    return true;
  }

  function validateAllSteps(): boolean {
    for (const stepKey of FORM_STEPS) {
      if (stepKey === 'review') continue;
      const result = getStepValidation(stepKey);
      if (!result.success) {
        setFieldErrors(zodFieldErrors(result.error));
        setStep(stepKey);
        return false;
      }
    }
    setFieldErrors({});
    return true;
  }

  function fieldError(field: string): string | undefined {
    const code = fieldErrors[field];
    return code ? validationMessage(code) : undefined;
  }

  function canAdvanceFrom(stepKey: FormStep): boolean {
    return isStepValid(stepKey);
  }

  function buildPayload(sendInvitation: boolean, mfaCode?: string): CreateTenantPayload {
    return {
      displayName: form.displayName.trim(),
      legalName: form.legalName.trim(),
      countryCode: form.countryCode,
      currency: form.currency,
      timeZone: form.timeZone,
      primaryLocale: form.primaryLocale,
      hostingRegion: form.hostingRegion,
      planKey: form.planKey,
      seatLimit: form.seatLimit,
      storageLimitGb: form.storageLimitGb,
      billingCycle: form.billingCycle,
      trialEndsAt: form.trialOn ? form.trialEndsAt : undefined,
      primaryAdmin: {
        name: sanitizeTrimmed(form.primaryAdmin.name),
        email: sanitizeTrimmed(form.primaryAdmin.email).toLowerCase(),
        phone: form.primaryAdmin.phone ? sanitizeTrimmed(form.primaryAdmin.phone) : undefined,
      },
      sendInvitation,
      mfaCode,
    };
  }

  async function submit(sendInvitation: boolean, mfaCode?: string) {
    const result = await create.mutateAsync(buildPayload(sendInvitation, mfaCode));
    setInvitationSent(sendInvitation && !!result.data.primaryAdminInvitation);
    setCreatedTenant(result.data);
    setMfaOpen(false);
    setPendingSubmit(null);
  }

  async function requestSubmit(sendInvitation: boolean) {
    try {
      await submit(sendInvitation);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'MFA_REQUIRED') {
        setPendingSubmit({ sendInvitation });
        setMfaOpen(true);
        return;
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step !== 'review') {
      if (validateStep(step)) setStep(FORM_STEPS[stepIndex + 1] as FormStep);
      return;
    }
    if (!validateAllSteps()) return;
    await requestSubmit(true);
  }

  const STEP_LABELS: Record<FormStep, string> = {
    company: t('platform.tenants.create.steps.company'),
    commercial: t('platform.tenants.create.steps.commercial'),
    product: t('platform.tenants.create.steps.product'),
    admin: t('platform.tenants.create.steps.admin'),
    review: t('platform.tenants.create.steps.review'),
  };

  const enabledModuleLabels = useMemo(
    () =>
      modules
        .filter((m) => form.moduleToggles[m.code])
        .map((m) => m.label)
        .join(', ') || t('platform.tenants.create.product.none'),
    [modules, form.moduleToggles, t],
  );

  if (createdTenant) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-border-default bg-surface-primary p-8 text-center shadow-0">
        <h2 className="text-heading-h2 font-bold text-text-primary">
          {invitationSent ? t('platform.tenants.create.success.titleInvited') : t('platform.tenants.create.success.title')}
        </h2>
        <p className="mt-2 text-body-md text-text-secondary">{createdTenant.displayName}</p>
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
    return <div className="flex justify-center p-12"><LoadingSpinner /></div>;
  }

  const inputCls =
    'w-full rounded-md border border-border-default px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20';

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-body-md text-text-secondary">
          {t('platform.tenants.create.stepIndicator', { current: stepIndex + 1, total: FORM_STEPS.length, label: STEP_LABELS[step] })}
        </p>
        <div className="flex gap-2">
          <button type="button" disabled={create.isPending} onClick={() => void requestSubmit(false)} className="rounded-md border border-border-default px-4 py-2 text-body-md font-medium text-text-primary hover:bg-surface-canvas disabled:opacity-50">
            {t('platform.tenants.create.saveDraft')}
          </button>
          <Link href={ROUTES.PLATFORM.TENANTS} className="rounded-md border border-border-default px-4 py-2 text-body-md font-medium text-text-primary hover:bg-surface-canvas">
            {t('common.cancel')}
          </Link>
        </div>
      </div>

      <nav aria-label={t('platform.tenants.create.wizardProgress')} className="mb-8">
        <ol className="flex items-center">
          {FORM_STEPS.map((s, i) => (
            <li key={s} className="flex flex-1 items-center">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-body-sm font-semibold ${stepIndex >= i ? 'bg-brand-blue-600 text-white' : 'border-2 border-border-default text-text-secondary'}`}>
                {i + 1}
              </div>
              {i < FORM_STEPS.length - 1 && <div className={`mx-2 h-0.5 flex-1 ${stepIndex > i ? 'bg-brand-blue-600' : 'bg-border-default'}`} />}
            </li>
          ))}
        </ol>
      </nav>

      <form onSubmit={(e) => void handleSubmit(e)} className="rounded-xl border border-border-default bg-surface-primary p-6 shadow-0">
        {step === 'company' && (
          <fieldset className="space-y-4">
            <legend className="mb-4 text-heading-h3 font-bold text-text-primary">{t('platform.tenants.create.company.title')}</legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="legalName">{t('platform.tenants.create.company.legalName')}<span className="ml-1 text-semantic-danger">*</span></label>
                <input id="legalName" value={form.legalName} onChange={(e) => update('legalName', filterOrganizationNameInput(e.target.value))} className={inputCls} required maxLength={200} aria-invalid={!!fieldError('legalName')} />
                {fieldError('legalName') && <p role="alert" className="mt-1 text-body-sm text-semantic-danger">{fieldError('legalName')}</p>}
              </div>
              <div>
                <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="displayName">{t('platform.tenants.create.company.displayName')}<span className="ml-1 text-semantic-danger">*</span></label>
                <input id="displayName" value={form.displayName} onChange={(e) => update('displayName', filterOrganizationNameInput(e.target.value))} className={inputCls} required maxLength={160} aria-invalid={!!fieldError('displayName')} />
                {fieldError('displayName') && <p role="alert" className="mt-1 text-body-sm text-semantic-danger">{fieldError('displayName')}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="countryCode">{t('platform.tenants.create.company.country')}<span className="ml-1 text-semantic-danger">*</span></label>
                <select id="countryCode" value={form.countryCode} onChange={(e) => update('countryCode', e.target.value)} className={inputCls}>
                  {LAUNCH_COUNTRY_CODES.map((code) => <option key={code} value={code}>{t(`platform.catalogue.countries.${code}`)}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="currency">{t('platform.tenants.create.company.currency')}<span className="ml-1 text-semantic-danger">*</span></label>
                <select id="currency" value={form.currency} onChange={(e) => update('currency', e.target.value)} className={inputCls}>
                  {LAUNCH_CURRENCY_CODES.map((code) => <option key={code} value={code}>{code}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="timeZone">{t('platform.tenants.create.company.timeZone')}<span className="ml-1 text-semantic-danger">*</span></label>
                <select id="timeZone" value={form.timeZone} onChange={(e) => update('timeZone', e.target.value)} className={inputCls}>
                  {LAUNCH_TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="primaryLocale">{t('platform.tenants.create.company.language')}<span className="ml-1 text-semantic-danger">*</span></label>
                <select id="primaryLocale" value={form.primaryLocale} onChange={(e) => update('primaryLocale', e.target.value)} className={inputCls}>
                  {LAUNCH_LOCALES.map((loc) => <option key={loc} value={loc}>{t(`platform.catalogue.locales.${loc}`)}</option>)}
                </select>
              </div>
            </div>
          </fieldset>
        )}

        {step === 'commercial' && (
          <fieldset className="space-y-4">
            <legend className="mb-4 text-heading-h3 font-bold text-text-primary">{t('platform.tenants.create.commercial.title')}</legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="planKey">{t('platform.tenants.create.commercial.plan')}<span className="ml-1 text-semantic-danger">*</span></label>
                <select id="planKey" value={form.planKey} onChange={(e) => selectPlan(e.target.value)} className={inputCls} required>
                  <option value="">{t('platform.tenants.create.selectPlan')}</option>
                  {plans.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="billingCycle">{t('platform.tenants.create.commercial.billingCycle')}<span className="ml-1 text-semantic-danger">*</span></label>
                <select id="billingCycle" value={form.billingCycle} onChange={(e) => update('billingCycle', e.target.value as 'monthly' | 'annual')} className={inputCls}>
                  <option value="monthly">{t('platform.billing.monthly')}</option>
                  <option value="annual">{t('platform.billing.annual')}</option>
                </select>
              </div>
            </div>
            <div>
              <span className="mb-2 block text-label-md font-semibold text-text-primary">{t('platform.tenants.create.commercial.trialStatus')}<span className="ml-1 text-semantic-danger">*</span></span>
              <div className="flex gap-4">
                <label className="flex items-center gap-2"><input type="radio" checked={form.trialOn} onChange={() => update('trialOn', true)} />{t('platform.tenants.create.commercial.trialOn')}</label>
                <label className="flex items-center gap-2"><input type="radio" checked={!form.trialOn} onChange={() => { update('trialOn', false); update('trialEndsAt', undefined); }} />{t('platform.tenants.create.commercial.trialOff')}</label>
              </div>
            </div>
            {form.trialOn && (
              <div>
                <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="trialEndsAt">{t('platform.tenants.create.commercial.trialEndsAt')}<span className="ml-1 text-semantic-danger">*</span></label>
                <input id="trialEndsAt" type="date" value={form.trialEndsAt ?? ''} onChange={(e) => update('trialEndsAt', e.target.value || undefined)} className={inputCls} required aria-invalid={!!fieldError('trialEndsAt')} />
                {fieldError('trialEndsAt') && <p role="alert" className="mt-1 text-body-sm text-semantic-danger">{fieldError('trialEndsAt')}</p>}
              </div>
            )}
            <div>
              <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="seatLimit">{t('platform.tenants.create.commercial.seatLimit')}<span className="ml-1 text-semantic-danger">*</span></label>
              <input id="seatLimit" type="number" min={1} inputMode="numeric" value={form.seatLimit} onChange={(e) => { const n = parseInt(filterDigitsOnly(e.target.value, 6), 10); update('seatLimit', Number.isFinite(n) && n > 0 ? n : 1); }} className={inputCls} required aria-invalid={!!fieldError('seatLimit')} />
              {fieldError('seatLimit') && <p role="alert" className="mt-1 text-body-sm text-semantic-danger">{fieldError('seatLimit')}</p>}
            </div>
            <div>
              <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="storageLimitGb">{t('platform.tenants.create.commercial.storageLimit')}<span className="ml-1 text-semantic-danger">*</span></label>
              <div className="flex gap-2">
                <input id="storageLimitGb" type="number" min={1} inputMode="numeric" value={form.storageLimitGb} onChange={(e) => { const n = parseInt(filterDigitsOnly(e.target.value, 6), 10); update('storageLimitGb', Number.isFinite(n) && n > 0 ? n : 1); }} className={inputCls} required aria-invalid={!!fieldError('storageLimitGb')} />
                <span className="flex items-center rounded-md border border-border-default px-3 text-body-md text-text-secondary">GB</span>
              </div>
            </div>
          </fieldset>
        )}

        {step === 'product' && (
          <fieldset className="space-y-4">
            <legend className="mb-4 text-heading-h3 font-bold text-text-primary">{t('platform.tenants.create.product.title')}</legend>
            <div>
              <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="hostingRegion">{t('platform.tenants.create.company.hostingRegion')}<span className="ml-1 text-semantic-danger">*</span></label>
              <select id="hostingRegion" value={form.hostingRegion} onChange={(e) => update('hostingRegion', e.target.value)} className={inputCls} required>
                <option value="">{t('platform.tenants.create.selectRegion')}</option>
                {regions.map((r) => <option key={r.id} value={r.hostingRegion}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="supportTierKey">{t('platform.tenants.create.product.supportTier')}<span className="ml-1 text-semantic-danger">*</span></label>
              <select id="supportTierKey" value={form.supportTierKey} onChange={(e) => update('supportTierKey', e.target.value)} className={inputCls} required>
                {supportOptions.length === 0 ? (
                  <option value={DEDICATED_SUPPORT_CODE}>{t('platform.tenants.create.product.supportStandard')}</option>
                ) : (
                  supportOptions.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label} — {isEntitlementIncluded(opt.defaultValue) ? t('platform.tenants.create.product.included') : t('platform.tenants.create.product.notIncluded')}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <h4 className="mb-2 text-label-md font-semibold text-text-primary">{t('platform.tenants.create.product.enabledModules')}</h4>
              <ul className="space-y-2">
                {modules.map((mod) => (
                  <li key={mod.code} className="flex items-center justify-between rounded-md border border-border-default px-3 py-2">
                    <span className="text-body-sm text-text-primary">{mod.label}</span>
                    <label className="flex items-center gap-2 text-body-sm">
                      <input
                        type="checkbox"
                        checked={form.moduleToggles[mod.code] ?? false}
                        disabled={!isEntitlementIncluded(mod.defaultValue)}
                        onChange={(e) => setForm((prev) => ({ ...prev, moduleToggles: { ...prev.moduleToggles, [mod.code]: e.target.checked } }))}
                      />
                      {form.moduleToggles[mod.code] ? t('platform.tenants.create.product.enabled') : t('platform.tenants.create.product.disabled')}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ToggleRow label={t('platform.tenants.create.product.sso')} checked={form.ssoEnabled} planAllows={isEntitlementIncluded(planEntitlements.find((e) => e.code === SSO_CODE)?.defaultValue)} onChange={(v) => update('ssoEnabled', v)} enabledLabel={t('platform.tenants.create.product.enabled')} disabledLabel={t('platform.tenants.create.product.disabled')} />
              <ToggleRow label={t('platform.tenants.create.product.apiAccess')} checked={form.apiAccessEnabled} planAllows={isEntitlementIncluded(planEntitlements.find((e) => e.code === API_ACCESS_CODE)?.defaultValue)} onChange={(v) => update('apiAccessEnabled', v)} enabledLabel={t('platform.tenants.create.product.enabled')} disabledLabel={t('platform.tenants.create.product.disabled')} />
            </div>
          </fieldset>
        )}

        {step === 'admin' && (
          <fieldset className="space-y-4">
            <legend className="mb-4 text-heading-h3 font-bold text-text-primary">{t('platform.tenants.create.admin.title')}</legend>
            <div>
              <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="primaryAdminName">{t('platform.tenants.create.admin.name')}<span className="ml-1 text-semantic-danger">*</span></label>
              <input id="primaryAdminName" value={form.primaryAdmin.name} onChange={(e) => updateAdmin('name', filterPersonNameInput(e.target.value))} className={inputCls} required maxLength={160} aria-invalid={!!fieldError('name')} />
              {fieldError('name') && <p role="alert" className="mt-1 text-body-sm text-semantic-danger">{fieldError('name')}</p>}
            </div>
            <div>
              <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="primaryAdminEmail">{t('platform.tenants.create.admin.email')}<span className="ml-1 text-semantic-danger">*</span></label>
              <input id="primaryAdminEmail" type="email" value={form.primaryAdmin.email} onChange={(e) => updateAdmin('email', e.target.value.replace(/[\x00-\x1F\x7F]/g, ''))} className={inputCls} required maxLength={254} aria-invalid={!!fieldError('email')} />
              {fieldError('email') && <p role="alert" className="mt-1 text-body-sm text-semantic-danger">{fieldError('email')}</p>}
            </div>
            <div>
              <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="primaryAdminPhone">{t('platform.tenants.create.admin.phone')}</label>
              <input id="primaryAdminPhone" type="tel" inputMode="tel" value={form.primaryAdmin.phone ?? ''} onChange={(e) => updateAdmin('phone', filterInternationalPhoneInput(e.target.value))} className={inputCls} maxLength={16} aria-invalid={!!fieldError('phone')} />
              {fieldError('phone') && <p role="alert" className="mt-1 text-body-sm text-semantic-danger">{fieldError('phone')}</p>}
            </div>
            <div>
              <label className="mb-1 block text-label-md font-semibold text-text-primary" htmlFor="primaryAdminRole">{t('platform.tenants.create.admin.role')}<span className="ml-1 text-semantic-danger">*</span></label>
              <input id="primaryAdminRole" value={t('platform.tenants.create.admin.roleValue')} className={inputCls} readOnly />
            </div>
          </fieldset>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            <h3 className="text-heading-h3 font-bold text-text-primary">{t('platform.tenants.create.review.title')}</h3>
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-body-sm text-green-900">{t('platform.tenants.create.review.allRequired')}</div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ReviewCard title={t('platform.tenants.create.company.title')} rows={[
                [t('platform.tenants.create.company.legalName'), form.legalName],
                [t('platform.tenants.create.company.displayName'), form.displayName],
                [t('platform.tenants.create.company.country'), t(`platform.catalogue.countries.${form.countryCode}`)],
                [t('platform.tenants.create.company.currency'), form.currency],
                [t('platform.tenants.create.company.timeZone'), form.timeZone],
                [t('platform.tenants.create.company.language'), t(`platform.catalogue.locales.${form.primaryLocale}`)],
              ]} />
              <ReviewCard title={t('platform.tenants.create.commercial.title')} rows={[
                [t('platform.tenants.create.commercial.plan'), selectedPlan?.name ?? '—'],
                [t('platform.tenants.create.commercial.billingCycle'), t(`platform.billing.${form.billingCycle}`)],
                [t('platform.tenants.create.commercial.trialStatus'), form.trialOn ? t('platform.tenants.create.commercial.trialOn') : t('platform.tenants.create.commercial.trialOff')],
                [t('platform.tenants.create.commercial.seatLimit'), String(form.seatLimit)],
                [t('platform.tenants.create.commercial.storageLimit'), `${form.storageLimitGb} GB`],
              ]} />
              <ReviewCard title={t('platform.tenants.create.product.title')} rows={[
                [t('platform.tenants.create.company.hostingRegion'), form.hostingRegion],
                [t('platform.tenants.create.product.supportTier'), supportOptions.find((o) => o.code === form.supportTierKey)?.label ?? '—'],
                [t('platform.tenants.create.product.enabledModules'), enabledModuleLabels],
                [t('platform.tenants.create.product.sso'), form.ssoEnabled ? t('platform.tenants.create.product.enabled') : t('platform.tenants.create.product.disabled')],
                [t('platform.tenants.create.product.apiAccess'), form.apiAccessEnabled ? t('platform.tenants.create.product.enabled') : t('platform.tenants.create.product.disabled')],
              ]} />
              <ReviewCard title={t('platform.tenants.create.admin.title')} rows={[
                [t('platform.tenants.create.admin.name'), form.primaryAdmin.name],
                [t('platform.tenants.create.admin.email'), form.primaryAdmin.email],
                [t('platform.tenants.create.admin.phone'), form.primaryAdmin.phone || '—'],
                [t('platform.tenants.create.admin.role'), t('platform.tenants.create.admin.roleValue')],
              ]} />
            </div>
            {create.error && (
              <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-body-sm text-semantic-danger">
                {create.error instanceof ApiError ? create.error.message : t('errors.generic')}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-between border-t border-border-default pt-4">
          {stepIndex > 0 ? (
            <button type="button" onClick={() => setStep(FORM_STEPS[stepIndex - 1] as FormStep)} className="rounded-md border border-border-default px-4 py-2 text-body-md font-medium">{t('common.previous')}</button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            {step === 'review' && (
              <button type="button" disabled={create.isPending} onClick={() => void requestSubmit(false)} className="rounded-md border border-border-default px-4 py-2 text-body-md font-medium disabled:opacity-50">
                {t('platform.tenants.create.saveDraft')}
              </button>
            )}
            <button type="submit" disabled={create.isPending || (step !== 'review' && !canAdvanceFrom(step))} className="rounded-md bg-brand-blue-600 px-6 py-2 text-body-md font-semibold text-white disabled:opacity-50">
              {create.isPending ? t('common.loading') : step === 'review' ? t('platform.tenants.create.submitButton') : t('common.next')}
            </button>
          </div>
        </div>
      </form>

      <CreateTenantMfaDialog open={mfaOpen} pending={create.isPending} error={create.error} onClose={() => { setMfaOpen(false); setPendingSubmit(null); }} onConfirm={(code) => pendingSubmit && void submit(pendingSubmit.sendInvitation, code)} />
    </div>
  );
}

function ReviewCard({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <div className="rounded-lg border border-border-default bg-surface-canvas p-4">
      <h4 className="mb-3 text-label-md font-semibold text-text-primary">{title}</h4>
      <dl className="space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 text-body-sm">
            <dt className="text-text-secondary">{label}</dt>
            <dd className="font-medium text-text-primary ltr:text-end">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ToggleRow({ label, checked, planAllows, onChange, enabledLabel, disabledLabel }: { label: string; checked: boolean; planAllows: boolean; onChange: (v: boolean) => void; enabledLabel: string; disabledLabel: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border-default px-3 py-2">
      <span className="text-body-sm text-text-primary">{label}</span>
      <label className="flex items-center gap-2 text-body-sm">
        <input type="checkbox" checked={checked} disabled={!planAllows} onChange={(e) => onChange(e.target.checked)} />
        {checked ? enabledLabel : disabledLabel}
      </label>
    </div>
  );
}
