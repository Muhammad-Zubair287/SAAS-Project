'use client';

import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../components/common/page-header';
import { LoadingSpinner } from '../../../components/feedback/loading-spinner';
import { PermissionGate } from '../../../lib/permissions/permission-gate';
import { useIntegrationHealth, useIntegrationIncidents } from '../../../modules/platform/hooks/use-tenants';
import { useRetryIntegration, useDisableIntegration } from '../../../modules/platform/hooks/use-tenant-mutations';
import { ROUTES } from '../../../constants/routes.constants';
import { PLATFORM_PERMISSIONS } from '../../../lib/permissions/constants';
import type { IntegrationHealthCard, IntegrationIncident } from '../../../modules/platform/types/platform.types';

interface IntegrationHealthPageClientProps {
  title: string;
  description: string;
}

function normalizeStatus(status: string): string {
  return status.toUpperCase();
}

function StatusDot({ status }: { status: string }) {
  const s = normalizeStatus(status);
  const color =
    s === 'HEALTHY'
      ? 'bg-semantic-success'
      : s === 'WARNING'
        ? 'bg-semantic-warning'
        : s === 'FAILED'
          ? 'bg-semantic-danger'
          : 'bg-surface-canvas';
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />
      <span className="text-body-sm font-medium">{s}</span>
    </span>
  );
}

function IntegrationCard({ card }: { card: IntegrationHealthCard }) {
  const t = useTranslations();
  const retry = useRetryIntegration();
  const disable = useDisableIntegration();
  const status = normalizeStatus(card.status);

  return (
    <article className="rounded-xl border border-border-default bg-surface-primary p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-title-sm font-semibold text-text-primary truncate">{card.name}</h3>
          <p className="mt-0.5 text-caption text-text-secondary">{card.category ?? card.type ?? card.provider}</p>
        </div>
        <StatusDot status={card.status} />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-caption">
        <div>
          <dt className="text-text-secondary">{t('platform.integrationHealth.lastSync')}</dt>
          <dd className="font-medium text-text-primary">
            {card.lastSyncAt ? new Date(card.lastSyncAt).toLocaleString() : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-text-secondary">{t('platform.integrationHealth.errors24h')}</dt>
          <dd className="font-medium text-text-primary">{card.errorCount24h ?? 0}</dd>
        </div>
        <div>
          <dt className="text-text-secondary">{t('platform.integrationHealth.successRate')}</dt>
          <dd className="font-medium text-text-primary">
            {card.successRatePct != null ? `${card.successRatePct}%` : '—'}
          </dd>
        </div>
      </dl>

      <PermissionGate permission={PLATFORM_PERMISSIONS.INTEGRATION_MANAGE}>
        <div className="mt-4 flex gap-2">
          {status !== 'HEALTHY' && (
            <button
              type="button"
              disabled={retry.isPending}
              onClick={() => void retry.mutateAsync(card.id)}
              className="rounded-md border border-brand-blue-600 px-3 py-1.5 text-body-sm font-medium text-brand-blue-600 hover:bg-blue-50 disabled:opacity-50"
            >
              {t('platform.integrationHealth.retry')}
            </button>
          )}
          <button
            type="button"
            disabled={disable.isPending}
            onClick={() => void disable.mutateAsync(card.id)}
            className="rounded-md border border-border-default px-3 py-1.5 text-body-sm font-medium text-text-secondary hover:bg-surface-canvas disabled:opacity-50"
          >
            {t('platform.integrationHealth.disable')}
          </button>
        </div>
      </PermissionGate>
    </article>
  );
}

function IncidentRow({ incident }: { incident: IntegrationIncident }) {
  return (
    <div className="flex items-start gap-4 py-3">
      <span className="mt-0.5 flex-shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-caption font-semibold text-red-700">
        {incident.status}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-body-sm font-medium text-text-primary">{incident.name ?? incident.integrationName}</p>
        <p className="text-caption text-text-secondary">
          {incident.category}
          {incident.lastFailureAt ? ` · ${new Date(incident.lastFailureAt).toLocaleString()}` : ''}
        </p>
      </div>
    </div>
  );
}

export function IntegrationHealthPageClient({ title, description }: IntegrationHealthPageClientProps) {
  const t = useTranslations();
  const { data: healthData, isLoading: healthLoading, isError: healthError, refetch: refetchHealth } =
    useIntegrationHealth();
  const { data: incidentsData, isLoading: incLoading } = useIntegrationIncidents();

  const integrations = healthData?.data ?? [];
  const incidents = incidentsData?.data ?? [];

  const healthCounts = {
    healthy: integrations.filter((i) => normalizeStatus(i.status) === 'HEALTHY').length,
    degraded: integrations.filter((i) => normalizeStatus(i.status) === 'WARNING').length,
    down: integrations.filter((i) => normalizeStatus(i.status) === 'FAILED').length,
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[
          { label: t('platform.nav.overview'), href: ROUTES.PLATFORM.DASHBOARD },
          { label: title },
        ]}
      />

      {!healthLoading && !healthError && integrations.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-semantic-success/30 bg-surface-primary p-4 text-center">
            <p className="text-metric-lg font-bold text-semantic-success tabular-nums">{healthCounts.healthy}</p>
            <p className="mt-1 text-caption text-text-secondary">Healthy</p>
          </div>
          <div className="rounded-xl border border-semantic-warning/40 bg-surface-primary p-4 text-center">
            <p className="text-metric-lg font-bold text-semantic-warning tabular-nums">{healthCounts.degraded}</p>
            <p className="mt-1 text-caption text-text-secondary">Warning</p>
          </div>
          <div className="rounded-xl border border-semantic-danger/40 bg-surface-primary p-4 text-center">
            <p className="text-metric-lg font-bold text-semantic-danger tabular-nums">{healthCounts.down}</p>
            <p className="mt-1 text-caption text-text-secondary">Failed</p>
          </div>
        </div>
      )}

      {healthLoading && (
        <div className="flex justify-center p-12">
          <LoadingSpinner />
        </div>
      )}
      {healthError && (
        <div className="rounded-xl border border-border-default bg-surface-primary p-8 text-center">
          <p className="text-body-md text-text-secondary">{t('common.error')}</p>
          <button
            type="button"
            onClick={() => void refetchHealth()}
            className="mt-3 text-body-sm font-medium text-brand-blue-600"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {integrations.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {integrations.map((card) => (
            <IntegrationCard key={card.id} card={card} />
          ))}
        </div>
      )}

      {incidents.length > 0 && (
        <section>
          <h2 className="mb-3 text-heading-h3 font-bold text-text-primary">
            {t('platform.integrationHealth.incidents')}
          </h2>
          <div className="rounded-xl border border-border-default bg-surface-primary divide-y divide-border-default px-4">
            {incLoading ? (
              <div className="flex justify-center p-6">
                <LoadingSpinner />
              </div>
            ) : (
              incidents.map((inc) => <IncidentRow key={inc.id} incident={inc} />)
            )}
          </div>
        </section>
      )}
    </div>
  );
}
