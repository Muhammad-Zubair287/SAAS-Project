'use client';

import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../../../components/common/page-header';
import { LoadingSpinner } from '../../../../../components/feedback/loading-spinner';
import { OrgStatusBadge } from '../../../../../modules/organisation/components/org-status-badge';
import { useLegalEntity } from '../../../../../modules/organisation/hooks/use-legal-entities';
import { ROUTES } from '../../../../../constants/routes.constants';

interface Labels {
  dashboard: string;
  organisation: string;
  legalEntities: string;
  detail: string;
}

interface Props {
  id: string;
  labels: Labels;
}

export function LegalEntityDetailClient({ id, labels }: Props) {
  const t = useTranslations();
  const { data, isLoading, error } = useLegalEntity(id);

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

  const entity = data.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={entity.name}
        breadcrumbs={[
          { label: labels.dashboard, href: ROUTES.TENANT.DASHBOARD },
          { label: labels.organisation, href: ROUTES.TENANT.ORGANISATION.ROOT },
          { label: labels.legalEntities, href: ROUTES.TENANT.ORGANISATION.LEGAL_ENTITIES },
          { label: labels.detail },
        ]}
        actions={<OrgStatusBadge status={entity.status} />}
      />

      <div className="rounded-xl border border-border-default bg-surface-primary p-6">
        <h2 className="mb-4 text-heading-h3 font-semibold text-text-primary">
          {t('organisation.legalEntities.detail.sectionDetails')}
        </h2>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: t('organisation.legalEntities.fields.name'), value: entity.name },
            { label: t('organisation.legalEntities.fields.registrationNumber'), value: entity.registrationNumber ?? '—' },
            { label: t('organisation.legalEntities.fields.country'), value: entity.countryCode },
            { label: t('organisation.legalEntities.fields.currency'), value: entity.currencyCode },
            { label: t('organisation.legalEntities.fields.timezone'), value: entity.timezone },
            { label: t('organisation.legalEntities.fields.isPrimary'), value: entity.isPrimary ? t('common.yes') : t('common.no') },
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
            { label: t('organisation.detail.id'), value: entity.id },
            { label: t('organisation.detail.created'), value: new Date(entity.createdAt).toLocaleString() },
            { label: t('organisation.detail.updated'), value: new Date(entity.updatedAt).toLocaleString() },
          ].map(({ label, value }) => (
            <div key={label}>
              <dt className="text-label-md font-medium text-text-secondary">{label}</dt>
              <dd className="mt-0.5 text-body-md text-text-primary font-mono text-body-sm">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
