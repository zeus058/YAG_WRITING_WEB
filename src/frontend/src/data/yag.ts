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
  | "eye"
  | "eyeOff"
  | "github"
  | "menu"
  | "lock";

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
  { id: "s04", title: "Trang chủ đọc", href: "/dashboard", group: "Độc giả", icon: "home" },
  { id: "s05", title: "Khám phá truyện", href: "/discover", group: "Độc giả", icon: "search" },
  { id: "s06", title: "Chi tiết truyện", href: "/story-detail", group: "Độc giả", icon: "book" },
  { id: "s07", title: "Đọc truyện", href: "/reader-mode", group: "Độc giả", icon: "book" },
  { id: "s08", title: "Diễn đàn", href: "/forum", group: "Độc giả", icon: "edit" },
  { id: "s09", title: "Membership", href: "/membership", group: "Độc giả", icon: "card" },
  { id: "s10", title: "Kết quả thanh toán", href: "/payment-result", group: "Độc giả", icon: "check" },
  { id: "s11", title: "Thư viện", href: "/library", group: "Độc giả", icon: "book" },
  { id: "s12", title: "Hồ sơ", href: "/profile", group: "Tài khoản", icon: "user" },
  { id: "s13", title: "Cài đặt tài khoản", href: "/account-settings", group: "Tài khoản", icon: "settings" },
  { id: "s14", title: "Thông báo", href: "/notifications", group: "Tài khoản", icon: "bell" },
  { id: "s15", title: "Tác phẩm của tôi", href: "/author-works", group: "Author Studio", icon: "book" },
  { id: "s16", title: "Không gian viết", href: "/author-studio", group: "Author Studio", icon: "edit" },
  { id: "s17", title: "Xuất bản chương", href: "/publish-chapter", group: "Author Studio", icon: "arrow" },
  { id: "s18", title: "Lịch đăng & Cam kết", href: "/schedule-commitment", group: "Author Studio", icon: "calendar" },
  { id: "s19", title: "Tổng quan Admin", href: "/admin-dashboard", group: "Admin", icon: "chart" },
  { id: "s20", title: "Kiểm duyệt nội dung", href: "/content-moderation", group: "Admin", icon: "shield" },
  { id: "s21", title: "Báo cáo doanh thu", href: "/reports", group: "Admin", icon: "chart" },
];

export const roleNav: Record<Role, ScreenId[]> = {
  reader: ["s04", "s05", "s11", "s08", "s09", "s14", "s12", "s13"],
  author: ["s15", "s16", "s17", "s18", "s14", "s12", "s13"],
  admin: ["s19", "s20", "s21", "s14", "s13"],
};

export const roleInfo = {
  reader: { label: "Độc giả", name: "Minh Nguyệt", avatar: "MN" },
  author: { label: "Tác giả", name: "Linh An", avatar: "LA" },
  admin: { label: "Quản trị", name: "Admin YAG", avatar: "AD" },
} satisfies Record<Role, { label: string; name: string; avatar: string }>;

export const screenRouteMap: Record<string, ScreenId> = {
  "s02-auth": "s02",
  "/auth": "s02",
  "s03-password-recovery": "s03",
  "/auth/recovery": "s03",
  "s04-home-feed": "s04",
  "/dashboard": "s04",
  "s05-discover-search": "s05",
  "/discover": "s05",
  "s06-story-detail": "s06",
  "/story-detail": "s06",
  "s07-reader-mode": "s07",
  "/reader-mode": "s07",
  "s08-forum": "s08",
  "/forum": "s08",
  "s09-membership": "s09",
  "/membership": "s09",
  "s10-payment-result": "s10",
  "/payment-result": "s10",
  "s11-library": "s11",
  "/library": "s11",
  "s12-profile": "s12",
  "/profile": "s12",
  "s13-account-settings": "s13",
  "/account-settings": "s13",
  "s14-notifications": "s14",
  "/notifications": "s14",
  "s15-author-works": "s15",
  "/author-works": "s15",
  "s16-author-studio": "s16",
  "/author-studio": "s16",
  "s17-publish-chapter": "s17",
  "/publish-chapter": "s17",
  "s18-schedule-commitment": "s18",
  "/schedule-commitment": "s18",
  "s19-admin-dashboard": "s19",
  "/admin-dashboard": "s19",
  "s20-content-moderation": "s20",
  "/content-moderation": "s20",
  "s21-reports": "s21",
  "/reports": "s21",
};

export const screenStaticSlugs = Object.keys(screenRouteMap);

export const stories: Story[] = [
  { title: "Mưa Trên Thành Cũ", author: "Linh An", genre: "Ngôn tình lịch sử", chapters: 72, badge: "hot" },
  { title: "Cánh Cửa Sau Sao Băng", author: "Minh Khôi", genre: "Khoa học viễn tưởng", chapters: 48, badge: "ai" },
  { title: "Hồ Sơ Ánh Trăng", author: "Lam Tử", genre: "Trinh thám", chapters: 64, badge: "done" },
  { title: "Vườn Ký Ức", author: "Ngọc Hà", genre: "Đời thường", chapters: 36, badge: "hot" },
  { title: "Tàn Tro Phượng Hoàng", author: "Hải Đăng", genre: "Huyền huyễn", chapters: 82, badge: "ai" },
  { title: "Đường Về Phía Biển", author: "Phương Nam", genre: "Tâm lý", chapters: 28, badge: "done" },
  { title: "Thư Viện Không Ngủ", author: "An Nhiên", genre: "Kỳ ảo", chapters: 54, badge: "hot" },
  { title: "Ngày Mai Chưa Đến", author: "Bảo Châu", genre: "Hiện đại", chapters: 41, badge: "ai" },
  { title: "Lời Thì Thầm Của Gió", author: "Gia Hân", genre: "Thanh xuân", chapters: 59, badge: "hot" },
  { title: "Bản Đồ Dưới Lòng Đất", author: "Khang Vũ", genre: "Phiêu lưu", chapters: 67, badge: "ai" },
  { title: "Mắt Biếc Thành Đông", author: "Tú Uyên", genre: "Cổ trang", chapters: 45, badge: "done" },
  { title: "Quán Trà Cuối Hẻm", author: "Duy Minh", genre: "Chữa lành", chapters: 33, badge: "hot" },
  { title: "Vệt Nắng Sau Mùa Đông", author: "Hạ Vy", genre: "Gia đình", chapters: 52, badge: "ai" },
  { title: "Người Gác Sao", author: "Quang Nhật", genre: "Kỳ ảo", chapters: 76, badge: "hot" },
  { title: "Bên Kia Dòng Sông", author: "Mai Anh", genre: "Lịch sử", chapters: 64, badge: "done" },
  { title: "Thành Phố Không Tên", author: "Đức Trí", genre: "Cyberpunk", chapters: 88, badge: "ai" },
];

export function getScreenId(slug: string) {
  return screenRouteMap[slug] ?? null;
}

export function getPageById(id: ScreenId) {
  return pages.find((page) => page.id === id);
}

export function getRoleForPage(id: ScreenId): Role {
  if (["s15", "s16", "s17", "s18"].includes(id)) return "author";
  if (["s19", "s20", "s21"].includes(id)) return "admin";
  return "reader";
}
