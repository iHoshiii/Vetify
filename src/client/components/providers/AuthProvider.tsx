import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  logoutFromServer,
  readAuthState,
  refreshSession,
  writeAuthState,
  type AuthSession,
  type AuthUser,
} from '@/lib/auth';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  /** Adopt a session obtained elsewhere, e.g. the OAuth callback page. */
  setSession: (session: AuthSession) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const stored = readAuthState();
  const [user, setUser] = useState<AuthUser | null>(stored?.user ?? null);
  const [accessToken, setAccessToken] = useState<string | null>(stored?.accessToken ?? null);
  // A stored session is adopted optimistically, then revalidated below. Starting
  // at 'loading' only when there is something to validate keeps first paint for
  // anonymous visitors free of a spinner.
  const [status, setStatus] = useState<AuthStatus>(stored?.user ? 'loading' : 'anonymous');

  const setSession = useCallback((session: AuthSession) => {
    setUser(session.user);
    setAccessToken(session.accessToken);
    setStatus('authenticated');
    writeAuthState(session);
  }, []);

  const clear = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    setStatus('anonymous');
    writeAuthState(null);
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutFromServer();
    } finally {
      clear();
    }
  }, [clear]);

  // The stored access token expires long before the refresh cookie does, so a
  // returning visitor is revalidated once on mount rather than trusted outright.
  useEffect(() => {
    if (!stored?.user) return;

    let cancelled = false;
    refreshSession()
      .then((session) => {
        if (!cancelled) setSession(session);
      })
      .catch(() => {
        // Refresh cookie gone or revoked: the stored session is dead.
        if (!cancelled) clear();
      });

    return () => {
      cancelled = true;
    };
    // Deliberately mount-only: `stored` is a fresh object every render, and
    // re-running this on every render would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      status,
      // True while a stored session is still being revalidated, so the navbar
      // does not flash "Log in" on every page load for someone already signed
      // in. Revalidation failure clears both fields and flips this to false.
      isAuthenticated: Boolean(user) && status !== 'anonymous',
      setSession,
      logout,
    }),
    [user, accessToken, status, setSession, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside an AuthProvider');
  return ctx;
}
