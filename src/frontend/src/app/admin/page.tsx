"use client";

import React from "react";
import { AdminDashboardScreen } from "@/components/features/admin/AdminScreens";
import { RequireAuth } from "@/components/auth/RequireAuth";

export default function AdminDashboardPage() {
  return (
    <RequireAuth allowedRoles={["admin"]}>
      <AdminDashboardScreen />
    </RequireAuth>
  );
}
