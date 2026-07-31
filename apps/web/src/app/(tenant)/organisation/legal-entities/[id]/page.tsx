import { getTranslations } from 'next-intl/server';
import { LegalEntityDetailClient } from './legal-entity-detail-client';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LegalEntityDetailPage({ params }: Props) {
  const { id } = await params;
  const t = await getTranslations();

  return (
    <LegalEntityDetailClient
      id={id}
      labels={{
        dashboard: t('tenant.nav.dashboard'),
        organisation: t('tenant.nav.organisation'),
        legalEntities: t('organisation.legalEntities.title'),
        detail: t('organisation.legalEntities.detail.breadcrumb'),
      }}
    />
  );
}
