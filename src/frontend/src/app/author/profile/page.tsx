"use client";

import React from "react";
import { ProfileScreen } from "@/components/features/reader/ReaderScreens";
import { RequireAuth } from "@/components/auth/RequireAuth";

export default function AuthorProfilePage() {
  return (
    <RequireAuth allowedRoles={["reader", "author"]}>
      <ProfileScreen modeOverride="author" />
    </RequireAuth>
  );
}
