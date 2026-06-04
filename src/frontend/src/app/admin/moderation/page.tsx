"use client";

import React from "react";
import { ModerationScreen } from "@/components/features/admin/AdminScreens";
import { RequireAuth } from "@/components/auth/RequireAuth";

export default function ContentModerationPage() {
  return (
    <RequireAuth allowedRoles={["admin"]}>
      <ModerationScreen />
    </RequireAuth>
  );
}
