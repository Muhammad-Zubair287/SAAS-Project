'use client';

import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../../../components/common/page-header';
import { LoadingSpinner } from '../../../../../components/feedback/loading-spinner';
import { OrgStatusBadge } from '../../../../../modules/organisation/components/org-status-badge';
import { useBranch } from '../../../../../modules/organisation/hooks/use-branches';
import { ROUTES } from '../../../../../constants/routes.constants';

interface Labels {
  dashboard: string;
  organisation: string;
  branches: string;
  detail: string;
}

interface Props {
  id: string;
  labels: Labels;
}

export function BranchDetailClient({ id, labels }: Props) {
  const t = useTranslations();
  const { data, isLoading, error } = useBranch(id);

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-xl border border-border-default bg-surface-primary">
        <p className="text-body-md text-text-secondary">{t('errors.notFound')}</p>
      </div>
    );
  }

  const branch = data.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={branch.name}
        breadcrumbs={[
          { label: labels.dashboard, href: ROUTES.TENANT.DASHBOARD },
          { label: labels.organisation, href: ROUTES.TENANT.ORGANISATION.ROOT },
          { label: labels.branches, href: ROUTES.TENANT.ORGANISATION.BRANCHES },
          { label: labels.detail },
        ]}
        actions={<OrgStatusBadge status={branch.status} />}
      />

      <div className="rounded-xl border border-border-default bg-surface-primary p-6">
        <h2 className="mb-4 text-heading-h3 font-semibold text-text-primary">
          {t('organisation.branches.detail.sectionDetails')}
        </h2>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: t('organisation.branches.fields.name'), value: branch.name },
            { label: t('organisation.branches.fields.code'), value: branch.code },
            { label: t('organisation.branches.fields.country'), value: branch.countryCode },
            { label: t('organisation.branches.fields.timezone'), value: branch.timezone },
            { label: t('organisation.branches.fields.city'), value: branch.city ?? '—' },
            { label: t('organisation.branches.fields.isHeadOffice'), value: branch.isHeadOffice ? t('common.yes') : t('common.no') },
          ].map(({ label, value }) => (
            <div key={label}>
              <dt className="text-label-md font-medium text-text-secondary">{label}</dt>
              <dd className="mt-0.5 text-body-md text-text-primary">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="rounded-xl border border-border-default bg-surface-primary p-6">
        <h2 className="mb-4 text-heading-h3 font-semibold text-text-primary">
          {t('organisation.detail.sectionMeta')}
        </h2>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          {[
            { label: t('organisation.detail.id'), value: branch.id },
            { label: t('organisation.detail.created'), value: new Date(branch.createdAt).toLocaleString() },
            { label: t('organisation.detail.updated'), value: new Date(branch.updatedAt).toLocaleString() },
          ].map(({ label, value }) => (
            <div key={label}>
              <dt className="text-label-md font-medium text-text-secondary">{label}</dt>
              <dd className="mt-0.5 font-mono text-body-sm text-text-primary">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
