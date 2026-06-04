import React from "react";
import { HomeFeedScreen } from "@/components/features/reader/ReaderScreens";
import { RequireAuth } from "@/components/auth/RequireAuth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "YAG - Bảng tin truyện của bạn",
  description: "Cập nhật chương mới nhất của các truyện bạn đang theo dõi và các đề xuất cá nhân hóa.",
};

export default function HomePage() {
  return (
    <RequireAuth allowedRoles={["reader", "author"]}>
      <HomeFeedScreen />
    </RequireAuth>
  );
}
