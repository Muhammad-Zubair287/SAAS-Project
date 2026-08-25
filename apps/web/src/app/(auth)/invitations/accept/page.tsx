'use client';

import { Suspense } from 'react';
import { InvitationAcceptForm } from '../../../../modules/authentication/components/invitation-accept-form';
import { LoadingSpinner } from '../../../../components/feedback/loading-spinner';
import { AuthGate } from '../../../../lib/auth/auth-gate';

export default function InvitationAcceptPage() {
  return (
    <AuthGate guestOnly>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center">
            <LoadingSpinner />
          </div>
        }
      >
        <InvitationAcceptForm />
      </Suspense>
    </AuthGate>
  );
}
