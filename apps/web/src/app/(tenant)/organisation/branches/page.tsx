import { getTranslations } from 'next-intl/server';
import { BranchesPageClient } from './branches-page-client';

export default async function BranchesPage() {
  const t = await getTranslations();
  return (
    <BranchesPageClient
      title={t('organisation.branches.title')}
      description={t('organisation.branches.description')}
    />
  );
}
