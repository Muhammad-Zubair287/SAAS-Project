import { getTranslations } from 'next-intl/server';
import { PeriodLockPageClient } from './period-lock-page-client';

export default async function AttendancePeriodLockPage() {
  const t = await getTranslations();
  return (
    <PeriodLockPageClient
      title={t('attendance.periodLock.title')}
      description={t('attendance.periodLock.description')}
    />
  );
}
