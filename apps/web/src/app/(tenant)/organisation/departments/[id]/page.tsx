import { getTranslations } from 'next-intl/server';
import { DepartmentDetailClient } from './department-detail-client';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DepartmentDetailPage({ params }: Props) {
  const { id } = await params;
  const t = await getTranslations();

  return (
    <DepartmentDetailClient
      id={id}
      labels={{
        dashboard: t('tenant.nav.dashboard'),
        organisation: t('tenant.nav.organisation'),
        departments: t('organisation.departments.title'),
        detail: t('organisation.departments.detail.breadcrumb'),
      }}
    />
  );
}
