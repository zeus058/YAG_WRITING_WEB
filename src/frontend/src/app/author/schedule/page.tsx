"use client";

import React from "react";
import { ScheduleScreen } from "@/components/features/author/AuthorScreens";
import { RequireAuth } from "@/components/auth/RequireAuth";

export default function ScheduleCommitmentPage() {
  return (
    <RequireAuth allowedRoles={["author"]}>
      <ScheduleScreen />
    </RequireAuth>
  );
}
