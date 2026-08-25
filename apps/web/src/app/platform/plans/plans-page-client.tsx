'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../components/common/page-header';
import { LoadingSpinner } from '../../../components/feedback/loading-spinner';
import { Dialog } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { PermissionGate } from '../../../lib/permissions/permission-gate';
import { usePlans } from '../../../modules/platform/hooks/use-tenants';
import { ROUTES } from '../../../constants/routes.constants';
import { PLATFORM_PERMISSIONS } from '../../../lib/permissions/constants';
import { formatEntitlementValue } from '../../../modules/platform/utils/plan-product-setup';
import type { Plan } from '../../../modules/platform/types/platform.types';

interface PlansPageClientProps {
  title: string;
  description: string;
}

function StatusBadge({ status }: { status: string }) {
  const color = status === 'ACTIVE' ? 'bg-green-50 text-semantic-success' : 'bg-slate-100 text-slate-600';
  return <span className={`rounded-full px-2.5 py-0.5 text-label-md font-semibold ${color}`}>{status}</span>;
}

function BillingBadge({ model }: { model: string }) {
  return <span className="rounded-full bg-brand-blue-50 px-2.5 py-0.5 text-label-md font-medium text-brand-blue-600">{model}</span>;
}

function PlanCard({ plan, onEdit }: { plan: Plan; onEdit: (p: Plan) => void }) {
  const t = useTranslations();
  const [showEntitlements, setShowEntitlements] = useState(false);

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

      {plan.entitlements && plan.entitlements.length > 0 && (
        <div className="border-t border-border-default pt-4">
          <button
            type="button"
            onClick={() => setShowEntitlements((v) => !v)}
            className="flex w-full items-center justify-between text-label-md font-semibold text-text-primary"
          >
            {t('platform.plans.entitlements')} ({plan.entitlements.length})
            <svg className={`h-4 w-4 text-text-secondary transition-transform ${showEntitlements ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showEntitlements && (
            <ul className="mt-3 space-y-2">
              {plan.entitlements.map((e) => (
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

      <div className="mt-auto pt-2">
        <PermissionGate permission={PLATFORM_PERMISSIONS.PLAN_MANAGE}>
          <button
            type="button"
            onClick={() => onEdit(plan)}
            className="rounded-md border border-border-default px-3 py-1.5 text-body-sm font-medium text-text-primary hover:bg-surface-canvas"
          >
            {t('common.edit')}
          </button>
        </PermissionGate>
      </div>
    </article>
  );
}

function PlanEditDialog({ plan, open, onClose }: { plan: Plan | null; open: boolean; onClose: () => void }) {
  const t = useTranslations();
  const [name, setName] = useState(plan?.name ?? '');
  const [description, setDescription] = useState(plan?.description ?? '');

  // Reset when plan changes
  useState(() => {
    setName(plan?.name ?? '');
    setDescription(plan?.description ?? '');
  });

  return (
    <Dialog
      open={open}
      onOpenChange={onClose}
      title={plan ? t('platform.plans.editPlan') : t('platform.plans.createPlan')}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" type="submit" form="plan-form">{t('common.save')}</Button>
        </>
      }
    >
      <form id="plan-form" onSubmit={(e) => { e.preventDefault(); onClose(); }} className="space-y-4">
        <div>
          <label htmlFor="plan-name" className="block text-label-md font-medium text-text-primary">{t('platform.plans.fields.name')}</label>
          <input
            id="plan-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 w-full rounded-md border border-border-default bg-surface-canvas px-3 py-2 text-body-md text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue-600"
          />
        </div>
        <div>
          <label htmlFor="plan-desc" className="block text-label-md font-medium text-text-primary">{t('platform.plans.fields.description')}</label>
          <textarea
            id="plan-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md border border-border-default bg-surface-canvas px-3 py-2 text-body-md text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue-600 resize-none"
          />
        </div>
        {plan && (
          <div className="rounded-md bg-surface-canvas p-3 text-body-sm text-text-secondary">
            {t('platform.plans.editNote')}
          </div>
        )}
      </form>
    </Dialog>
  );
}

export function PlansPageClient({ title, description }: PlansPageClientProps) {
  const t = useTranslations();
  const { data, isLoading, isError, refetch } = usePlans(true);
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

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

      {!isLoading && !isError && (data?.data ?? []).length === 0 && (
        <div className="rounded-xl border border-border-default bg-surface-primary p-12 text-center">
          <p className="text-body-md text-text-secondary">{t('platform.plans.empty')}</p>
        </div>
      )}

      {!isLoading && !isError && (data?.data ?? []).length > 0 && (
        <>
          {/* Summary counts */}
          <div className="flex flex-wrap gap-4 text-body-sm text-text-secondary">
            <span>{t('platform.plans.total', { count: data?.data.length ?? 0 })}</span>
            <span className="text-semantic-success">
              {t('platform.plans.active', { count: (data?.data ?? []).filter((p) => p.status === 'ACTIVE').length })}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(data?.data ?? []).map((plan) => (
              <PlanCard key={plan.id} plan={plan} onEdit={(p) => setEditPlan(p)} />
            ))}
          </div>
        </>
      )}

      <PlanEditDialog
        plan={editPlan}
        open={!!editPlan}
        onClose={() => setEditPlan(null)}
      />
      <PlanEditDialog
        plan={null}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}
