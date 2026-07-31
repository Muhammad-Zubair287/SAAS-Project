import { Suspense } from 'react';
import { PoliciesPageClient } from './policies-page-client';

export default function PoliciesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-500">Loading...</div>}>
      <PoliciesPageClient />
    </Suspense>
  );
}
