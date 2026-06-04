"use client";

import React from "react";
import { PublishScreen } from "@/components/features/author/AuthorScreens";
import { RequireAuth } from "@/components/auth/RequireAuth";

export default function PublishChapterPage() {
  return (
    <RequireAuth allowedRoles={["reader", "author"]}>
      <PublishScreen />
    </RequireAuth>
  );
}
