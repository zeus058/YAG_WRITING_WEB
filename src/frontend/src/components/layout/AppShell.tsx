"use client";

import React, { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { useAuth, yagApi, appEnv, createNotificationSocket } from "@/lib";

type AppShellProps = {
  activeId: ScreenId;
  actions?: ReactNode;
  children: ReactNode;
};

function topbarContext(role: Role, isPremium: boolean = false) {
  if (role === "author") {
    return [
      { icon: "calendar" as IconName, text: "Lịch đăng tự động" },
      { icon: "check" as IconName, text: "Tự động lưu" },
    ];
  }

  if (role === "admin") {
    return [
      { icon: "shield" as IconName, text: "Bảng kiểm duyệt AI" },
      { icon: "chart" as IconName, text: "Realtime stats" },
    ];
  }

  return [
    { icon: "book" as IconName, text: isPremium ? "Gói Premium" : "Gói Free" },
    { icon: "book" as IconName, text: "Truyện đang đọc" },
  ];
}

const triggerLiveToast = (message: string) => {
  if (typeof window === "undefined") return;
  let stack = document.querySelector<HTMLElement>("[data-runtime-toast-stack]");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "toast-stack";
    stack.dataset.runtimeToastStack = "true";
    document.body.appendChild(stack);
  }

  const toast = document.createElement("div");
  toast.className = `toast success toast-success`;
  const label = document.createElement("strong");
  label.textContent = "YAG";
  const body = document.createElement("span");
  body.textContent = message;
  toast.append(label, body);
  stack.appendChild(toast);

  setTimeout(() => {
    toast.remove();
    if (stack && stack.childElementCount === 0) stack.remove();
  }, 4000);
};

export function AppShell({ activeId, actions, children }: AppShellProps) {
  const { user: authUser, logout } = useAuth();
  const router = useRouter();

  const role = authUser ? authUser.role : getRoleForPage(activeId);
  const isPremium = authUser?.premium_until ? new Date(authUser.premium_until) > new Date() : false;

  const userDisp = authUser
    ? {
        name: authUser.profile?.display_name || authUser.username,
        avatar: (authUser.profile?.display_name || authUser.username).slice(0, 2).toUpperCase(),
        avatarUrl: authUser.profile?.avatar_url || null,
        label: authUser.role === "admin" ? "Admin" : authUser.role === "author" ? "Tác giả" : "Độc giả",
      }
    : {
        ...roleInfo[role],
        avatarUrl: null as string | null,
      };

  const currentPage = getPageById(activeId);
  const navItems = roleNav[role].map(getPageById).filter((item) => item !== undefined);
  const brandHref = role === "author" ? "/author/stories" : role === "admin" ? "/admin" : "/home";
  const navLabel = role === "author" ? "Không gian tác giả" : role === "admin" ? "Bảng quản trị" : "Không gian đọc";
  
  const roleSwitchItems = [
    { role: "reader" as Role, href: "/home", icon: "book" as IconName, label: "Reader" },
    { role: "author" as Role, href: "/author/stories", icon: "edit" as IconName, label: "Author" },
  ];

  const [unreadCount, setUnreadCount] = useState(0);

  // Load unread notifications count
  useEffect(() => {
    if (!authUser || appEnv.useMocks) return;

    const fetchUnread = async () => {
      try {
        const response = await yagApi.notifications.unreadCount();
        setUnreadCount(response.data.unread_count);
      } catch (err) {
        console.error("Failed to load notifications unread count:", err);
      }
    };

    void fetchUnread();

    // Setup live Websocket for notifications
    const ws = createNotificationSocket({
      userId: authUser.id,
      onMessage: (message: any) => {
        if (message && message.type) {
          setUnreadCount((prev) => prev + 1);
          triggerLiveToast(message.message || "Bạn nhận được thông báo mới!");
        }
      },
    });

    return () => {
      if (ws) ws.close();
    };
  }, [authUser]);

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    logout();
    router.push("/auth");
  };

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
          {navItems.map((item) => {
            // Map legacy href to target href
            let targetHref = item.href;
            if (targetHref === "/dashboard") targetHref = "/home";
            if (targetHref === "/author-works") targetHref = "/author/stories";
            if (targetHref === "/admin-dashboard") targetHref = "/admin";
            if (targetHref === "/content-moderation") targetHref = "/admin/moderation";
            if (targetHref === "/reports") targetHref = "/admin/stats";
            if (targetHref === "/account-settings") targetHref = "/settings";
            if (targetHref === "/schedule-commitment") targetHref = "/author/schedule";

            return (
              <Link key={item.id} className={`sidebar-link ${item.id === activeId ? "active" : ""}`} href={targetHref ?? "#"}>
                <Icon name={item.icon} />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </div>
        <div className="sidebar-footer">
          {role === "admin" ? (
            <>
              <strong>Ban quản trị YAG</strong>
              <span>Không gian dành riêng cho đội ngũ điều phối và kiểm duyệt.</span>
              <Link className={`button admin-test-link active`} href="/admin">
                <Icon name="shield" />
                Trang quản trị viên
              </Link>
            </>
          ) : (
            <>
              <strong>Trợ giúp & Hỗ trợ</strong>
              <span>Gặp sự cố thanh toán hay lỗi chương? Hãy liên hệ với chúng tôi.</span>
              <button className="button admin-test-link" onClick={handleLogout}>
                <Icon name="close" />
                Đăng xuất tài khoản
              </button>
            </>
          )}
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
              {topbarContext(role, isPremium).map((item) => (
                <span className="topbar-status-chip" key={item.text}>
                  <Icon name={item.icon} />
                  {item.text}
                </span>
              ))}
            </div>
            <Link className="button icon-button" href="/notifications" aria-label="Thông báo" style={{ position: "relative" }}>
              <Icon name="bell" />
              {unreadCount > 0 && (
                <span className="badge badge-crimson" style={{ position: "absolute", top: -4, right: -4, padding: "2px 6px", fontSize: 10, borderRadius: "50%" }}>
                  {unreadCount}
                </span>
              )}
            </Link>
            <Link className="user-chip" href="/settings" aria-label="Thông tin người dùng">
              <span className="user-avatar" style={{ overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {userDisp.avatarUrl ? (
                  <img src={userDisp.avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  userDisp.avatar
                )}
              </span>
              <span>
                <strong>{userDisp.name}</strong>
                <small>{userDisp.label}</small>
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
