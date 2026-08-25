import type { ReactNode } from 'react';

/** Auth route group chrome — per-page gates handle guest vs authenticated rules. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
