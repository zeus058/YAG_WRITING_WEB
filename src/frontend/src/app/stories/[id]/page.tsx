"use client";

import React from "react";
import { StoryDetailScreen } from "@/components/features/reader/ReaderScreens";
import { RequireAuth } from "@/components/auth/RequireAuth";

export default function StoryDetailPage() {
  return (
    <RequireAuth allowedRoles={["reader", "author"]}>
      <StoryDetailScreen />
    </RequireAuth>
  );
}
