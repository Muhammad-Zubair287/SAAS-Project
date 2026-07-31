import { getTranslations } from 'next-intl/server';
import { PositionsPageClient } from './positions-page-client';

export default async function PositionsPage() {
  const t = await getTranslations();
  return (
    <PositionsPageClient
      title={t('organisation.positions.title')}
      description={t('organisation.positions.description')}
    />
  );
}
