import { getTranslations } from 'next-intl/server';
import { LegalEntitiesPageClient } from './legal-entities-page-client';

export default async function LegalEntitiesPage() {
  const t = await getTranslations();
  return (
    <LegalEntitiesPageClient
      title={t('organisation.legalEntities.title')}
      description={t('organisation.legalEntities.description')}
    />
  );
}
