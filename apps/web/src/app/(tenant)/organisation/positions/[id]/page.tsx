import { getTranslations } from 'next-intl/server';
import { PositionDetailClient } from './position-detail-client';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PositionDetailPage({ params }: Props) {
  const { id } = await params;
  const t = await getTranslations();

  return (
    <PositionDetailClient
      id={id}
      labels={{
        dashboard: t('tenant.nav.dashboard'),
        organisation: t('tenant.nav.organisation'),
        positions: t('organisation.positions.title'),
        detail: t('organisation.positions.detail.breadcrumb'),
      }}
    />
  );
}
