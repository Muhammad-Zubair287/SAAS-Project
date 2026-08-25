'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../../../components/common/page-header';
import { LoadingSpinner } from '../../../components/feedback/loading-spinner';
import { platformApi } from '../../../modules/platform/api/platform-api';
import { useDeploymentRegions } from '../../../modules/platform/hooks/use-tenants';
import { ROUTES } from '../../../constants/routes.constants';
import { PermissionGate } from '../../../lib/permissions/permission-gate';
import { PLATFORM_PERMISSIONS } from '../../../lib/permissions/constants';

const DOMAINS = [
  { key: 'general', href: ROUTES.PLATFORM.CONFIG_GENERAL, labelKey: 'platform.nav.configGeneral' },
  { key: 'security', href: ROUTES.PLATFORM.CONFIG_SECURITY, labelKey: 'platform.nav.configSecurity' },
  { key: 'retention', href: ROUTES.PLATFORM.CONFIG_RETENTION, labelKey: 'platform.nav.configRetention' },
  { key: 'regions', href: ROUTES.PLATFORM.CONFIG_REGIONS, labelKey: 'platform.nav.configRegions' },
  { key: 'notifications', href: ROUTES.PLATFORM.CONFIG_NOTIFICATIONS, labelKey: 'platform.nav.configNotifications' },
  { key: 'integrations', href: ROUTES.PLATFORM.CONFIG_INTEGRATIONS, labelKey: 'platform.nav.configIntegrations' },
  { key: 'audit', href: ROUTES.PLATFORM.CONFIG_AUDIT_LOGGING, labelKey: 'platform.nav.configAuditLogging' },
] as const;

function domainFromPath(pathname: string): string {
  const match = DOMAINS.find((d) => pathname.endsWith(`/${d.key}`) || (d.key === 'audit' && pathname.endsWith('/audit-logging')));
  if (pathname.includes('/regions')) return 'regions';
  if (pathname.includes('/audit-logging')) return 'audit';
  return match?.key ?? 'general';
}

export function ConfigPageClient() {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const active = useMemo(() => domainFromPath(pathname), [pathname]);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [rowVersion, setRowVersion] = useState<string | undefined>();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['platform', 'config', active === 'regions' ? 'general' : active],
    queryFn: () => platformApi.config.get(active === 'regions' ? 'general' : active),
    enabled: active !== 'regions',
  });

  const { data: regions, isLoading: regionsLoading } = useDeploymentRegions();

  useEffect(() => {
    if (data?.data) {
      setDraft(data.data.value ?? data.data.values ?? {});
      setRowVersion(data.data.rowVersion);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      platformApi.config.put(active === 'regions' ? 'general' : active, draft, rowVersion),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['platform', 'config'] });
      void refetch();
    },
  });

  // Redirect bare /platform/config → general
  useEffect(() => {
    if (pathname === ROUTES.PLATFORM.CONFIG) {
      router.replace(ROUTES.PLATFORM.CONFIG_GENERAL);
    }
  }, [pathname, router]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('platform.config.title')}
        description={t('platform.config.description')}
        breadcrumbs={[
          { label: t('platform.nav.overview'), href: ROUTES.PLATFORM.DASHBOARD },
          { label: t('platform.nav.config') },
        ]}
      />

      <div className="flex flex-wrap gap-2">
        {DOMAINS.map((d) => (
          <button
            key={d.key}
            type="button"
            onClick={() => router.push(d.href)}
            className={`rounded-md px-3 py-1.5 text-body-sm font-medium ${
              active === d.key || (d.key === 'audit' && active === 'audit')
                ? 'bg-brand-blue-600 text-white'
                : 'bg-surface-primary text-text-secondary border border-border-default'
            }`}
          >
            {t(d.labelKey as Parameters<typeof t>[0])}
          </button>
        ))}
      </div>

      {active === 'regions' ? (
        <section className="rounded-xl border border-border-default bg-surface-primary p-6">
          <h2 className="text-title-md font-semibold text-text-primary">{t('platform.config.regions')}</h2>
          {regionsLoading && <LoadingSpinner />}
          <ul className="mt-4 space-y-2">
            {(regions?.data ?? []).map((r) => (
              <li key={r.id} className="flex justify-between text-body-sm">
                <span className="font-medium">{r.name}</span>
                <span className="text-text-secondary">
                  {r.code} · {r.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="rounded-xl border border-border-default bg-surface-primary p-6">
          {isLoading && <LoadingSpinner />}
          {isError && (
            <button type="button" onClick={() => void refetch()} className="text-brand-blue-600">
              {t('common.retry')}
            </button>
          )}
          {!isLoading && !isError && (
            <>
              <div className="space-y-3">
                {Object.entries(draft).map(([key, value]) => (
                  <label key={key} className="block">
                    <span className="text-caption font-medium text-text-secondary">{key}</span>
                    {typeof value === 'boolean' ? (
                      <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.checked }))}
                        className="ms-2"
                      />
                    ) : (
                      <input
                        type="text"
                        value={value == null ? '' : String(value)}
                        onChange={(e) => {
                          const raw = e.target.value;
                          let next: unknown = raw;
                          if (typeof value === 'number') next = Number(raw);
                          setDraft((d) => ({ ...d, [key]: next }));
                        }}
                        className="mt-1 w-full rounded-md border border-border-default px-3 py-1.5 text-body-sm"
                      />
                    )}
                  </label>
                ))}
              </div>
              <PermissionGate permission={PLATFORM_PERMISSIONS.CONFIG_MANAGE}>
                <button
                  type="button"
                  disabled={save.isPending}
                  onClick={() => void save.mutateAsync()}
                  className="mt-4 rounded-md bg-brand-blue-600 px-4 py-2 text-body-sm font-medium text-white disabled:opacity-50"
                >
                  {t('common.save')}
                </button>
              </PermissionGate>
            </>
          )}
        </section>
      )}
    </div>
  );
}
