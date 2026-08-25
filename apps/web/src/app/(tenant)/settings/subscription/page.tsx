'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../../components/common/page-header';
import { LoadingSpinner } from '../../../../components/feedback/loading-spinner';
import { StatCard } from '../../../../components/common/stat-card';
import {
  useCreateUpgradeRequest,
  useTenantModules,
  useTenantSubscription,
  useTenantUsage,
  useUpgradeRequests,
} from '../../../../modules/tenant/hooks/use-tenant-admin';

export default function SubscriptionSettingsPage() {
  const t = useTranslations();
  const sub = useTenantSubscription();
  const usage = useTenantUsage();
  const modules = useTenantModules();
  const upgradeRequests = useUpgradeRequests();
  const upgrade = useCreateUpgradeRequest();
  const [planKey, setPlanKey] = useState('');
  const [note, setNote] = useState('');
  const [billingEmail, setBillingEmail] = useState('');

  if (sub.isLoading || usage.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const s = sub.data?.data;
  const u = usage.data?.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('tenant.settings.subscription.title')}
        description={t('tenant.settings.subscription.description')}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Plan" value={s?.planName ?? s?.planCode ?? '—'} />
        <StatCard
          title={t('tenant.settings.subscription.activeEmployees')}
          value={u?.activeEmployees ?? 0}
        />
        <StatCard
          title={t('tenant.settings.subscription.seatLimit')}
          value={u?.seatLimit ?? s?.seatLimit ?? '—'}
        />
        <StatCard
          title={t('tenant.settings.subscription.storage')}
          value={u ? `${Math.round(u.storageUsedBytes / (1024 * 1024))} MB` : '—'}
        />
      </div>
      {u?.warnings.approachingSeatLimit ? (
        <p className="text-body-sm text-status-warning">
          {t('tenant.settings.subscription.approaching')}
        </p>
      ) : null}
      {u?.warnings.seatLimitReached ? (
        <p className="text-body-sm text-status-danger">
          {t('tenant.settings.subscription.reached')}
        </p>
      ) : null}

      <form
        className="space-y-3 rounded-lg border border-border-default bg-surface-card p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void upgrade.mutateAsync({
            requestedPlanKey: planKey || undefined,
            note: note || undefined,
            billingContactEmail: billingEmail || undefined,
          });
        }}
      >
        <h2 className="text-title-sm font-semibold">
          {t('tenant.settings.subscription.requestUpgrade')}
        </h2>
        <select
          className="w-full rounded-md border border-border-default px-3 py-2"
          value={planKey}
          onChange={(e) => setPlanKey(e.target.value)}
        >
          <option value="">Select plan</option>
          {(modules.data?.data?.availablePlans ?? []).map((p) => (
            <option key={p.id} value={p.code}>
              {p.name}
            </option>
          ))}
        </select>
        <input
          className="w-full rounded-md border border-border-default px-3 py-2"
          placeholder="Billing contact email"
          value={billingEmail}
          onChange={(e) => setBillingEmail(e.target.value)}
        />
        <textarea
          className="w-full rounded-md border border-border-default px-3 py-2"
          placeholder="Note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {upgrade.isSuccess ? (
          <p className="text-body-sm text-status-success">Request submitted</p>
        ) : null}
        <button
          type="submit"
          disabled={upgrade.isPending || !planKey}
          className="rounded-md bg-brand-blue-600 px-4 py-2 text-white disabled:opacity-60"
        >
          {t('tenant.settings.subscription.requestUpgrade')}
        </button>
      </form>

      <section className="space-y-3 rounded-lg border border-border-default bg-surface-card p-4">
        <h2 className="text-title-sm font-semibold">
          {t('tenant.settings.subscription.history')}
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-body-sm">
            <thead className="bg-surface-muted">
              <tr>
                <th className="px-3 py-2">{t('tenant.settings.subscription.status')}</th>
                <th className="px-3 py-2">{t('tenant.settings.subscription.plan')}</th>
                <th className="px-3 py-2">{t('tenant.settings.subscription.createdAt')}</th>
                <th className="px-3 py-2">{t('tenant.settings.subscription.note')}</th>
              </tr>
            </thead>
            <tbody>
              {(upgradeRequests.data?.data ?? []).map((request) => (
                <tr key={request.id} className="border-t border-border-default">
                  <td className="px-3 py-2">{request.status}</td>
                  <td className="px-3 py-2">
                    {request.requestedPlanName ??
                      request.planName ??
                      request.requestedPlanKey ??
                      request.planCode ??
                      '—'}
                  </td>
                  <td className="px-3 py-2">
                    {request.createdAt ? new Date(request.createdAt).toLocaleString() : '—'}
                  </td>
                  <td className="px-3 py-2">{request.note ?? '—'}</td>
                </tr>
              ))}
              {!upgradeRequests.isLoading && (upgradeRequests.data?.data ?? []).length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-text-secondary" colSpan={4}>
                    {t('tenant.settings.subscription.noHistory')}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
