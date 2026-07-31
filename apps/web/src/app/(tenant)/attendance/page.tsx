import { getTranslations } from 'next-intl/server';
import { AttendanceDashboardClient } from './attendance-dashboard-client';

export default async function AttendancePage() {
  const t = await getTranslations();
  return (
    <AttendanceDashboardClient
      title={t('attendance.dashboard.title')}
      description={t('attendance.dashboard.description')}
    />
  );
}
