'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../../components/common/page-header';
import { LoadingSpinner } from '../../../../components/feedback/loading-spinner';
import { ROUTES } from '../../../../constants/routes.constants';
import { useTenantModules } from '../../../../modules/tenant/hooks/use-tenant-admin';

export default function ModulesSettingsPage() {
  const t = useTranslations();
  const { data, isLoading } = useTenantModules();

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const catalogue = data?.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('tenant.settings.modules.title')}
        description={t('tenant.settings.modules.description')}
      />
      <p className="text-body-sm text-text-secondary">
        {catalogue?.planName ?? catalogue?.planCode ?? '—'}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(catalogue?.modules ?? []).map((m) => (
          <div
            key={m.key}
            className="rounded-lg border border-border-default bg-surface-card p-4 shadow-elevation-1"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-title-sm font-semibold">{m.label}</h2>
              <span className="text-caption">
                {m.status === 'active'
                  ? t('tenant.settings.modules.active')
                  : m.status === 'inactive'
                    ? t('tenant.settings.modules.inactive')
                    : t('tenant.settings.modules.unavailable')}
              </span>
            </div>
            <p className="mt-2 text-body-sm text-text-secondary">{m.description}</p>
            <div className="mt-4 flex gap-2">
              {m.status === 'active' && m.configurePath ? (
                <Link
                  href={m.configurePath}
                  className="rounded-md bg-brand-blue-600 px-3 py-1.5 text-body-sm text-white"
                >
                  {t('tenant.settings.modules.configure')}
                </Link>
              ) : null}
              {m.status !== 'active' ? (
                <Link
                  href={ROUTES.TENANT.SETTINGS_SUBSCRIPTION}
                  className="rounded-md border border-border-default px-3 py-1.5 text-body-sm"
                >
                  {t('tenant.settings.modules.requestUpgrade')}
                </Link>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
