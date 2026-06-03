import React from "react";
import { SettingsScreen } from "@/components/features/reader/ReaderScreens";
import { RequireAuth } from "@/components/auth/RequireAuth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "YAG - Cài đặt tài khoản",
  description: "Thiết lập cấu hình tài khoản, hồ sơ cá nhân và tuỳ chỉnh giao diện đọc truyện.",
};

export default function AccountSettingsPage() {
  return (
    <RequireAuth allowedRoles={["reader", "author", "admin"]}>
      <SettingsScreen />
    </RequireAuth>
  );
}
