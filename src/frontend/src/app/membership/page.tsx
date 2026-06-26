import React from "react";
import { MembershipScreen } from "@/components/features/reader/ReaderScreens";
import { RequireAuth } from "@/components/auth/RequireAuth";

export default function MembershipPage() {
  return (
    <RequireAuth allowedRoles={["reader", "author"]}>
      <MembershipScreen />
    </RequireAuth>
  );
}
