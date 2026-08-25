'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AuthShell } from '../../../modules/authentication/components/auth-shell';
import { buttonVariants } from '../../../components/ui/button';
import { ROUTES } from '../../../constants/routes.constants';

export default function UnauthorizedPage() {
  const t = useTranslations('auth');
  return (
    <AuthShell title={t('unauthorized.title')} subtitle={t('unauthorized.subtitle')}>
      <Link href={ROUTES.AUTH.LOGIN} className={buttonVariants({ fullWidth: true })}>
        {t('backToSignIn')}
      </Link>
    </AuthShell>
  );
}
