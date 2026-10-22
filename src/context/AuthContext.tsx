import React, { createContext, useContext, useEffect, useState } from "react";
import type { UserResponse } from "../api/auth";
import { authApi } from "../api/auth";
import { usersApi, UsersError } from "../api/users";

interface AuthState {
  user: UserResponse | null;
  token: string | null;
}

interface AuthContextValue extends AuthState {
  setAuth: (user: UserResponse, token: string) => void;
  updateUser: (user: UserResponse) => void;
  clearAuth: () => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "rf_token";
const USER_KEY = "rf_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuthState] = useState<AuthState>(() => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const user = localStorage.getItem(USER_KEY);
      return {
        token,
        user: user ? (JSON.parse(user) as UserResponse) : null,
      };
    } catch {
      return { token: null, user: null };
    }
  });

  // Keep localStorage in sync whenever auth changes
  useEffect(() => {
    if (auth.token && auth.user) {
      localStorage.setItem(TOKEN_KEY, auth.token);
      localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }, [auth]);

  // The cached user can be stale (edited elsewhere, or an expired presigned
  // avatar URL), so refresh it once per app load. Only an auth failure signs
  // the user out — a network blip keeps the cached copy.
  useEffect(() => {
    const token = auth.token;
    if (!token) return;
    let cancelled = false;
    usersApi
      .getMe(token)
      .then((user) => {
        if (!cancelled) setAuthState((prev) => (prev.token === token ? { ...prev, user } : prev));
      })
      .catch((err) => {
        if (!cancelled && err instanceof UsersError && err.kind === "unauthorized") {
          setAuthState({ user: null, token: null });
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per app load
  }, []);

  const setAuth = (user: UserResponse, token: string) =>
    setAuthState({ user, token });

  const updateUser = (user: UserResponse) =>
    setAuthState((prev) => ({ ...prev, user }));

  const clearAuth = () => setAuthState({ user: null, token: null });

  // Notify the server (best-effort), then wipe local auth state.
  const logout = async () => {
    await authApi.logout(auth.token);
    clearAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        ...auth,
        setAuth,
        updateUser,
        clearAuth,
        logout,
        isAuthenticated: !!auth.token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
