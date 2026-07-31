import { getTranslations } from 'next-intl/server';
import { PageHeader } from '../../../../../components/common/page-header';
import { CreateBranchForm } from '../../../../../modules/organisation/components/create-branch-form';
import { ROUTES } from '../../../../../constants/routes.constants';

export default async function NewBranchPage() {
  const t = await getTranslations();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('organisation.branches.create.title')}
        description={t('organisation.branches.create.description')}
        breadcrumbs={[
          { label: t('tenant.nav.dashboard'), href: ROUTES.TENANT.DASHBOARD },
          { label: t('tenant.nav.organisation'), href: ROUTES.TENANT.ORGANISATION.ROOT },
          { label: t('organisation.branches.title'), href: ROUTES.TENANT.ORGANISATION.BRANCHES },
          { label: t('organisation.branches.create.breadcrumb') },
        ]}
      />
      <CreateBranchForm />
    </div>
  );
}
