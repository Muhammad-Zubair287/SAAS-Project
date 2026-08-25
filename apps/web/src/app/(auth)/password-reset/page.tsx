'use client';

import { ForgotPasswordForm } from '../../../modules/authentication/components/forgot-password-form';
import { AuthGate } from '../../../lib/auth/auth-gate';

export default function ForgotPasswordPage() {
  return (
    <AuthGate guestOnly>
      <ForgotPasswordForm />
    </AuthGate>
  );
}
