import React from "react";
import { DiscoverScreen } from "@/components/features/reader/ReaderScreens";
import { RequireAuth } from "@/components/auth/RequireAuth";

export default function DiscoverPage() {
  return (
    <RequireAuth allowedRoles={["reader", "author", "admin"]}>
      <DiscoverScreen />
    </RequireAuth>
  );
}
