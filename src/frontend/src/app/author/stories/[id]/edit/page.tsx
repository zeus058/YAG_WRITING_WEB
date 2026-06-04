"use client";

import React from "react";
import { AuthorStudioScreen } from "@/components/features/author/AuthorScreens";
import { RequireAuth } from "@/components/auth/RequireAuth";

export default function AuthorStudioPage() {
  return (
    <RequireAuth allowedRoles={["reader", "author"]}>
      <AuthorStudioScreen />
    </RequireAuth>
  );
}
