'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../components/common/page-header';
import { LoadingSpinner } from '../../../components/feedback/loading-spinner';
import { Button } from '../../../components/ui/button';
import { PermissionGate } from '../../../lib/permissions/permission-gate';
import { usePlans } from '../../../modules/platform/hooks/use-tenants';
import { ROUTES } from '../../../constants/routes.constants';
import { PLATFORM_PERMISSIONS } from '../../../lib/permissions/constants';
import { formatEntitlementValue } from '../../../modules/platform/utils/plan-product-setup';
import { PlanFormDialog } from '../../../modules/platform/components/plan-form-dialog';
import { DeletePlanDialog } from '../../../modules/platform/components/delete-plan-dialog';
import type { Plan } from '../../../modules/platform/types/platform.types';

interface PlansPageClientProps {
  title: string;
  description: string;
}

function StatusBadge({ status }: { status: string }) {
  const t = useTranslations();
  const color = status === 'ACTIVE' ? 'bg-green-50 text-semantic-success' : 'bg-slate-100 text-slate-600';
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-label-md font-semibold ${color}`}>
      {t(`platform.plans.statuses.${status}`, { defaultValue: status })}
    </span>
  );
}

function BillingBadge({ model }: { model: string }) {
  const t = useTranslations();
  return (
    <span className="rounded-full bg-brand-blue-50 px-2.5 py-0.5 text-label-md font-medium text-brand-blue-600">
      {t(`platform.plans.billingModels.${model}`, { defaultValue: model })}
    </span>
  );
}

function PlanCard({
  plan,
  onEdit,
  onDelete,
}: {
  plan: Plan;
  onEdit: (p: Plan) => void;
  onDelete: (p: Plan) => void;
}) {
  const t = useTranslations();
  const [showEntitlements, setShowEntitlements] = useState(false);

  const keyEntitlements = (plan.entitlements ?? []).filter(
    (e) => e.dataType === 'BOOLEAN' || e.code === 'max_employees',
  );

  return (
    <article className="rounded-xl border border-border-default bg-surface-primary p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-title-md font-semibold text-text-primary">{plan.name}</h2>
          <p className="mt-0.5 text-caption text-text-secondary font-mono">{plan.code}</p>
        </div>
        <StatusBadge status={plan.status} />
      </div>

      {plan.description && (
        <p className="text-body-sm text-text-secondary">{plan.description}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <BillingBadge model={plan.billingModel} />
      </div>

      {keyEntitlements.length > 0 && (
        <div className="border-t border-border-default pt-4">
          <button
            type="button"
            onClick={() => setShowEntitlements((v) => !v)}
            className="flex w-full items-center justify-between text-label-md font-semibold text-text-primary"
          >
            {t('platform.plans.entitlements')} ({plan.entitlements?.length ?? 0})
            <svg className={`h-4 w-4 text-text-secondary transition-transform ${showEntitlements ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showEntitlements && (
            <ul className="mt-3 space-y-2">
              {(plan.entitlements ?? []).map((e) => (
                <li key={e.code} className="flex items-center justify-between gap-3 text-body-sm">
                  <span className="text-text-secondary">{e.label}</span>
                  <span className="font-medium text-text-primary text-end">
                    {formatEntitlementValue(e, {
                      included: t('platform.plans.included'),
                      notIncluded: t('platform.plans.notIncluded'),
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-auto flex flex-wrap gap-2 pt-2">
        <PermissionGate permission={PLATFORM_PERMISSIONS.PLAN_MANAGE}>
          <button
            type="button"
            onClick={() => onEdit(plan)}
            className="rounded-md border border-border-default px-3 py-1.5 text-body-sm font-medium text-text-primary hover:bg-surface-canvas"
          >
            {t('common.edit')}
          </button>
          <button
            type="button"
            onClick={() => onDelete(plan)}
            className="rounded-md border border-semantic-danger/40 px-3 py-1.5 text-body-sm font-medium text-semantic-danger hover:bg-red-50"
          >
            {t('common.delete')}
          </button>
        </PermissionGate>
      </div>
    </article>
  );
}

export function PlansPageClient({ title, description }: PlansPageClientProps) {
  const t = useTranslations();
  const { data, isLoading, isError, refetch } = usePlans(true, true);
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deletePlan, setDeletePlan] = useState<Plan | null>(null);

  const plans = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[
          { label: t('platform.nav.overview'), href: ROUTES.PLATFORM.DASHBOARD },
          { label: title },
        ]}
        actions={
          <PermissionGate permission={PLATFORM_PERMISSIONS.PLAN_MANAGE}>
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
              {t('platform.plans.createPlan')}
            </Button>
          </PermissionGate>
        }
      />

      {isLoading && <div className="flex justify-center p-12"><LoadingSpinner /></div>}
      {isError && (
        <div className="rounded-xl border border-border-default bg-surface-primary p-8 text-center">
          <p className="text-body-md text-text-secondary">{t('common.error')}</p>
          <button type="button" onClick={() => void refetch()} className="mt-3 text-body-sm font-medium text-brand-blue-600">{t('common.retry')}</button>
        </div>
      )}

      {!isLoading && !isError && plans.length === 0 && (
        <div className="rounded-xl border border-border-default bg-surface-primary p-12 text-center">
          <p className="text-body-md font-medium text-text-primary">{t('platform.plans.emptyTitle')}</p>
          <p className="mt-2 text-body-sm text-text-secondary">{t('platform.plans.emptyDescription')}</p>
          <PermissionGate permission={PLATFORM_PERMISSIONS.PLAN_MANAGE}>
            <Button variant="primary" className="mt-6" onClick={() => setCreateOpen(true)}>
              {t('platform.plans.createPlan')}
            </Button>
          </PermissionGate>
        </div>
      )}

      {!isLoading && !isError && plans.length > 0 && (
        <>
          <div className="flex flex-wrap gap-4 text-body-sm text-text-secondary">
            <span>{t('platform.plans.total', { count: plans.length })}</span>
            <span className="text-semantic-success">
              {t('platform.plans.active', { count: plans.filter((p) => p.status === 'ACTIVE').length })}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onEdit={(p) => setEditPlan(p)}
                onDelete={(p) => setDeletePlan(p)}
              />
            ))}
          </div>
        </>
      )}

      <PlanFormDialog
        plan={editPlan}
        open={!!editPlan}
        onClose={() => setEditPlan(null)}
      />
      <PlanFormDialog
        plan={null}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
      <DeletePlanDialog
        plan={deletePlan}
        open={!!deletePlan}
        onClose={() => setDeletePlan(null)}
      />
    </div>
  );
}
