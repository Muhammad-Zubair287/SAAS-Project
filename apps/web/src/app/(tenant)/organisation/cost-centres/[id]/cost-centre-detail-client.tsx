'use client';

import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../../../components/common/page-header';
import { LoadingSpinner } from '../../../../../components/feedback/loading-spinner';
import { OrgStatusBadge } from '../../../../../modules/organisation/components/org-status-badge';
import { useCostCentre } from '../../../../../modules/organisation/hooks/use-cost-centres';
import { ROUTES } from '../../../../../constants/routes.constants';

interface Labels {
  dashboard: string;
  organisation: string;
  costCentres: string;
  detail: string;
}

interface Props {
  id: string;
  labels: Labels;
}

export function CostCentreDetailClient({ id, labels }: Props) {
  const t = useTranslations();
  const { data, isLoading, error } = useCostCentre(id);

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

  const cc = data.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={cc.name}
        breadcrumbs={[
          { label: labels.dashboard, href: ROUTES.TENANT.DASHBOARD },
          { label: labels.organisation, href: ROUTES.TENANT.ORGANISATION.ROOT },
          { label: labels.costCentres, href: ROUTES.TENANT.ORGANISATION.COST_CENTRES },
          { label: labels.detail },
        ]}
        actions={<OrgStatusBadge status={cc.status} />}
      />

      <div className="rounded-xl border border-border-default bg-surface-primary p-6">
        <h2 className="mb-4 text-heading-h3 font-semibold text-text-primary">
          {t('organisation.costCentres.detail.sectionDetails')}
        </h2>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: t('organisation.costCentres.fields.name'), value: cc.name },
            { label: t('organisation.costCentres.fields.code'), value: cc.code },
            { label: t('organisation.costCentres.fields.description'), value: cc.description ?? '—' },
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
            { label: t('organisation.detail.id'), value: cc.id },
            { label: t('organisation.detail.created'), value: new Date(cc.createdAt).toLocaleString() },
            { label: t('organisation.detail.updated'), value: new Date(cc.updatedAt).toLocaleString() },
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
