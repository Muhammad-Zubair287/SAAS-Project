import { getTranslations } from 'next-intl/server';
import { CostCentreDetailClient } from './cost-centre-detail-client';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CostCentreDetailPage({ params }: Props) {
  const { id } = await params;
  const t = await getTranslations();

  return (
    <CostCentreDetailClient
      id={id}
      labels={{
        dashboard: t('tenant.nav.dashboard'),
        organisation: t('tenant.nav.organisation'),
        costCentres: t('organisation.costCentres.title'),
        detail: t('organisation.costCentres.detail.breadcrumb'),
      }}
    />
  );
}
