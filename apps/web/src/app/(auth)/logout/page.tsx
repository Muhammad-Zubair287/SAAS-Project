'use client';

import { useEffect } from 'react';
import { useAuth } from '../../../lib/auth/auth-provider';
import { LoadingSpinner } from '../../../components/feedback/loading-spinner';

export default function LogoutPage() {
  const { logout } = useAuth();

  useEffect(() => {
    void logout();
  }, [logout]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-canvas">
      <LoadingSpinner />
    </div>
  );
}
