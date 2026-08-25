'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AuthShell } from '../../../modules/authentication/components/auth-shell';
import { buttonVariants } from '../../../components/ui/button';
import { ROUTES } from '../../../constants/routes.constants';

export default function ForbiddenPage() {
  const t = useTranslations('auth');
  return (
    <AuthShell title={t('forbidden.title')} subtitle={t('forbidden.subtitle')}>
      <Link href={ROUTES.TENANT.DASHBOARD} className={buttonVariants({ fullWidth: true })}>
        {t('forbidden.home')}
      </Link>
    </AuthShell>
  );
}
