'use client';

import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../../../components/common/page-header';
import { LoadingSpinner } from '../../../../../components/feedback/loading-spinner';
import { OrgStatusBadge } from '../../../../../modules/organisation/components/org-status-badge';
import { usePosition } from '../../../../../modules/organisation/hooks/use-positions';
import { ROUTES } from '../../../../../constants/routes.constants';

interface Labels {
  dashboard: string;
  organisation: string;
  positions: string;
  detail: string;
}

interface Props {
  id: string;
  labels: Labels;
}

export function PositionDetailClient({ id, labels }: Props) {
  const t = useTranslations();
  const { data, isLoading, error } = usePosition(id);

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

  const position = data.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={position.title}
        breadcrumbs={[
          { label: labels.dashboard, href: ROUTES.TENANT.DASHBOARD },
          { label: labels.organisation, href: ROUTES.TENANT.ORGANISATION.ROOT },
          { label: labels.positions, href: ROUTES.TENANT.ORGANISATION.POSITIONS },
          { label: labels.detail },
        ]}
        actions={<OrgStatusBadge status={position.status} />}
      />

      <div className="rounded-xl border border-border-default bg-surface-primary p-6">
        <h2 className="mb-4 text-heading-h3 font-semibold text-text-primary">
          {t('organisation.positions.detail.sectionDetails')}
        </h2>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: t('organisation.positions.fields.title'), value: position.title },
            { label: t('organisation.positions.fields.code'), value: position.code },
            { label: t('organisation.positions.fields.grade'), value: position.grade ?? '—' },
            { label: t('organisation.positions.fields.isManager'), value: position.isManager ? t('common.yes') : t('common.no') },
            { label: t('organisation.positions.fields.description'), value: position.description ?? '—' },
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
            { label: t('organisation.detail.id'), value: position.id },
            { label: t('organisation.detail.created'), value: new Date(position.createdAt).toLocaleString() },
            { label: t('organisation.detail.updated'), value: new Date(position.updatedAt).toLocaleString() },
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
