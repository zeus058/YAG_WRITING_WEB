"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getAccessToken, clearAuthTokens } from "./auth";
import { yagApi } from "./api";
import { appEnv } from "./env";

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
    reputation_score?: number;
  };
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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      setAccessToken(null);
      setIsLoading(false);
      return;
    }

    setAccessToken(token);

    if (appEnv.useMocks) {
      // Mock mode fallback user
      setUser({
        id: "d6a2f7c0-2f9b-449e-ba23-9502e6c7d5bd",
        email: "reader@yag.vn",
        username: "reader_demo",
        role: "reader",
        profile: {
          display_name: "Minh Nguyệt",
          avatar_url: null,
          bio: "Thích đọc truyện trinh thám và lịch sử",
          reputation_score: 100,
        },
      });
      setIsLoading(false);
      return;
    }

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
  };

  useEffect(() => {
    void refreshUser();
  }, []);

  const login = (payload: { accessToken: string; user: AuthUser }) => {
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
