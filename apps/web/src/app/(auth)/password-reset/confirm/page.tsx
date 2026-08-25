'use client';

import { Suspense } from 'react';
import { ResetPasswordForm } from '../../../../modules/authentication/components/reset-password-form';
import { LoadingSpinner } from '../../../../components/feedback/loading-spinner';
import { AuthGate } from '../../../../lib/auth/auth-gate';

export default function ResetPasswordConfirmPage() {
  return (
    <AuthGate guestOnly>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center">
            <LoadingSpinner />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </AuthGate>
  );
}
