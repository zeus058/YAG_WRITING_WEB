import type { ReactNode } from "react";
import Link from "next/link";
import {
  getPageById,
  getRoleForPage,
  roleInfo,
  roleNav,
  type IconName,
  type Role,
  type ScreenId,
} from "@/data/yag";
import { BrandLogo, Icon } from "@/components/ui";
import { ProductFooter } from "./ProductFooter";

type AppShellProps = {
  activeId: ScreenId;
  actions?: ReactNode;
  children: ReactNode;
};

function topbarContext(role: Role) {
  if (role === "author") {
    return [
      { icon: "calendar" as IconName, text: "2 lịch đăng sắp tới" },
      { icon: "check" as IconName, text: "Tự động lưu" },
    ];
  }

  if (role === "admin") {
    return [
      { icon: "shield" as IconName, text: "38 nội dung chờ duyệt" },
      { icon: "chart" as IconName, text: "Realtime" },
    ];
  }

  return [
    { icon: "book" as IconName, text: "Gói Free" },
    { icon: "book" as IconName, text: "7 truyện đang đọc" },
  ];
}

export function AppShell({ activeId, actions, children }: AppShellProps) {
  const role = getRoleForPage(activeId);
  const user = roleInfo[role];
  const currentPage = getPageById(activeId);
  const navItems = roleNav[role].map(getPageById).filter((item) => item !== undefined);
  const brandHref = role === "author" ? "/author-works" : role === "admin" ? "/admin-dashboard" : "/dashboard";
  const navLabel = role === "author" ? "Không gian tác giả" : role === "admin" ? "Bảng quản trị" : "Không gian đọc";
  const roleSwitchItems = [
    { role: "reader" as Role, href: "/dashboard", icon: "book" as IconName, label: "Reader" },
    { role: "author" as Role, href: "/author-works", icon: "edit" as IconName, label: "Author" },
  ];

  return (
    <div className="prototype-shell">
      <aside className="prototype-sidebar" id="prototypeSidebar">
        <div className="sidebar-brand">
          <Link className="brand-mark" href={brandHref} aria-label="YAG">
            <BrandLogo />
          </Link>
          <button className="button icon-button sidebar-toggle" type="button" data-sidebar-close aria-label="Đóng sidebar">
            <Icon name="close" />
          </button>
        </div>
        <div className="role-switcher" aria-label="Chuyển giữa Reader và Author">
          {roleSwitchItems.map((item) => (
            <Link key={item.role} className={`role-switch-link ${role === item.role ? "active" : ""}`} href={item.href}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
        <div className="sidebar-section">
          <div className="sidebar-label">{navLabel}</div>
          {navItems.map((item) => (
            <Link key={item.id} className={`sidebar-link ${item.id === activeId ? "active" : ""}`} href={item.href ?? "#"}>
              <Icon name={item.icon} />
              <span>{item.title}</span>
            </Link>
          ))}
        </div>
        <div className="sidebar-footer">
          <strong>Ban quản trị YAG</strong>
          <span>Không gian dành riêng cho đội ngũ điều phối và kiểm duyệt.</span>
          <Link className={`button admin-test-link ${role === "admin" ? "active" : ""}`} href="/admin-dashboard">
            <Icon name="shield" />
            Trang quản trị viên
          </Link>
        </div>
      </aside>

      <main className="prototype-main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="button icon-button mobile-menu-button" type="button" data-sidebar-open aria-label="Mở sidebar">
              <Icon name="menu" />
            </button>
            <h1 className="topbar-title">{currentPage?.title ?? "YAG"}</h1>
          </div>
          <div className="topbar-actions">
            <div className="topbar-status" aria-label="Thông tin nhanh">
              {topbarContext(role).map((item) => (
                <span className="topbar-status-chip" key={item.text}>
                  <Icon name={item.icon} />
                  {item.text}
                </span>
              ))}
            </div>
            <Link className="button icon-button" href="/notifications" aria-label="Thông báo">
              <Icon name="bell" />
            </Link>
            <Link className="user-chip" href="/profile" aria-label="Thông tin người dùng">
              <span className="user-avatar">{user.avatar}</span>
              <span>
                <strong>{user.name}</strong>
                <small>{user.label}</small>
              </span>
            </Link>
          </div>
        </header>

        <div className="page-wrap">
          {actions ? <div className="page-toolbar">{actions}</div> : null}
          {children}
        </div>
        <ProductFooter />
      </main>
    </div>
  );
}
