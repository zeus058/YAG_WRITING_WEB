/**
 * Root Layout — YAG Writing Novels Web
 *
 * Cấu hình toàn cục: Font chữ, Metadata SEO, Provider bao bọc.
 * Ngôn ngữ mặc định: Tiếng Việt (vi).
 */

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "YAG - Nền Tảng Viết Truyện Trực Tuyến",
  description:
    "Nền tảng viết truyện thông minh tích hợp AI, hỗ trợ sáng tác, kiểm duyệt tự động và xây dựng cộng đồng độc giả - tác giả.",
  keywords: [
    "viết truyện",
    "đọc truyện online",
    "AI viết truyện",
    "nền tảng sáng tác",
    "YAG",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
