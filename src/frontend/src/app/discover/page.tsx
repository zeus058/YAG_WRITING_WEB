import React from "react";
import { DiscoverScreen } from "@/components/features/reader/ReaderScreens";
import { RequireAuth } from "@/components/auth/RequireAuth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "YAG - Khám phá truyện mới",
  description: "Tìm kiếm truyện bằng AI Semantic Search và khám phá các tác phẩm nổi bật.",
};

export default function DiscoverPage() {
  return (
    <RequireAuth allowedRoles={["reader", "author"]}>
      <DiscoverScreen />
    </RequireAuth>
  );
}
