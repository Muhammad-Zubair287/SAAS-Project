'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AuthShell } from '../../../modules/authentication/components/auth-shell';
import { buttonVariants } from '../../../components/ui/button';
import { buildLoginHref, sanitizeReturnTo } from '../../../lib/auth/safe-return-to';
import { LoadingSpinner } from '../../../components/feedback/loading-spinner';

function SessionExpiredContent() {
  const t = useTranslations('auth');
  const searchParams = useSearchParams();
  const returnTo = sanitizeReturnTo(searchParams.get('returnTo'), '');

  return (
    <AuthShell title={t('sessionExpired.title')} subtitle={t('sessionExpired.subtitle')}>
      <div className="space-y-4">
        <p className="text-body-md text-text-secondary">{t('sessionExpired.body')}</p>
        <Link
          href={buildLoginHref(returnTo || undefined)}
          className={buttonVariants({ fullWidth: true })}
        >
          {t('sessionExpired.signInAgain')}
        </Link>
      </div>
    </AuthShell>
  );
}

export default function SessionExpiredPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <SessionExpiredContent />
    </Suspense>
  );
}
