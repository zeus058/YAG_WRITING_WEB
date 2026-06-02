"use client";

import React from "react";
import { PaymentScreen } from "@/components/features/reader/ReaderScreens";
import { RequireAuth } from "@/components/auth/RequireAuth";

export default function PaymentResultPage() {
  return (
    <RequireAuth allowedRoles={["reader", "author", "admin"]}>
      <PaymentScreen />
    </RequireAuth>
  );
}
