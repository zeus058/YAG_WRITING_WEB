"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { getAccessToken, clearAuthTokens, setAuthTokens } from "./auth";
import { yagApi } from "./api";


export type AuthUser = {
  id: string;
  email: string;
  username: string;
  role: "reader" | "author" | "admin";
  premium_until?: string | null;
  profile?: {
    display_name: string;
    avatar_url?: string | null;
    bio?: string | null;
    reputation_score: number;
  } | null;
};

type AuthContextType = {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: { accessToken: string; user: AuthUser }) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      setAccessToken(null);
      setIsLoading(false);
      return;
    }

    if (token === "mock-token") {
      clearAuthTokens();
      setUser(null);
      setAccessToken(null);
      setIsLoading(false);
      return;
    }

    setAccessToken(token);

    try {
      const response = await yagApi.auth.me();
      setUser(response.data as AuthUser);
    } catch (error) {
      console.error("Failed to fetch user profiles, clearing tokens:", error);
      clearAuthTokens();
      setUser(null);
      setAccessToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [pathname, refreshUser]);

  useEffect(() => {
    const handleExpiredSession = () => {
      setUser(null);
      setAccessToken(null);
    };
    window.addEventListener("yag:auth-expired", handleExpiredSession);
    return () => window.removeEventListener("yag:auth-expired", handleExpiredSession);
  }, []);

  const login = (payload: { accessToken: string; user: AuthUser }) => {
    setAuthTokens({ accessToken: payload.accessToken });
    setAccessToken(payload.accessToken);
    setUser(payload.user);
  };

  const logout = () => {
    clearAuthTokens();
    setAccessToken(null);
    setUser(null);
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        isAuthenticated,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
