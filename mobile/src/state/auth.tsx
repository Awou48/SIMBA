import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, onUnauthorized, session } from "../lib/api";

interface AuthState {
  ready: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [isAuthenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    session.load().then((t) => {
      setAuthenticated(!!t);
      setReady(true);
    });
    return onUnauthorized(() => setAuthenticated(false));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await api.login(email.trim().toLowerCase(), password);
    await session.set(res.access_token);
    setAuthenticated(true);
  }, []);

  const register = useCallback(
    async (email: string, password: string) => {
      await api.register(email.trim().toLowerCase(), password);
      await signIn(email, password);
    },
    [signIn],
  );

  const signOut = useCallback(async () => {
    await session.clear();
    setAuthenticated(false);
  }, []);

  const value = useMemo(() => ({ ready, isAuthenticated, signIn, register, signOut }), [ready, isAuthenticated, signIn, register, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
