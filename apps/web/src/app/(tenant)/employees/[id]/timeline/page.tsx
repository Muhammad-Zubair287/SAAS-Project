import { getTranslations } from 'next-intl/server';
import { PageHeader } from '../../../../../components/common/page-header';
import { ROUTES } from '../../../../../constants/routes.constants';
import { TimelinePageClient } from './timeline-page-client';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EmployeeTimelinePage({ params }: Props) {
  const { id } = await params;
  const t = await getTranslations();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('employees.timeline.title')}
        description="Chronological employee lifecycle and audit timeline."
        breadcrumbs={[
          { label: t('tenant.nav.dashboard'), href: ROUTES.TENANT.DASHBOARD },
          { label: t('employees.directory.title'), href: ROUTES.TENANT.EMPLOYEES.ROOT },
          { label: t('employees.timeline.title') },
        ]}
      />
      <TimelinePageClient employeeId={id} />
    </div>
  );
}
