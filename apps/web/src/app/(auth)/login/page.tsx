'use client';

import { Suspense } from 'react';
import { SignInForm } from '../../../modules/authentication/components/sign-in-form';
import { LoadingSpinner } from '../../../components/feedback/loading-spinner';
import { AuthGate } from '../../../lib/auth/auth-gate';

export default function LoginPage() {
  return (
    <AuthGate guestOnly>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center">
            <LoadingSpinner />
          </div>
        }
      >
        <SignInForm />
      </Suspense>
    </AuthGate>
  );
}
