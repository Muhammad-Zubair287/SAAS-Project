'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../components/common/page-header';
import { StatCard } from '../../../components/common/stat-card';
import { LoadingSpinner } from '../../../components/feedback/loading-spinner';
import { PermissionGate } from '../../../lib/permissions/permission-gate';
import { useAuditEvents, useAuditSummary } from '../../../modules/platform/hooks/use-tenants';
import { usePagination } from '../../../hooks/use-pagination';
import { ROUTES } from '../../../constants/routes.constants';
import { PLATFORM_PERMISSIONS } from '../../../lib/permissions/constants';
import { platformApi } from '../../../modules/platform/api/platform-api';
import type { AuditEvent } from '../../../modules/platform/types/platform.types';

interface AuditPageClientProps {
  title: string;
  description: string;
  initialTenantId?: string;
}

const SEVERITY_CLASSES: Record<string, string> = {
  INFO: 'bg-blue-50 text-blue-700',
  LOW: 'bg-green-50 text-green-700',
  MEDIUM: 'bg-amber-50 text-amber-700',
  HIGH: 'bg-orange-50 text-orange-700',
  CRITICAL: 'bg-red-50 text-red-700',
};

function SeverityBadge({ severity }: { severity: string }) {
  const cls = SEVERITY_CLASSES[severity.toUpperCase()] ?? 'bg-surface-canvas text-text-secondary';
  return <span className={`rounded-full px-2.5 py-0.5 text-caption font-semibold ${cls}`}>{severity}</span>;
}

function AuditDetailDrawer({ event, onClose }: { event: AuditEvent | null; onClose: () => void }) {
  const t = useTranslations();
  if (!event) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <aside className="relative z-50 flex h-full w-full max-w-md flex-col overflow-y-auto bg-surface-primary shadow-elevation-3">
        <div className="flex items-center justify-between border-b border-border-default px-6 py-4">
          <h2 className="text-title-md font-semibold text-text-primary">{t('platform.audit.detail.title')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:bg-surface-canvas"
            aria-label={t('common.cancel')}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 space-y-4 p-6">
          <dl className="space-y-3">
            {([
              ['platform.audit.detail.id', event.id],
              ['platform.audit.detail.action', event.action],
              ['platform.audit.detail.module', event.module],
              ['platform.audit.detail.resource', `${event.resourceType}${event.resourceId ? ` (${event.resourceId})` : ''}`],
              ['platform.audit.detail.actor', event.actorEmail ?? event.actorId],
              ['platform.audit.detail.actorType', event.actorType],
              ['platform.audit.detail.tenant', event.tenantDisplayName ?? event.tenantId ?? '—'],
              ['platform.audit.detail.severity', event.severity],
              ['platform.audit.columns.time', new Date(event.occurredAt).toLocaleString()],
              ['platform.audit.detail.correlationId', event.correlationId],
            ] as const).map(([key, value]) => (
              <div key={key} className="flex gap-3">
                <dt className="w-32 flex-shrink-0 text-label-md font-medium text-text-secondary">{t(key as Parameters<typeof t>[0])}</dt>
                <dd className="flex-1 text-body-sm text-text-primary break-all">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </aside>
    </div>
  );
}

export function AuditPageClient({ title, description, initialTenantId }: AuditPageClientProps) {
  const t = useTranslations();
  const { page, pageSize, goToPage: setPage } = usePagination();
  const [moduleFilter, setModuleFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [exporting, setExporting] = useState(false);

  const { data, isLoading, isError, refetch } = useAuditEvents({
    page,
    pageSize,
    module: moduleFilter || undefined,
    severity: severityFilter || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    tenantId: initialTenantId || undefined,
  });

  const { data: summaryData } = useAuditSummary();
  const summary = summaryData?.data;

  const totalPages = data?.meta.totalPages ?? 1;

  const handleExport = async () => {
    setExporting(true);
    try {
      await platformApi.audit.requestExport({
        filters: {
          module: moduleFilter || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          tenantId: initialTenantId || undefined,
        },
        reason: 'Platform audit export',
      });
    } catch {
      // silently fail — toast or alert can be added later
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => {
    setModuleFilter('');
    setSeverityFilter('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const hasActiveFilters = moduleFilter || severityFilter || fromDate || toDate;

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
          <PermissionGate permission={PLATFORM_PERMISSIONS.AUDIT_EXPORT}>
            <button
              type="button"
              disabled={exporting}
              onClick={() => void handleExport()}
              className="flex items-center gap-2 rounded-md border border-border-default px-4 py-2 text-body-md font-medium text-text-primary hover:bg-surface-canvas disabled:opacity-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {exporting ? t('common.loading') : t('common.export')}
            </button>
          </PermissionGate>
        }
      />

      {/* Summary KPI row */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Object.entries(summary).slice(0, 4).map(([key, count]) => (
            <StatCard key={key} title={key} value={count as number} variant="default" />
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border-default bg-surface-primary p-4">
        <div>
          <label className="mb-1 block text-caption font-medium text-text-secondary">{t('platform.audit.filters.module')}</label>
          <select
            value={moduleFilter}
            onChange={(e) => { setModuleFilter(e.target.value); setPage(1); }}
            className="rounded-md border border-border-default bg-surface-canvas px-3 py-2 text-body-md focus:outline-none focus:ring-2 focus:ring-brand-blue-600"
          >
            <option value="">{t('platform.audit.filters.allModules')}</option>
            {['platform', 'tenants', 'support', 'billing', 'config', 'auth'].map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-caption font-medium text-text-secondary">{t('platform.audit.filters.severity')}</label>
          <select
            value={severityFilter}
            onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
            className="rounded-md border border-border-default bg-surface-canvas px-3 py-2 text-body-md focus:outline-none focus:ring-2 focus:ring-brand-blue-600"
          >
            <option value="">{t('platform.audit.filters.allSeverities')}</option>
            {['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-caption font-medium text-text-secondary">{t('platform.audit.filters.from')}</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
            className="rounded-md border border-border-default bg-surface-canvas px-3 py-2 text-body-md focus:outline-none focus:ring-2 focus:ring-brand-blue-600"
          />
        </div>
        <div>
          <label className="mb-1 block text-caption font-medium text-text-secondary">{t('platform.audit.filters.to')}</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setPage(1); }}
            className="rounded-md border border-border-default bg-surface-canvas px-3 py-2 text-body-md focus:outline-none focus:ring-2 focus:ring-brand-blue-600"
          />
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-md px-3 py-2 text-body-sm font-medium text-text-secondary hover:text-text-primary"
          >
            {t('platform.audit.filters.clear')}
          </button>
        )}
      </div>

      {isLoading && <div className="flex justify-center p-12"><LoadingSpinner /></div>}
      {isError && (
        <div className="rounded-xl border border-border-default bg-surface-primary p-8 text-center">
          <p className="text-body-md text-text-secondary">{t('common.error')}</p>
          <button type="button" onClick={() => void refetch()} className="mt-3 text-body-sm font-medium text-brand-blue-600">{t('common.retry')}</button>
        </div>
      )}

      {!isLoading && !isError && (data?.data ?? []).length === 0 && (
        <div className="rounded-xl border border-border-default bg-surface-primary p-8 text-center text-body-md text-text-secondary">{t('platform.audit.empty')}</div>
      )}

      {!isLoading && !isError && (data?.data ?? []).length > 0 && (
        <>
          <div className="text-body-sm text-text-secondary">
            {t('platform.audit.totalResults', { total: (data?.meta.total ?? 0).toLocaleString() })}
          </div>
          <div className="overflow-x-auto rounded-xl border border-border-default bg-surface-primary">
            <table className="min-w-full text-body-sm">
              <caption className="sr-only">{title}</caption>
              <thead className="border-b border-border-default bg-surface-canvas">
                <tr>
                  <th scope="col" className="px-4 py-3 text-start font-semibold text-text-secondary">{t('platform.audit.columns.time')}</th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold text-text-secondary">{t('platform.audit.columns.action')}</th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold text-text-secondary">{t('platform.audit.columns.tenant')}</th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold text-text-secondary">{t('platform.audit.columns.actor')}</th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold text-text-secondary">{t('platform.audit.columns.severity')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {(data?.data ?? []).map((e) => (
                  <tr
                    key={e.id}
                    className="cursor-pointer transition-colors hover:bg-surface-canvas"
                    onClick={() => setSelectedEvent(e)}
                    tabIndex={0}
                    onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') setSelectedEvent(e); }}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-text-secondary">{new Date(e.occurredAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-text-primary">{e.action}</span>
                      <span className="block text-caption text-text-secondary">{e.module} · {e.resourceType}</span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{e.tenantDisplayName ?? '—'}</td>
                    <td className="px-4 py-3 text-text-secondary">{e.actorEmail ?? e.actorId.slice(0, 8)}</td>
                    <td className="px-4 py-3"><SeverityBadge severity={e.severity} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!isError && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-md border border-border-default px-3 py-2 text-body-sm disabled:opacity-40">←</button>
          <span className="text-body-sm text-text-secondary">{page} / {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded-md border border-border-default px-3 py-2 text-body-sm disabled:opacity-40">→</button>
        </div>
      )}

      {selectedEvent && (
        <AuditDetailDrawer event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
}
