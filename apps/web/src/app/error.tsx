'use client';

import { useEffect } from 'react';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    if (process.env['NODE_ENV'] !== 'production') {
      console.error('[GlobalError]', error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-surface-canvas">
        <div className="p-8 text-center">
          <h2 className="text-h2 text-brand-navy-950">Something went wrong</h2>
          <p className="mt-2 text-body-md text-gray-500">
            An unexpected error occurred. Please try again.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 rounded-md bg-brand-blue-600 px-4 py-2 text-body-md text-white hover:bg-brand-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue-600"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
