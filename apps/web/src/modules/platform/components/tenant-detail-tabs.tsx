'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { TenantStatusBadge } from './tenant-status-badge';
import { SuspendTenantDialog } from './suspend-tenant-dialog';
import { SupportGrantDialog } from './support-grant-dialog';
import { LoadingSpinner } from '../../../components/feedback/loading-spinner';
import { useTenantUsage, useSupportGrants } from '../hooks/use-tenants';
import { useActivateTenant, useRestoreTenant } from '../hooks/use-tenant-mutations';
import type { Tenant } from '../types/platform.types';

type Tab = 'overview' | 'usage' | 'subscription' | 'support' | 'audit';

interface TenantDetailTabsProps {
  tenant: Tenant;
}

export function TenantDetailTabs({ tenant }: TenantDetailTabsProps) {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showSuspend, setShowSuspend] = useState(false);
  const [showSupport, setShowSupport] = useState(false);

  const activate = useActivateTenant(tenant.id);
  const restore = useRestoreTenant(tenant.id);

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: t('platform.tenants.detail.tabs.overview') },
    { key: 'usage', label: t('platform.tenants.detail.tabs.usage') },
    { key: 'subscription', label: t('platform.tenants.detail.tabs.subscription') },
    { key: 'support', label: t('platform.tenants.detail.tabs.support') },
    { key: 'audit', label: t('platform.tenants.detail.tabs.audit') },
  ];

  return (
    <div className="space-y-6">
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
                <dd className="font-medium capitalize text-text-primary">{tenant.planId ?? '—'}</dd>
              </div>
              <div className="flex gap-1 text-body-sm">
                <dt className="text-text-secondary">{t('platform.tenants.detail.region')}:</dt>
                <dd className="font-medium text-text-primary">{tenant.deploymentRegionId}</dd>
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
            {tenant.status === 'DRAFT' && (
              <button
                type="button"
                onClick={() => activate.mutate()}
                disabled={activate.isPending}
                className="rounded-md bg-semantic-success px-4 py-2 text-body-md font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {activate.isPending ? t('common.loading') : t('platform.tenants.actions.activate')}
              </button>
            )}
            {tenant.status === 'ACTIVE' && (
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
                onClick={() => restore.mutate({ reason: 'Manual restore by platform admin' })}
                disabled={restore.isPending}
                className="rounded-md bg-semantic-info px-4 py-2 text-body-md font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {restore.isPending ? t('common.loading') : t('platform.tenants.actions.restore')}
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
              className={`whitespace-nowrap pb-3 text-body-md font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-b-2 border-brand-blue-600 text-brand-blue-600'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
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
        {activeTab === 'support' && <SupportTab tenantId={tenant.id} />}
        {activeTab === 'audit' && <AuditTab />}
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
  const pct = Math.min(usage.seatUtilisationPct, 100);
  const barColor = pct > 90 ? 'bg-semantic-danger' : pct > 75 ? 'bg-semantic-warning' : 'bg-semantic-success';

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border-default bg-surface-primary p-6">
        <h3 className="text-title-md font-semibold text-text-primary mb-4">
          {t('platform.tenants.usage.seats')}
        </h3>
        <div className="flex items-end gap-4">
          <div>
            <p className="text-metric-lg font-bold text-text-primary tabular-nums">
              {usage.activeEmployees.toLocaleString()}
            </p>
            <p className="text-body-sm text-text-secondary">
              {t('platform.tenants.usage.activeOf', { total: usage.seatLimit.toLocaleString() })}
            </p>
          </div>
          <div className="flex-1">
            <div className="h-2 w-full rounded-full bg-surface-canvas overflow-hidden">
              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1 text-caption text-text-secondary text-right">{pct}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SubscriptionTab({ tenant }: { tenant: Tenant }) {
  const t = useTranslations();
  return (
    <div className="rounded-xl border border-border-default bg-surface-primary p-6">
      <p className="text-body-md text-text-secondary">
        {t('platform.tenants.subscription.currentPlan')}: <strong className="capitalize text-text-primary">{tenant.planId ?? '—'}</strong>
      </p>
      {tenant.activatedAt && (
        <p className="mt-2 text-body-md text-text-secondary">
          {t('platform.tenants.subscription.activeSince')}: <strong className="text-text-primary">{new Date(tenant.activatedAt).toLocaleDateString()}</strong>
        </p>
      )}
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

function AuditTab() {
  const t = useTranslations();
  return (
    <div className="rounded-xl border border-border-default bg-surface-primary p-8 text-center text-body-md text-text-secondary">
      {t('platform.audit.comingSoon')}
    </div>
  );
}
