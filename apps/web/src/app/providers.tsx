'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { AbstractIntlMessages } from 'next-intl';
import { NextIntlClientProvider } from 'next-intl';
import { type ReactNode, useState } from 'react';
import { APP_CONSTANTS } from '../constants/app.constants';
import { ApiError } from '../lib/api/types';
import { Toaster } from '../components/ui/toaster';
import { AuthProvider } from '../lib/auth/auth-provider';

interface ProvidersProps {
  children: ReactNode;
  locale: string;
  messages: AbstractIntlMessages;
}

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: APP_CONSTANTS.QUERY_STALE_TIME_MS,
        gcTime: APP_CONSTANTS.QUERY_GC_TIME_MS,
        retry: (failureCount, error) => {
          if (error instanceof ApiError) {
            // Client errors and cancellations will not succeed on retry.
            if (error.code === 'CANCELLED') return false;
            if (
              error.statusCode !== undefined &&
              error.statusCode >= 400 &&
              error.statusCode < 500
            ) {
              return false;
            }
          }
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function Providers({ children, locale, messages }: ProvidersProps) {
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {children}
          <Toaster />
          {process.env['NODE_ENV'] === 'development' && (
            <ReactQueryDevtools initialIsOpen={false} />
          )}
        </AuthProvider>
      </QueryClientProvider>
    </NextIntlClientProvider>
  );
}
