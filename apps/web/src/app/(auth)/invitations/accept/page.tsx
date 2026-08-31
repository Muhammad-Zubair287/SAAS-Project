'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { LoadingSpinner } from '../../../../components/feedback/loading-spinner';
import { useAuth } from '../../../../lib/auth/auth-provider';

const InvitationAcceptForm = dynamic(
  () =>
    import('../../../../modules/authentication/components/invitation-accept-form').then(
      (module) => ({ default: module.InvitationAcceptForm }),
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    ),
  },
);

function InvitationAcceptContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  if (!token) {
    return <InvitationAcceptForm invitationToken="" />;
  }

  return <InvitationAcceptForm invitationToken={token} />;
}

/**
 * Clears a pre-existing session once on entry so platform users can accept a
 * fresh invitation. Does not re-run after invitation acceptance establishes a
 * new tenant session.
 */
export default function InvitationAcceptPage() {
  const t = useTranslations('auth.invite');
  const { status, user, logout } = useAuth();
  const [ready, setReady] = useState(false);
  const entryHandledRef = useRef(false);

  useEffect(() => {
    if (status === 'loading' || entryHandledRef.current) return;

    entryHandledRef.current = true;

    if (status === 'authenticated' && user) {
      void logout({ redirect: false }).finally(() => setReady(true));
      return;
    }

    setReady(true);
  }, [status, user, logout]);

  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-surface-canvas px-4">
        <LoadingSpinner />
        {status === 'authenticated' ? (
          <p className="text-body-sm text-text-secondary">{t('preparing')}</p>
        ) : null}
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <InvitationAcceptContent />
    </Suspense>
  );
}
