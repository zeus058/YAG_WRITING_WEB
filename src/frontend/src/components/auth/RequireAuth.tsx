"use client";

import React, { useEffect, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib";

type RequireAuthProps = {
  children: ReactNode;
  allowedRoles?: ("reader" | "author" | "admin")[];
};

function canAccessRole(
  userRole: "reader" | "author" | "admin",
  allowedRoles?: ("reader" | "author" | "admin")[]
) {
  if (!allowedRoles) return true;
  if (allowedRoles.includes(userRole)) return true;

  const isReaderAuthorAccount = userRole === "reader" || userRole === "author";
  const allowsReaderAuthorMode = allowedRoles.includes("reader") || allowedRoles.includes("author");

  return isReaderAuthorAccount && allowsReaderAuthorMode;
}

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

    if (user && !canAccessRole(user.role, allowedRoles)) {
      // Redirect unauthorized role back to appropriate home page
      if (user.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/home");
      }
    }
  }, [isLoading, isAuthenticated, user, router, pathname, allowedRoles]);

  if (isLoading) {
    return (
      <main className="auth-page auth-page-centered" style={{ background: "var(--bg)" }} id="authLoadingLandmark">
        <div className="stack" style={{ alignItems: "center", gap: 16 }}>
          <div className="brand-logo spinner" style={{ background: "var(--crimson)", color: "#fff", width: 48, height: 48, fontSize: 20 }}>
            YAG
          </div>
          <h1 style={{ color: "var(--muted)", fontSize: 16, fontWeight: "normal" }}>Đang xác thực thông tin...</h1>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (user && !canAccessRole(user.role, allowedRoles)) {
    return null;
  }

  return <>{children}</>;
}
