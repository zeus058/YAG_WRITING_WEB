export type ScreenId =
  | "s02"
  | "s03"
  | "s04"
  | "s05"
  | "s06"
  | "s07"
  | "s08"
  | "s09"
  | "s10"
  | "s11"
  | "s12"
  | "s13"
  | "s14"
  | "s15"
  | "s16"
  | "s17"
  | "s18"
  | "s19"
  | "s20"
  | "s21";

export type Role = "reader" | "author" | "admin";

export type IconName =
  | "home"
  | "search"
  | "book"
  | "user"
  | "bell"
  | "edit"
  | "calendar"
  | "shield"
  | "chart"
  | "settings"
  | "card"
  | "arrow"
  | "check"
  | "close"
  | "trash"
  | "eye"
  | "eyeOff"
  | "github"
  | "menu"
  | "lock"
  | "sun"
  | "moon";

export type PageInfo = {
  id: ScreenId;
  title: string;
  href: string;
  group: string;
  icon: IconName;
};

export type Story = {
  title: string;
  author: string;
  genre: string;
  chapters: number;
  badge: "hot" | "ai" | "done";
};

export const pages: PageInfo[] = [
  { id: "s02", title: "Đăng nhập / Đăng ký", href: "/auth", group: "Public", icon: "user" },
  { id: "s03", title: "Khôi phục mật khẩu", href: "/auth/recovery", group: "Public", icon: "lock" },
  { id: "s04", title: "Trang chủ đọc", href: "/home", group: "Độc giả", icon: "home" },
  { id: "s05", title: "Khám phá truyện", href: "/discover", group: "Độc giả", icon: "search" },
  { id: "s06", title: "Chi tiết truyện", href: "/discover", group: "Độc giả", icon: "book" },
  { id: "s07", title: "Đọc truyện", href: "/library", group: "Độc giả", icon: "book" },
  { id: "s08", title: "Diễn đàn", href: "/forum", group: "Độc giả", icon: "edit" },
  { id: "s09", title: "Membership", href: "/membership", group: "Độc giả", icon: "card" },
  { id: "s10", title: "Kết quả thanh toán", href: "/payment/result", group: "Độc giả", icon: "check" },
  { id: "s11", title: "Thư viện", href: "/library", group: "Độc giả", icon: "book" },
  { id: "s12", title: "Hồ sơ", href: "/profile/me", group: "Tài khoản", icon: "user" },
  { id: "s13", title: "Cài đặt tài khoản", href: "/settings", group: "Tài khoản", icon: "settings" },
  { id: "s14", title: "Thông báo", href: "/notifications", group: "Tài khoản", icon: "bell" },
  { id: "s15", title: "Tác phẩm của tôi", href: "/author/stories", group: "Author Studio", icon: "book" },
  { id: "s16", title: "Không gian viết", href: "/author/stories", group: "Author Studio", icon: "edit" },
  { id: "s17", title: "Xuất bản chương", href: "/author/stories", group: "Author Studio", icon: "arrow" },
  { id: "s18", title: "Lịch đăng & Cam kết", href: "/author/schedule", group: "Author Studio", icon: "calendar" },
  { id: "s19", title: "Tổng quan Admin", href: "/admin", group: "Admin", icon: "chart" },
  { id: "s20", title: "Kiểm duyệt AI", href: "/admin/moderation", group: "Admin", icon: "shield" },
  { id: "s21", title: "Báo cáo & Audit", href: "/admin/stats", group: "Admin", icon: "chart" },
];

export const roleNav: Record<Role, ScreenId[]> = {
  reader: ["s04", "s05", "s11", "s08", "s09", "s14", "s12", "s13"],
  author: ["s15", "s18", "s14", "s12", "s13"],
  admin: ["s19", "s20", "s21", "s14", "s13"],
};

export const roleInfo = {
  reader: { label: "Độc giả", name: "Độc giả", avatar: "DG" },
  author: { label: "Tác giả", name: "Tác giả", avatar: "TG" },
  admin: { label: "Quản trị", name: "Quản trị", avatar: "QT" },
} satisfies Record<Role, { label: string; name: string; avatar: string }>;


export function getPageById(id: ScreenId) {
  return pages.find((page) => page.id === id);
}

export function getRoleForPage(id: ScreenId): Role {
  if (["s15", "s16", "s17", "s18"].includes(id)) return "author";
  if (["s19", "s20", "s21"].includes(id)) return "admin";
  return "reader";
}
