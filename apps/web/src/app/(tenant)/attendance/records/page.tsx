import { getTranslations } from 'next-intl/server';
import { RecordsPageClient } from './records-page-client';

export default async function AttendanceRecordsPage() {
  const t = await getTranslations();
  return (
    <RecordsPageClient
      title={t('attendance.records.title')}
      description={t('attendance.records.description')}
    />
  );
}
