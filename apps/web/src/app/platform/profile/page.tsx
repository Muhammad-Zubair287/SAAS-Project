'use client';

import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../components/common/page-header';
import { ROUTES } from '../../../constants/routes.constants';
import { useAuth } from '../../../lib/auth/auth-provider';

export default function PlatformProfilePage() {
  const t = useTranslations();
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('platform.chrome.userMenu.profile')}
        breadcrumbs={[
          { label: t('platform.nav.overview'), href: ROUTES.PLATFORM.DASHBOARD },
          { label: t('platform.chrome.userMenu.profile') },
        ]}
      />
      <div className="rounded-xl border border-border-default bg-surface-primary p-6 space-y-2 text-body-sm">
        <p>
          <span className="text-text-secondary">Name: </span>
          {user?.displayName ?? '—'}
        </p>
        <p>
          <span className="text-text-secondary">Email: </span>
          {user?.email ?? '—'}
        </p>
        <p>
          <span className="text-text-secondary">Role: </span>
          {user?.platformRole ?? user?.roles?.[0] ?? '—'}
        </p>
      </div>
    </div>
  );
}
