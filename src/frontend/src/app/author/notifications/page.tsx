"use client";

import React from "react";
import { NotificationsScreen } from "@/components/features/reader/ReaderScreens";
import { RequireAuth } from "@/components/auth/RequireAuth";

export default function AuthorNotificationsPage() {
  return (
    <RequireAuth allowedRoles={["reader", "author", "admin"]}>
      <NotificationsScreen modeOverride="author" />
    </RequireAuth>
  );
}
