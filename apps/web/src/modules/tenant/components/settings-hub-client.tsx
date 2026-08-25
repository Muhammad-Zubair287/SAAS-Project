'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../components/common/page-header';
import { LoadingSpinner } from '../../../components/feedback/loading-spinner';
import { EmptyState } from '../../../components/feedback/empty-state';
import { ROUTES } from '../../../constants/routes.constants';
import { useSetupStatus } from '../../../modules/tenant/hooks/use-tenant-admin';

const HREF_BY_KEY: Record<string, string | null> = {
  company: ROUTES.TENANT.SETTINGS_COMPANY,
  organisation: ROUTES.TENANT.ORGANISATION.ROOT,
  users_roles: ROUTES.TENANT.SETTINGS_USERS,
  attendance: ROUTES.TENANT.ATTENDANCE.POLICIES,
  regional: ROUTES.TENANT.SETTINGS_REGIONAL,
  branding: ROUTES.TENANT.SETTINGS_BRANDING,
  modules: ROUTES.TENANT.SETTINGS_MODULES,
  security: ROUTES.TENANT.SETTINGS_SECURITY,
  subscription: ROUTES.TENANT.SETTINGS_SUBSCRIPTION,
  leave: null,
  payroll: null,
  workflows: null,
  notifications: null,
  integrations: null,
};

export function SettingsHubClient() {
  const t = useTranslations();
  const { data, isLoading, isError, refetch } = useSetupStatus();

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError || !data?.data) {
    return (
      <EmptyState
        title={t('common.error')}
        description={t('common.retry')}
        action={
          <button type="button" className="text-brand-blue-600" onClick={() => void refetch()}>
            {t('common.retry')}
          </button>
        }
      />
    );
  }

  const setup = data.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('tenant.settings.title')}
        description={t('tenant.settings.description')}
      />
      <p className="text-body-md text-text-secondary">
        {t('tenant.settings.hub.percent', { percent: setup.percentComplete })}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {setup.categories.map((cat) => {
          const href = cat.href ?? HREF_BY_KEY[cat.key] ?? null;
          const label = t(`tenant.settings.categories.${cat.key}` as Parameters<typeof t>[0]);
          const statusLabel = cat.comingSoon
            ? t('tenant.settings.hub.comingSoon')
            : cat.complete
              ? t('tenant.settings.hub.complete')
              : t('tenant.settings.hub.incomplete');
          const card = (
            <div
              key={cat.key}
              className="rounded-lg border border-border-default bg-surface-card p-4 shadow-elevation-1"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-title-sm font-semibold text-text-primary">{label}</h2>
                <span
                  className={`text-caption font-medium ${
                    cat.comingSoon
                      ? 'text-text-tertiary'
                      : cat.complete
                        ? 'text-status-success'
                        : 'text-status-warning'
                  }`}
                >
                  {statusLabel}
                </span>
              </div>
            </div>
          );
          if (!href || cat.comingSoon) return card;
          return (
            <Link
              key={cat.key}
              href={href}
              className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-600"
            >
              {card}
            </Link>
          );
        })}
        <Link
          href={ROUTES.TENANT.SETTINGS_ROLES}
          className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-600"
        >
          <div className="rounded-lg border border-border-default bg-surface-card p-4 shadow-elevation-1">
            <h2 className="text-title-sm font-semibold text-text-primary">
              {t('tenant.settings.categories.roles')}
            </h2>
          </div>
        </Link>
        <Link
          href={ROUTES.TENANT.SETTINGS_SESSIONS}
          className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-600"
        >
          <div className="rounded-lg border border-border-default bg-surface-card p-4 shadow-elevation-1">
            <h2 className="text-title-sm font-semibold text-text-primary">
              {t('tenant.settings.categories.sessions')}
            </h2>
          </div>
        </Link>
      </div>
    </div>
  );
}
