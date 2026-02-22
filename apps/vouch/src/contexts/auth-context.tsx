"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  getMe,
  login as authLogin,
  logout as authLogout,
  register as authRegister,
  type User,
  type AuthError,
} from "@/lib/auth";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{ error: AuthError | null }>;
  register: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<{ error: AuthError | null }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await getMe();
    setUser(data?.user ?? null);
  }, []);

  // Check for an existing session on mount
  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const login = useCallback(
    async (
      email: string,
      password: string
    ): Promise<{ error: AuthError | null }> => {
      const { data, error } = await authLogin(email, password);
      if (data?.user) setUser(data.user);
      return { error };
    },
    []
  );

  const register = useCallback(
    async (
      email: string,
      password: string,
      displayName: string
    ): Promise<{ error: AuthError | null }> => {
      const { data, error } = await authRegister(email, password, displayName);
      if (data?.user) setUser(data.user);
      return { error };
    },
    []
  );

  const logout = useCallback(async () => {
    await authLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
