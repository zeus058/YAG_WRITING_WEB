"use client";

import React from "react";
import { SettingsScreen } from "@/components/features/reader/ReaderScreens";
import { RequireAuth } from "@/components/auth/RequireAuth";

export default function AuthorSettingsPage() {
  return (
    <RequireAuth allowedRoles={["reader", "author", "admin"]}>
      <SettingsScreen modeOverride="author" />
    </RequireAuth>
  );
}
