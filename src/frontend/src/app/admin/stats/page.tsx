"use client";

import React from "react";
import { ReportsScreen } from "@/components/features/admin/AdminScreens";
import { RequireAuth } from "@/components/auth/RequireAuth";

export default function StatsPage() {
  return (
    <RequireAuth allowedRoles={["admin"]}>
      <ReportsScreen />
    </RequireAuth>
  );
}
