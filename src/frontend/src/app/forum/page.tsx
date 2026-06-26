"use client";

import React from "react";
import { ForumScreen } from "@/components/features/reader/ReaderScreens";
import { RequireAuth } from "@/components/auth/RequireAuth";

export default function ForumPage() {
  return (
    <RequireAuth allowedRoles={["reader", "author"]}>
      <ForumScreen />
    </RequireAuth>
  );
}
