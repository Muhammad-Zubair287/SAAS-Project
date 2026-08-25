'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '../../modules/authentication/api/auth-api';
import type {
  AuthStatus,
  LoginPayload,
  SessionUser,
} from '../../modules/authentication/types/auth.types';
import { refreshAccessToken, setSessionExpiredHandler } from '../api/client';
import { tokenStore } from './token-store';
import { ROUTES } from '../../constants/routes.constants';

interface AuthContextValue {
  status: AuthStatus;
  user: SessionUser | null;
  accessToken: string | null;
  login: (payload: LoginPayload) => Promise<
    | { mfaRequired: true; challengeToken: string }
    | { mfaRequired: false; user: SessionUser }
  >;
  completeSession: (accessToken: string) => Promise<SessionUser>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  refreshSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isMfaChallenge(result: {
  mfaRequired?: true;
  challengeToken?: string;
  accessToken?: string;
}): result is { mfaRequired: true; challengeToken: string } {
  return result.mfaRequired === true && typeof result.challengeToken === 'string';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const applyAccessToken = useCallback((token: string | null) => {
    tokenStore.setAccessToken(token);
    setAccessTokenState(token);
  }, []);

  const clearSession = useCallback(() => {
    tokenStore.clearAll();
    setAccessTokenState(null);
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const loadMe = useCallback(async (): Promise<SessionUser> => {
    const me = await authApi.me();
    setUser(me);
    setStatus('authenticated');
    return me;
  }, []);

  const completeSession = useCallback(
    async (token: string): Promise<SessionUser> => {
      applyAccessToken(token);
      tokenStore.clearChallengeToken();
      return loadMe();
    },
    [applyAccessToken, loadMe],
  );

  const refreshSession = useCallback(async (): Promise<boolean> => {
    const token = await refreshAccessToken();
    if (!token) {
      clearSession();
      return false;
    }
    applyAccessToken(token);
    try {
      await loadMe();
      return true;
    } catch {
      clearSession();
      return false;
    }
  }, [applyAccessToken, clearSession, loadMe]);

  // Bootstrap: memory access token is empty after reload — use HttpOnly refresh cookie.
  // Skip on /logout so refresh bootstrap cannot race cookie clear + session revoke.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (pathname.startsWith(ROUTES.AUTH.LOGOUT)) {
        setStatus('unauthenticated');
        return;
      }
      // Network calls can occasionally hang in headless/browser automation runs.
      // Ensure bootstrap always settles so downstream AuthGate routes don't stay
      // permanently in `status="loading"`.
      const ok = await Promise.race<boolean>([
        refreshSession(),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 8_000)),
      ]);
      if (cancelled) return;
      if (!ok) {
        setStatus('unauthenticated');
      }
    })();
    return () => {
      cancelled = true;
    };
    // intentionally once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      if (tokenStore.isLoggingOut()) return;
      clearSession();
      if (
        !pathname.startsWith(ROUTES.AUTH.LOGIN) &&
        !pathname.startsWith('/t/') &&
        !pathname.startsWith('/session-expired')
      ) {
        const returnTo = encodeURIComponent(pathname);
        router.replace(`${ROUTES.AUTH.SESSION_EXPIRED}?returnTo=${returnTo}`);
      }
    });
    return () => setSessionExpiredHandler(null);
  }, [clearSession, pathname, router]);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const result = await authApi.login(payload);
      if (isMfaChallenge(result)) {
        tokenStore.setChallengeToken(result.challengeToken);
        return { mfaRequired: true as const, challengeToken: result.challengeToken };
      }
      const sessionUser = await completeSession(result.accessToken);
      return { mfaRequired: false as const, user: sessionUser };
    },
    [completeSession],
  );

  const logout = useCallback(async () => {
    tokenStore.beginLogout();
    try {
      if (!tokenStore.getAccessToken()) {
        await Promise.race([
          refreshAccessToken(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 3_000)),
        ]);
      }
      await authApi.logout();
    } catch {
      // Always clear local session even if the network call fails.
    } finally {
      queryClient.clear();
      clearSession();
      router.replace(ROUTES.AUTH.LOGIN);
      tokenStore.endLogout();
    }
  }, [clearSession, queryClient, router]);

  const hasPermission = useCallback(
    (permission: string) => {
      if (!user) return false;
      return user.permissions.includes('*') || user.permissions.includes(permission);
    },
    [user],
  );

  const hasAnyPermission = useCallback(
    (permissions: string[]) => permissions.some((p) => hasPermission(p)),
    [hasPermission],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      accessToken,
      login,
      completeSession,
      logout,
      hasPermission,
      hasAnyPermission,
      refreshSession,
    }),
    [
      status,
      user,
      accessToken,
      login,
      completeSession,
      logout,
      hasPermission,
      hasAnyPermission,
      refreshSession,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
