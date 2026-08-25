'use client';

import { Suspense } from 'react';
import { MfaChallengeForm } from '../../../../modules/authentication/components/mfa-challenge-form';
import { LoadingSpinner } from '../../../../components/feedback/loading-spinner';
import { AuthGate } from '../../../../lib/auth/auth-gate';

export default function MfaVerifyPage() {
  return (
    <AuthGate guestOnly>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center">
            <LoadingSpinner />
          </div>
        }
      >
        <MfaChallengeForm />
      </Suspense>
    </AuthGate>
  );
}
