/**
 * Root Layout — YAG Writing Novels Web
 *
 * Cấu hình toàn cục: Font chữ, Metadata SEO, Provider bao bọc.
 * Ngôn ngữ mặc định: Tiếng Việt (vi).
 */

import type { Metadata } from "next";
import { Inter, Geist_Mono, Playfair_Display } from "next/font/google";
import { ClientInteractions } from "@/components/runtime/ClientInteractions";
import "./prototype.css";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Serif tiêu đề landing — khớp prototype yag_landing.html */
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
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
  openGraph: {
    title: "YAG - Nền Tảng Viết Truyện Trực Tuyến",
    description:
      "Đọc truyện, sáng tác cùng AI, kiểm duyệt nội dung và xây dựng cộng đồng độc giả - tác giả.",
    type: "website",
    locale: "vi_VN",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${inter.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className={`${inter.className} min-h-full flex flex-col`}>
        {children}
        <ClientInteractions />
      </body>
    </html>
  );
}
