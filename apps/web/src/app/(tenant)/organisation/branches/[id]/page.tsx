import { getTranslations } from 'next-intl/server';
import { BranchDetailClient } from './branch-detail-client';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BranchDetailPage({ params }: Props) {
  const { id } = await params;
  const t = await getTranslations();

  return (
    <BranchDetailClient
      id={id}
      labels={{
        dashboard: t('tenant.nav.dashboard'),
        organisation: t('tenant.nav.organisation'),
        branches: t('organisation.branches.title'),
        detail: t('organisation.branches.detail.breadcrumb'),
      }}
    />
  );
}
