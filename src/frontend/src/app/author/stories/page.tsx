"use client";

import React from "react";
import { AuthorWorksScreen } from "@/components/features/author/AuthorScreens";
import { RequireAuth } from "@/components/auth/RequireAuth";

export default function AuthorWorksPage() {
  return (
    <RequireAuth allowedRoles={["author"]}>
      <AuthorWorksScreen />
    </RequireAuth>
  );
}
