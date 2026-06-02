"use client";

import React, { useEffect, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib";

type RequireAuthProps = {
  children: ReactNode;
  allowedRoles?: ("reader" | "author" | "admin")[];
};

export function RequireAuth({ children, allowedRoles }: RequireAuthProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push(`/auth?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      // Redirect unauthorized role back to main home page
      router.push("/home");
    }
  }, [isLoading, isAuthenticated, user, router, pathname, allowedRoles]);

  if (isLoading) {
    return (
      <div className="auth-page auth-page-centered" style={{ background: "var(--bg)" }}>
        <div className="stack" style={{ alignItems: "center", gap: 16 }}>
          <div className="brand-logo spinner" style={{ background: "var(--crimson)", color: "#fff", width: 48, height: 48, fontSize: 20 }}>
            YAG
          </div>
          <span style={{ color: "var(--muted)" }}>Đang xác thực thông tin...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
