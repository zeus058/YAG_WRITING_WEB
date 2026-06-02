"use client";

import React from "react";
import { ReaderScreen } from "@/components/features/reader/ReaderScreens";
import { RequireAuth } from "@/components/auth/RequireAuth";

export default function ReaderModePage() {
  return (
    <RequireAuth allowedRoles={["reader", "author", "admin"]}>
      <ReaderScreen />
    </RequireAuth>
  );
}
