'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Field } from '../../../components/ui/field';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Select } from '../../../components/ui/select';
import { LoadingSpinner } from '../../../components/feedback/loading-spinner';
import {
  PLAN_BILLING_MODELS,
  PLAN_STATUSES,
  buildEntitlementSubmitPayload,
  classifyEntitlementGroup,
  initialEntitlementValue,
  type EntitlementFormGroup,
} from '../constants/plan-admin.constants';
import { validatePlanForm } from '../schemas/plan-form.schema';
import {
  filterOrganizationNameInput,
  filterPlanCodeInput,
  filterSafeDescriptionInput,
  isValidOrganizationName,
  sanitizeTrimmed,
  containsInjectionPayload,
} from '../../../lib/validation/input-security';
import { useEntitlementCatalogue } from '../hooks/use-tenants';
import { useCreatePlan, useSetPlanEntitlements, useUpdatePlan } from '../hooks/use-plan-mutations';
import type { EntitlementCatalogueItem, Plan } from '../types/platform.types';
import { toastApiSuccess } from '../lib/platform-toast';

interface PlanFormDialogProps {
  plan: Plan | null;
  open: boolean;
  onClose: () => void;
}

interface FormState {
  code: string;
  name: string;
  description: string;
  billingModel: string;
  status: string;
}

type EntitlementValues = Record<string, unknown>;

function groupCatalogue(items: EntitlementCatalogueItem[]) {
  const groups: Record<EntitlementFormGroup, EntitlementCatalogueItem[]> = {
    modules: [],
    enterprise: [],
    limits: [],
    other: [],
  };

  for (const item of items) {
    groups[classifyEntitlementGroup(item.code, item.dataType)].push(item);
  }

  return groups;
}

function buildEntitlementDefaults(
  catalogue: EntitlementCatalogueItem[],
  plan: Plan | null,
): EntitlementValues {
  const values: EntitlementValues = {};
  const planByCode = new Map((plan?.entitlements ?? []).map((row) => [row.code, row.defaultValue]));

  for (const item of catalogue) {
    const fromPlan = planByCode.get(item.code);
    values[item.id] =
      fromPlan !== undefined
        ? initialEntitlementValue(item.dataType, fromPlan)
        : initialEntitlementValue(item.dataType, item.defaultValue);
  }

  return values;
}

function EntitlementControl({
  item,
  value,
  onChange,
  labels,
}: {
  item: EntitlementCatalogueItem;
  value: unknown;
  onChange: (next: unknown) => void;
  labels: { included: string; notIncluded: string };
}) {
  if (item.dataType === 'BOOLEAN') {
    const checked = value === true;
    return (
      <label className="flex items-center justify-between gap-3 rounded-md border border-border-default bg-surface-canvas px-3 py-2">
        <span className="text-body-sm text-text-primary">{item.label}</span>
        <span className="flex items-center gap-2 text-body-sm text-text-secondary">
          <span>{checked ? labels.included : labels.notIncluded}</span>
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            aria-label={item.label}
            className="h-4 w-4 rounded border-border-default text-brand-blue-600 focus:ring-brand-blue-600"
          />
        </span>
      </label>
    );
  }

  const inputType = item.dataType === 'INTEGER' ? 'number' : item.dataType === 'DECIMAL' ? 'number' : 'text';
  const step = item.dataType === 'DECIMAL' ? 'any' : item.dataType === 'INTEGER' ? '1' : undefined;

  return (
    <Field label={item.label} description={item.unit ? `${item.unit}` : undefined}>
      <Input
        type={inputType}
        step={step}
        value={value == null ? '' : String(value)}
        onChange={(e) => {
          const raw = e.target.value;
          if (item.dataType === 'STRING') {
            onChange(raw);
            return;
          }
          onChange(raw === '' ? '' : Number(raw));
        }}
      />
    </Field>
  );
}

function EntitlementSection({
  title,
  items,
  values,
  onChange,
  labels,
}: {
  title: string;
  items: EntitlementCatalogueItem[];
  values: EntitlementValues;
  onChange: (id: string, next: unknown) => void;
  labels: { included: string; notIncluded: string };
}) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <h3 className="text-label-md font-semibold text-text-primary">{title}</h3>
      <div className="space-y-3">
        {items.map((item) => (
          <EntitlementControl
            key={item.id}
            item={item}
            value={values[item.id]}
            onChange={(next) => onChange(item.id, next)}
            labels={labels}
          />
        ))}
      </div>
    </section>
  );
}

export function PlanFormDialog({ plan, open, onClose }: PlanFormDialogProps) {
  const t = useTranslations();
  const isEdit = Boolean(plan);
  const { data: catalogueRes, isLoading: catalogueLoading, isError: catalogueError } = useEntitlementCatalogue(open);
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan(plan?.id ?? '');
  const setEntitlements = useSetPlanEntitlements(plan?.id ?? '');

  const catalogue = catalogueRes?.data ?? [];
  const grouped = useMemo(() => groupCatalogue(catalogue), [catalogue]);
  const baseEntitlementValues = useMemo(
    () => buildEntitlementDefaults(catalogue, plan),
    [catalogue, plan],
  );

  const [form, setForm] = useState<FormState>({
    code: '',
    name: '',
    description: '',
    billingModel: 'PER_SEAT',
    status: 'ACTIVE',
  });
  const [entitlementOverrides, setEntitlementOverrides] = useState<EntitlementValues>({});
  const [formError, setFormError] = useState<string | null>(null);
  const submitInFlightRef = useRef(false);

  const entitlementValues = useMemo(
    () => ({ ...baseEntitlementValues, ...entitlementOverrides }),
    [baseEntitlementValues, entitlementOverrides],
  );

  useEffect(() => {
    if (!open) return;
    setForm({
      code: plan?.code ?? '',
      name: plan?.name ?? '',
      description: plan?.description ?? '',
      billingModel: plan?.billingModel ?? 'PER_SEAT',
      status: plan?.status ?? 'ACTIVE',
    });
    setEntitlementOverrides({});
    setFormError(null);
  }, [open, plan]);

  const entitlementsReady =
    catalogue.length === 0 || catalogue.every((item) => entitlementValues[item.id] !== undefined);

  const isSaving = createPlan.isPending || updatePlan.isPending || setEntitlements.isPending;
  const entitlementLabels = {
    included: t('platform.plans.included'),
    notIncluded: t('platform.plans.notIncluded'),
  };

  const billingOptions = PLAN_BILLING_MODELS.map((value) => ({
    value,
    label: t(`platform.plans.billingModels.${value}`),
  }));

  const statusOptions = PLAN_STATUSES.map((value) => ({
    value,
    label: t(`platform.plans.statuses.${value}`),
  }));

  function updateEntitlement(id: string, next: unknown) {
    setEntitlementOverrides((prev) => ({ ...prev, [id]: next }));
  }

  function buildEntitlementPayload() {
    return buildEntitlementSubmitPayload(catalogue, entitlementValues);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitInFlightRef.current || isSaving) return;
    submitInFlightRef.current = true;
    setFormError(null);

    if (!isEdit) {
      const validation = validatePlanForm(form);
      if (!validation.ok) {
        setFormError(t(validation.messageKey));
        submitInFlightRef.current = false;
        return;
      }
    } else {
      const name = sanitizeTrimmed(form.name);
      if (!name || !isValidOrganizationName(name)) {
        setFormError(t('platform.plans.validation.name'));
        submitInFlightRef.current = false;
        return;
      }
      const description = sanitizeTrimmed(form.description);
      if (description && containsInjectionPayload(description)) {
        setFormError(t('platform.plans.validation.description'));
        submitInFlightRef.current = false;
        return;
      }
    }

    const code = sanitizeTrimmed(form.code).toLowerCase();
    const name = sanitizeTrimmed(form.name);
    if (!code && !isEdit) {
      setFormError(t('platform.plans.validation.required'));
      submitInFlightRef.current = false;
      return;
    }
    if (!name) {
      setFormError(t('platform.plans.validation.required'));
      submitInFlightRef.current = false;
      return;
    }

    if (catalogue.length === 0) {
      setFormError(t('platform.plans.catalogueEmpty'));
      submitInFlightRef.current = false;
      return;
    }

    let entitlementPayload;
    try {
      entitlementPayload = buildEntitlementPayload();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t('platform.plans.validation.required'));
      submitInFlightRef.current = false;
      return;
    }

    try {
      if (isEdit && plan) {
        await updatePlan.mutateAsync({
          name,
          description: sanitizeTrimmed(form.description) || undefined,
          billingModel: form.billingModel,
          status: form.status,
        });
        await setEntitlements.mutateAsync(entitlementPayload);
        toastApiSuccess(t('platform.plans.toast.updated'));
      } else {
        await createPlan.mutateAsync({
          code,
          name,
          description: sanitizeTrimmed(form.description) || undefined,
          billingModel: form.billingModel,
          status: form.status,
          entitlements: entitlementPayload,
        });
        toastApiSuccess(t('platform.plans.toast.created'));
      }
      onClose();
    } catch {
      // toast handled by mutation hooks
    } finally {
      submitInFlightRef.current = false;
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => { if (!next) onClose(); }}
      title={isEdit ? t('platform.plans.editPlan') : t('platform.plans.createPlan')}
      size="lg"
      closeOnBackdropClick={!isSaving}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            type="button"
            isLoading={isSaving}
            disabled={catalogueLoading || catalogueError || catalogue.length === 0 || !entitlementsReady}
            onClick={() => void handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
          >
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="plan-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
        <section className="space-y-4">
          <h3 className="text-label-md font-semibold text-text-primary">{t('platform.plans.sections.details')}</h3>

          {!isEdit && (
            <Field label={t('platform.plans.fields.code')} required>
              <Input
                value={form.code}
                onChange={(e) => setForm((prev) => ({ ...prev, code: filterPlanCodeInput(e.target.value) }))}
                maxLength={40}
                required
                className="font-mono"
              />
            </Field>
          )}

          <Field label={t('platform.plans.fields.name')} required>
            <Input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: filterOrganizationNameInput(e.target.value) }))}
              maxLength={100}
              required
            />
          </Field>

          <Field label={t('platform.plans.fields.description')}>
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: filterSafeDescriptionInput(e.target.value) }))
              }
              rows={3}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('platform.plans.fields.billingModel')} required>
              <Select
                value={form.billingModel}
                onChange={(e) => setForm((prev) => ({ ...prev, billingModel: e.target.value }))}
                options={billingOptions}
                required
              />
            </Field>

            <Field label={t('platform.plans.fields.status')} required>
              <Select
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                options={statusOptions}
                required
              />
            </Field>
          </div>

          {isEdit && (
            <div className="rounded-md bg-surface-canvas p-3 text-body-sm text-text-secondary">
              {t('platform.plans.editNote')}
            </div>
          )}
        </section>

        <section className="space-y-4 border-t border-border-default pt-4">
          <h3 className="text-label-md font-semibold text-text-primary">{t('platform.plans.sections.entitlements')}</h3>

          {catalogueLoading && (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          )}

          {catalogueError && (
            <p className="text-body-sm text-semantic-danger" role="alert">
              {t('platform.plans.catalogueLoadError')}
            </p>
          )}

          {!catalogueLoading && !catalogueError && catalogue.length === 0 && (
            <div className="rounded-md border border-semantic-warning/30 bg-semantic-warning/10 p-4 text-body-sm text-text-primary" role="alert">
              <p className="font-medium">{t('platform.plans.catalogueEmptyTitle')}</p>
              <p className="mt-1 text-text-secondary">{t('platform.plans.catalogueEmpty')}</p>
            </div>
          )}

          {!catalogueLoading && catalogue.length > 0 && (
            <div className="max-h-[min(50vh,28rem)] space-y-6 overflow-y-auto pe-1">
              <EntitlementSection
                title={t('platform.plans.groups.modules')}
                items={grouped.modules}
                values={entitlementValues}
                onChange={updateEntitlement}
                labels={entitlementLabels}
              />
              <EntitlementSection
                title={t('platform.plans.groups.enterprise')}
                items={grouped.enterprise}
                values={entitlementValues}
                onChange={updateEntitlement}
                labels={entitlementLabels}
              />
              <EntitlementSection
                title={t('platform.plans.groups.limits')}
                items={grouped.limits}
                values={entitlementValues}
                onChange={updateEntitlement}
                labels={entitlementLabels}
              />
              <EntitlementSection
                title={t('platform.plans.groups.other')}
                items={grouped.other}
                values={entitlementValues}
                onChange={updateEntitlement}
                labels={entitlementLabels}
              />
            </div>
          )}
        </section>

        {formError && (
          <p className="text-body-sm text-semantic-danger" role="alert">
            {formError}
          </p>
        )}
      </form>
    </Dialog>
  );
}
