"use client";

import React from "react";
import { SettingsScreen } from "@/components/features/reader/ReaderScreens";
import { RequireAuth } from "@/components/auth/RequireAuth";

export default function AccountSettingsPage() {
  return (
    <RequireAuth allowedRoles={["reader", "author", "admin"]}>
      <SettingsScreen />
    </RequireAuth>
  );
}
