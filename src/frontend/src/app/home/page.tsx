"use client";

import React from "react";
import { HomeFeedScreen } from "@/components/features/reader/ReaderScreens";
import { RequireAuth } from "@/components/auth/RequireAuth";

export default function HomePage() {
  return (
    <RequireAuth allowedRoles={["reader", "author", "admin"]}>
      <HomeFeedScreen />
    </RequireAuth>
  );
}
