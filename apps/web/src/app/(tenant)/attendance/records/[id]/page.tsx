import { getTranslations } from 'next-intl/server';
import { RecordDetailClient } from './record-detail-client';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RecordDetailPage({ params }: PageProps) {
  const { id } = await params;
  const t = await getTranslations();
  return (
    <RecordDetailClient
      id={id}
      breadcrumb={t('attendance.detail.breadcrumb')}
    />
  );
}
