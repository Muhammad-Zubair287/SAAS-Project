'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth/auth-provider';
import { ROUTES } from '../constants/routes.constants';
import { LoadingSpinner } from '../components/feedback/loading-spinner';

/**
 * Root entry: route by authentication state and scope.
 */
export default function RootPage() {
  const { status, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (status !== 'authenticated' || !user) {
      router.replace(ROUTES.AUTH.LOGIN);
      return;
    }
    router.replace(
      user.scope === 'platform'
        ? ROUTES.PLATFORM.DASHBOARD
        : ROUTES.TENANT.DASHBOARD,
    );
  }, [status, user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-canvas">
      <LoadingSpinner />
    </div>
  );
}
