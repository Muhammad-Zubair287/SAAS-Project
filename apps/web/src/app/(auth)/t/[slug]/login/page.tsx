'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { SignInForm } from '../../../../../modules/authentication/components/sign-in-form';
import { LoadingSpinner } from '../../../../../components/feedback/loading-spinner';
import { AuthGate } from '../../../../../lib/auth/auth-gate';
import { AuthShell } from '../../../../../modules/authentication/components/auth-shell';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function TenantLoginInner() {
  const params = useParams<{ slug: string }>();
  const t = useTranslations('auth');
  const raw = typeof params.slug === 'string' ? params.slug : '';
  const slug = raw.toLowerCase();

  if (!SLUG_RE.test(slug)) {
    return (
      <AuthShell
        title={t('signIn.title')}
        subtitle={t('signIn.subtitle')}
        surface="signIn"
      >
        <p role="alert" className="text-body-sm text-semantic-danger">
          {t('errors.tenantSuspended')}
        </p>
      </AuthShell>
    );
  }

  return <SignInForm tenantSlug={slug} />;
}

export default function TenantLoginPage() {
  return (
    <AuthGate guestOnly>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center">
            <LoadingSpinner />
          </div>
        }
      >
        <TenantLoginInner />
      </Suspense>
    </AuthGate>
  );
}
