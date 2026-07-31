import { getTranslations } from 'next-intl/server';
import { CostCentresPageClient } from './cost-centres-page-client';

export default async function CostCentresPage() {
  const t = await getTranslations();
  return (
    <CostCentresPageClient
      title={t('organisation.costCentres.title')}
      description={t('organisation.costCentres.description')}
    />
  );
}
