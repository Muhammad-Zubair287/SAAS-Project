'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { TenantStatusBadge } from './tenant-status-badge';
import { SuspendTenantDialog } from './suspend-tenant-dialog';
import { SupportGrantDialog } from './support-grant-dialog';
import { RestoreTenantDialog } from './restore-tenant-dialog';
import { ChangePlanDialog } from './change-plan-dialog';
import { LoadingSpinner } from '../../../components/feedback/loading-spinner';
import { useTenantUsage, useSupportGrants, useAuditEvents, usePlans } from '../hooks/use-tenants';
import { useActivateTenant } from '../hooks/use-tenant-mutations';
import { useAuth } from '../../../lib/auth/auth-provider';
import type { Tenant } from '../types/platform.types';
import { ProductSetupSummary } from './product-setup-summary';
import { formatEntitlementValue } from '../utils/plan-product-setup';

type Tab = 'overview' | 'usage' | 'subscription' | 'modules' | 'administrators' | 'support' | 'audit';

interface TenantDetailTabsProps {
  tenant: Tenant;
}

export function TenantDetailTabs({ tenant }: TenantDetailTabsProps) {
  const t = useTranslations();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showSuspend, setShowSuspend] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showRestore, setShowRestore] = useState(false);
  const [showChangePlan, setShowChangePlan] = useState(false);

  const activate = useActivateTenant(tenant.id);
  const { data: grantsData } = useSupportGrants(tenant.id);
  const activeGrant = (grantsData?.data ?? []).find((g) => {
    if (g.status !== 'ACTIVE') return false;
    const ends = new Date(g.endsAt).getTime();
    return Number.isFinite(ends) && ends > Date.now();
  });
  const canReactivateClosed = tenant.status === 'CLOSED' && user?.platformRole === 'PLATFORM_SUPER_ADMIN';
  const canSuspend = tenant.status === 'ACTIVE' || tenant.status === 'TRIAL' || tenant.status === 'GRACE';
  const canChangePlan = tenant.status === 'ACTIVE' || tenant.status === 'TRIAL' || tenant.status === 'DRAFT' || tenant.status === 'GRACE';

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: t('platform.tenants.detail.tabs.overview') },
    { key: 'usage', label: t('platform.tenants.detail.tabs.usage') },
    { key: 'subscription', label: t('platform.tenants.detail.tabs.subscription') },
    { key: 'modules', label: t('platform.tenants.detail.tabs.modules') },
    { key: 'administrators', label: t('platform.tenants.detail.tabs.administrators') },
    { key: 'support', label: t('platform.tenants.detail.tabs.support') },
    { key: 'audit', label: t('platform.tenants.detail.tabs.audit') },
  ];

  return (
    <div className="space-y-6">
      {activeGrant && (
        <div role="status" className="rounded-xl border border-semantic-warning/40 bg-surface-primary px-4 py-3">
          <p className="text-body-md font-semibold text-text-primary">{t('platform.tenants.support.bannerTitle')}</p>
          <p className="mt-1 text-body-sm text-text-secondary">{t('platform.tenants.support.bannerBody')}</p>
          <p className="mt-1 text-caption text-text-secondary ltr">
            {new Date(activeGrant.startsAt).toLocaleString()} → {new Date(activeGrant.endsAt).toLocaleString()}
          </p>
        </div>
      )}
      {/* Tenant Header */}
      <div className="rounded-xl border border-border-default bg-surface-primary p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-heading-h2 font-bold text-text-primary">{tenant.displayName}</h2>
              <TenantStatusBadge status={tenant.status} />
            </div>
            <p className="mt-1 text-body-md text-text-secondary">{tenant.legalName}</p>
            <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
              <div className="flex gap-1 text-body-sm">
                <dt className="text-text-secondary">{t('platform.tenants.detail.plan')}:</dt>
                <dd className="font-medium text-text-primary">{tenant.planName ?? tenant.planKey ?? '—'}</dd>
              </div>
              <div className="flex gap-1 text-body-sm">
                <dt className="text-text-secondary">{t('platform.tenants.detail.region')}:</dt>
                <dd className="font-medium text-text-primary">{tenant.deploymentRegionName ?? tenant.deploymentRegionCode ?? '—'}</dd>
              </div>
              <div className="flex gap-1 text-body-sm">
                <dt className="text-text-secondary">{t('platform.tenants.detail.seats')}:</dt>
                <dd className="font-medium text-text-primary tabular-nums">{tenant.seatLimit != null ? tenant.seatLimit.toLocaleString() : '—'}</dd>
              </div>
              <div className="flex gap-1 text-body-sm">
                <dt className="text-text-secondary">{t('platform.tenants.detail.created')}:</dt>
                <dd className="font-medium text-text-primary">
                  {new Date(tenant.createdAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>

          <div className="flex flex-shrink-0 flex-wrap gap-2">
            {(tenant.status === 'DRAFT' || canReactivateClosed) && (
              <button
                type="button"
                onClick={() => activate.mutate()}
                disabled={activate.isPending}
                className="rounded-md bg-semantic-success px-4 py-2 text-body-md font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {activate.isPending ? t('common.loading') : t('platform.tenants.actions.activate')}
              </button>
            )}
            {canSuspend && (
              <button
                type="button"
                onClick={() => setShowSuspend(true)}
                className="rounded-md border border-semantic-danger px-4 py-2 text-body-md font-semibold text-semantic-danger hover:bg-red-50"
              >
                {t('platform.tenants.actions.suspend')}
              </button>
            )}
            {tenant.status === 'SUSPENDED' && (
              <button
                type="button"
                onClick={() => setShowRestore(true)}
                className="rounded-md bg-semantic-info px-4 py-2 text-body-md font-semibold text-white hover:bg-blue-700"
              >
                {t('platform.tenants.actions.restore')}
              </button>
            )}
            {canChangePlan && (
              <button
                type="button"
                onClick={() => setShowChangePlan(true)}
                className="rounded-md border border-border-default px-4 py-2 text-body-md font-medium text-text-primary hover:bg-surface-canvas"
              >
                {t('platform.tenants.actions.changePlan')}
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowSupport(true)}
              className="rounded-md border border-border-default px-4 py-2 text-body-md font-medium text-text-primary hover:bg-surface-canvas"
            >
              {t('platform.tenants.actions.supportAccess')}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border-default">
        <nav className="-mb-px flex gap-6 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap border-b-2 pb-3 text-body-md font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-brand-blue-600 text-brand-blue-600'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
              aria-current={activeTab === tab.key ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'overview' && <OverviewTab tenant={tenant} />}
        {activeTab === 'usage' && <UsageTab tenantId={tenant.id} />}
        {activeTab === 'subscription' && <SubscriptionTab tenant={tenant} />}
        {activeTab === 'modules' && <ModulesTab planId={tenant.planId} />}
        {activeTab === 'administrators' && <AdministratorsTab tenant={tenant} />}
        {activeTab === 'support' && <SupportTab tenantId={tenant.id} />}
        {activeTab === 'audit' && <AuditTab tenantId={tenant.id} />}
      </div>

      <SuspendTenantDialog
        tenantId={tenant.id}
        tenantName={tenant.displayName}
        open={showSuspend}
        onClose={() => setShowSuspend(false)}
      />
      <SupportGrantDialog
        tenantId={tenant.id}
        open={showSupport}
        onClose={() => setShowSupport(false)}
      />
      <RestoreTenantDialog
        tenantId={tenant.id}
        open={showRestore}
        onClose={() => setShowRestore(false)}
      />
      <ChangePlanDialog
        tenantId={tenant.id}
        currentPlanKey={tenant.planKey}
        open={showChangePlan}
        onClose={() => setShowChangePlan(false)}
      />
    </div>
  );
}

function OverviewTab({ tenant }: { tenant: Tenant }) {
  const t = useTranslations();
  const fields: Array<{ label: string; value: string }> = [
    { label: t('platform.tenants.detail.fields.id'), value: tenant.id },
    { label: t('platform.tenants.detail.fields.slug'), value: tenant.slug },
    { label: t('platform.tenants.detail.fields.country'), value: tenant.countryCode },
    { label: t('platform.tenants.detail.fields.currency'), value: tenant.baseCurrency },
    { label: t('platform.tenants.detail.fields.timezone'), value: tenant.defaultTimezone },
    { label: t('platform.tenants.detail.fields.locale'), value: tenant.defaultLocale },
    { label: t('platform.tenants.detail.fields.createdBy'), value: tenant.createdBy ?? '—' },
    { label: t('platform.tenants.detail.fields.trialStatus'), value: tenant.subscriptionStatus ?? tenant.status },
    { label: t('platform.tenants.detail.fields.lastActivity'), value: tenant.lastActivityAt ? new Date(tenant.lastActivityAt).toLocaleString() : '—' },
    { label: t('platform.tenants.detail.fields.primaryContact'), value: tenant.primaryAdminInvitation?.email ?? tenant.administrators?.[0]?.email ?? '—' },
  ];
  return (
    <dl className="grid grid-cols-1 gap-4 rounded-xl border border-border-default bg-surface-primary p-6 sm:grid-cols-2">
      {fields.map((f) => (
        <div key={f.label}>
          <dt className="text-label-md font-semibold text-text-secondary">{f.label}</dt>
          <dd className="mt-0.5 text-body-md text-text-primary break-all">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function UsageTab({ tenantId }: { tenantId: string }) {
  const t = useTranslations();
  const { data, isLoading } = useTenantUsage(tenantId);

  if (isLoading) return <div className="flex justify-center p-8"><LoadingSpinner /></div>;
  if (!data) return null;

  const usage = data.data;
  const hasSnapshot = Boolean(usage.snapshotDate);
  const pct = Math.min(usage.seatUtilisationPct, 100);
  const barColor = pct > 90 ? 'bg-semantic-danger' : pct > 75 ? 'bg-semantic-warning' : 'bg-semantic-success';

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border-default bg-surface-primary p-6">
        <h3 className="text-title-md font-semibold text-text-primary mb-4">
          {t('platform.tenants.usage.seats')}
        </h3>
        {hasSnapshot ? (
          <div className="flex items-end gap-4">
            <div>
              <p className="text-metric-lg font-bold text-text-primary tabular-nums">
                {usage.activeEmployees.toLocaleString()}
              </p>
              <p className="text-body-sm text-text-secondary">
                {t('platform.tenants.usage.activeOf', { total: (usage.seatLimit ?? 0).toLocaleString() })}
              </p>
            </div>
            <div className="flex-1">
              <div className="h-2 w-full rounded-full bg-surface-canvas overflow-hidden">
                <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1 text-caption text-text-secondary text-right">{pct}%</p>
            </div>
          </div>
        ) : (
          <p className="text-body-md text-text-secondary">{t('platform.tenants.usage.noSnapshot')}</p>
        )}
      </div>
      <div className="rounded-xl border border-border-default bg-surface-primary p-6">
        <h3 className="text-title-md font-semibold text-text-primary mb-4">
          {t('platform.tenants.usage.storage')}
        </h3>
        {usage.storageLimitGb != null ? (
          <p className="text-body-md text-text-secondary">
            {t('platform.tenants.usage.storageOf', {
              used: formatBytes(usage.storageUsedBytes),
              limit: usage.storageLimitGb.toLocaleString(),
            })}
          </p>
        ) : (
          <p className="text-body-md text-text-secondary">
            {t('platform.tenants.usage.storageUsed', { used: formatBytes(usage.storageUsedBytes) })}
            <span className="mt-2 block text-body-sm">{t('platform.tenants.usage.storageLimitUnknown')}</span>
          </p>
        )}
      </div>
    </div>
  );
}

function formatBytes(raw: string): string {
  const bytes = Number(raw);
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 && unit > 0 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

function SubscriptionTab({ tenant }: { tenant: Tenant }) {
  const t = useTranslations();
  return (
    <div className="rounded-xl border border-border-default bg-surface-primary p-6">
      <p className="text-body-md text-text-secondary">
        {t('platform.tenants.subscription.currentPlan')}: <strong className="text-text-primary">{tenant.planName ?? tenant.planKey ?? '—'}</strong>
      </p>
      {tenant.activatedAt && (
        <p className="mt-2 text-body-md text-text-secondary">
          {t('platform.tenants.subscription.activeSince')}: <strong className="text-text-primary">{new Date(tenant.activatedAt).toLocaleDateString()}</strong>
        </p>
      )}
      <p className="mt-2 text-body-md text-text-secondary">
        {t('platform.tenants.create.commercial.subscriptionStart')}: <strong className="text-text-primary">{tenant.trialEndsAt ? t('platform.tenants.create.commercial.trial') : t('platform.tenants.create.commercial.paid')}</strong>
      </p>
      {tenant.trialEndsAt && (
        <p className="mt-2 text-body-md text-text-secondary">
          {t('platform.tenants.create.commercial.trialEndsAt')}: <strong className="text-text-primary">{new Date(tenant.trialEndsAt).toLocaleDateString()}</strong>
        </p>
      )}
      {tenant.billingCycle && (
        <p className="mt-2 text-body-md text-text-secondary">
          {t('platform.tenants.create.commercial.billingCycle')}: <strong className="text-text-primary">{t(`platform.billing.${tenant.billingCycle}`)}</strong>
        </p>
      )}
    </div>
  );
}

function ModulesTab({ planId }: { planId: string | null }) {
  const t = useTranslations();
  const { data, isLoading, isError, refetch } = usePlans(true);
  const plan = (data?.data ?? []).find((p) => p.id === planId);

  if (isLoading) return <div className="flex justify-center p-8"><LoadingSpinner /></div>;
  if (isError) {
    return (
      <div className="rounded-xl border border-border-default bg-surface-primary p-8 text-center">
        <p className="text-body-md text-text-secondary">{t('common.error')}</p>
        <button type="button" onClick={() => void refetch()} className="mt-3 text-body-sm font-medium text-brand-blue-600">{t('common.retry')}</button>
      </div>
    );
  }
  if (!plan) {
    return <div className="rounded-xl border border-border-default bg-surface-primary p-8 text-center text-body-md text-text-secondary">{t('platform.tenants.modules.empty')}</div>;
  }
  const entitlements = plan.entitlements ?? [];
  if (entitlements.length === 0) {
    return <div className="rounded-xl border border-border-default bg-surface-primary p-8 text-center text-body-md text-text-secondary">{t('platform.tenants.modules.empty')}</div>;
  }
  return (
    <div className="space-y-4 rounded-xl border border-border-default bg-surface-primary p-6">
      <ProductSetupSummary planName={plan.name} entitlements={entitlements} />
      <div className="border-t border-border-default pt-4">
        <h4 className="text-label-md font-semibold text-text-primary">{t('platform.plans.entitlements')}</h4>
        <ul className="mt-2 space-y-1">
          {entitlements.map((e) => (
            <li key={e.code} className="flex justify-between gap-4 text-body-sm">
              <span className="text-text-secondary">{e.label}</span>
              <span className="font-medium text-text-primary ltr text-end">
                {formatEntitlementValue(e, {
                  included: t('platform.plans.included'),
                  notIncluded: t('platform.plans.notIncluded'),
                })}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function AdministratorsTab({ tenant }: { tenant: Tenant }) {
  const t = useTranslations();
  const admins = tenant.administrators ?? (tenant.primaryAdminInvitation ? [tenant.primaryAdminInvitation] : []);
  if (admins.length === 0) {
    return <div className="rounded-xl border border-border-default bg-surface-primary p-8 text-center text-body-md text-text-secondary">{t('platform.tenants.administrators.empty')}</div>;
  }
  return (
    <div className="space-y-3">
      {admins.map((a) => (
        <div key={`${a.email}-${a.expiresAt}`} className="rounded-lg border border-border-default bg-surface-primary p-4">
          <p className="text-body-md font-medium text-text-primary ltr">{a.email}</p>
          <p className="mt-1 text-body-sm text-text-secondary">{t('platform.tenants.create.admin.role')}: {t('platform.tenants.create.admin.roleValue')}</p>
          <p className="mt-1 text-body-sm text-text-secondary">{t('platform.tenants.create.success.invitationStatus')}: {a.status}</p>
          <p className="mt-1 text-caption text-text-secondary">{t('platform.tenants.administrators.expires')}: {new Date(a.expiresAt).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}

function SupportTab({ tenantId }: { tenantId: string }) {
  const t = useTranslations();
  const { data, isLoading } = useSupportGrants(tenantId);

  if (isLoading) return <div className="flex justify-center p-8"><LoadingSpinner /></div>;

  const grants = data?.data ?? [];
  if (grants.length === 0) {
    return (
      <div className="rounded-xl border border-border-default bg-surface-primary p-8 text-center text-body-md text-text-secondary">
        {t('platform.tenants.support.noGrants')}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {grants.map((g) => (
        <div key={g.id} className="rounded-lg border border-border-default bg-surface-primary p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-body-md font-medium text-text-primary">{g.reason}</p>
              <p className="mt-1 text-body-sm text-text-secondary">
                {new Date(g.startsAt).toLocaleString()} → {new Date(g.endsAt).toLocaleString()}
              </p>
              <p className="mt-1 text-caption text-text-secondary">
                {t('platform.tenants.support.scope')}: {g.scope.join(', ')}
              </p>
            </div>
            <span className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-label-md font-semibold ${
              g.status === 'ACTIVE' ? 'bg-green-50 text-semantic-success' :
              g.status === 'REVOKED' ? 'bg-red-50 text-semantic-danger' :
              'bg-slate-100 text-slate-600'
            }`}>
              {g.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function AuditTab({ tenantId }: { tenantId: string }) {
  const t = useTranslations();
  const { data, isLoading, isError, refetch } = useAuditEvents({ tenantId, page: 1, pageSize: 20 });

  if (isLoading) return <div className="flex justify-center p-8"><LoadingSpinner /></div>;
  if (isError) {
    return (
      <div className="rounded-xl border border-border-default bg-surface-primary p-8 text-center">
        <p className="text-body-md text-text-secondary">{t('common.error')}</p>
        <button type="button" onClick={() => void refetch()} className="mt-3 text-body-sm font-medium text-brand-blue-600">{t('common.retry')}</button>
      </div>
    );
  }

  const events = data?.data ?? [];
  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-border-default bg-surface-primary p-8 text-center text-body-md text-text-secondary">
        {t('platform.audit.empty')}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border-default bg-surface-primary">
      <table className="min-w-full text-body-sm">
        <caption className="sr-only">{t('platform.audit.title')}</caption>
        <thead className="border-b border-border-default bg-surface-canvas">
          <tr>
            <th scope="col" className="px-4 py-3 text-start font-semibold text-text-secondary">{t('platform.audit.columns.time')}</th>
            <th scope="col" className="px-4 py-3 text-start font-semibold text-text-secondary">{t('platform.audit.columns.action')}</th>
            <th scope="col" className="px-4 py-3 text-start font-semibold text-text-secondary">{t('platform.audit.columns.actor')}</th>
            <th scope="col" className="px-4 py-3 text-start font-semibold text-text-secondary">{t('platform.audit.columns.severity')}</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id} className="border-b border-border-default last:border-0">
              <td className="px-4 py-3 whitespace-nowrap text-text-secondary">{new Date(e.occurredAt).toLocaleString()}</td>
              <td className="px-4 py-3"><span className="font-medium text-text-primary">{e.action}</span><span className="block text-caption text-text-secondary">{e.module}</span></td>
              <td className="px-4 py-3 text-text-secondary">{e.actorEmail ?? e.actorId.slice(0, 8)}</td>
              <td className="px-4 py-3"><span className="rounded-full bg-surface-canvas px-2 py-0.5 text-caption font-semibold">{e.severity}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
