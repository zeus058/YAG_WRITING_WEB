import React from "react";
import { LibraryScreen } from "@/components/features/reader/ReaderScreens";
import { RequireAuth } from "@/components/auth/RequireAuth";

export default function LibraryPage() {
  return (
    <RequireAuth allowedRoles={["reader", "author", "admin"]}>
      <LibraryScreen />
    </RequireAuth>
  );
}
