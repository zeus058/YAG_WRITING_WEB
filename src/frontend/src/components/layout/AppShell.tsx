"use client";

import React, { ReactNode, useState, useEffect } from "react";
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
import { useAuth, yagApi, appEnv, createNotificationSocket } from "@/lib";

type AppShellProps = {
  activeId: ScreenId;
  actions?: ReactNode;
  children: ReactNode;
  modeOverride?: "reader" | "author" | "admin";
};

function topbarContext(role: Role, isPremium: boolean = false) {
  if (role === "author") {
    return [
      { icon: "calendar" as IconName, text: "Lịch đăng tự động", href: "/author/schedule" },
      { icon: "check" as IconName, text: "Tự động lưu", href: "#" },
    ];
  }

  if (role === "admin") {
    return [
      { icon: "shield" as IconName, text: "Bảng kiểm duyệt AI", href: "/admin/moderation" },
      { icon: "chart" as IconName, text: "Báo cáo vận hành", href: "/admin/stats" },
    ];
  }

  return [
    { icon: "book" as IconName, text: isPremium ? "Gói Premium" : "Gói Free", href: "/membership" },
    { icon: "book" as IconName, text: "Truyện đang đọc", href: "/library" },
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

export function AppShell({ activeId, actions, children, modeOverride }: AppShellProps) {
  const { user: authUser, logout } = useAuth();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  const role = modeOverride || (authUser?.role === "admin" ? "admin" : getRoleForPage(activeId));
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    if (authUser?.premium_until) {
      setIsPremium(new Date(authUser.premium_until) > new Date());
    } else if (typeof window !== "undefined") {
      const cached = localStorage.getItem("yag.mockMembership");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.is_active && parsed.premium_until) {
            setIsPremium(new Date(parsed.premium_until) > new Date());
          } else {
            setIsPremium(false);
          }
        } catch (e) {
          setIsPremium(false);
        }
      } else {
        setIsPremium(false);
      }
    } else {
      setIsPremium(false);
    }
  }, [authUser]);

  const userDisp = authUser
    ? {
        name: authUser.profile?.display_name || authUser.username,
        avatar: (authUser.profile?.display_name || authUser.username).slice(0, 2).toUpperCase(),
        avatarUrl: authUser.profile?.avatar_url || null,
        label: role === "admin" ? "Admin" : role === "author" ? "Tác giả" : "Độc giả",
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

  // Handle outside click to close account menu
  useEffect(() => {
    if (!isAccountMenuOpen) return;
    const handleClose = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".account-menu")) {
        setIsAccountMenuOpen(false);
      }
    };
    document.addEventListener("click", handleClose);
    return () => document.removeEventListener("click", handleClose);
  }, [isAccountMenuOpen]);

  const handleLogout = () => {
    logout();
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
        {authUser?.role !== "admin" && (
          <div className="role-switcher" aria-label="Chuyển giữa Reader và Author">
            {roleSwitchItems.map((item) => (
              <Link key={item.role} className={`role-switch-link ${role === item.role ? "active" : ""}`} href={item.href}>
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        )}
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

            if (role === "author") {
              if (item.id === "s14") targetHref = "/author/notifications";
              if (item.id === "s12") targetHref = "/author/profile";
              if (item.id === "s13") targetHref = "/author/settings";
            }

            return (
              <Link key={item.id} className={`sidebar-link ${item.id === activeId ? "active" : ""}`} href={targetHref ?? "#"}>
                <Icon name={item.icon} />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </div>
        {role === "admin" && (
          <div className="sidebar-footer">
            <strong>Ban quản trị YAG</strong>
            <span>Không gian dành riêng cho đội ngũ điều phối và kiểm duyệt.</span>
            <Link className="button admin-test-link" href="/admin">
              <Icon name="shield" />
              Trang quản trị viên
            </Link>
          </div>
        )}
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
                item.href && item.href !== "#" ? (
                  <Link className="topbar-status-chip" key={item.text} href={item.href}>
                    <Icon name={item.icon} />
                    {item.text}
                  </Link>
                ) : (
                  <span className="topbar-status-chip" key={item.text}>
                    <Icon name={item.icon} />
                    {item.text}
                  </span>
                )
              ))}
            </div>
            <Link className="button icon-button" href={role === "author" ? "/author/notifications" : "/notifications"} aria-label="Thông báo" style={{ position: "relative" }}>
              <Icon name="bell" />
              {unreadCount > 0 && (
                <span className="badge badge-crimson" style={{ position: "absolute", top: -4, right: -4, padding: "2px 6px", fontSize: 10, borderRadius: "50%" }}>
                  {unreadCount}
                </span>
              )}
            </Link>
            <div className="account-menu">
              <button
                className="user-chip account-menu-button"
                type="button"
                aria-haspopup="true"
                aria-expanded={isAccountMenuOpen}
                onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                aria-label="Thông tin người dùng"
                style={{ border: 0, padding: "4px 10px 4px 4px", display: "inline-flex", alignItems: "center", gap: 10, background: "#FFFFFF", cursor: "pointer" }}
              >
                <span className="user-avatar" style={{ overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {userDisp.avatarUrl ? (
                    <img src={userDisp.avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    userDisp.avatar
                  )}
                </span>
                <span style={{ textAlign: "left" }}>
                  <strong>{userDisp.name}</strong>
                  <small>{userDisp.label}</small>
                </span>
              </button>
              
              {isAccountMenuOpen && (
                <div className="account-dropdown">
                  <div className="account-dropdown-info" style={{ padding: "8px 12px", borderBottom: "1px solid var(--line)", marginBottom: 4 }}>
                    <div style={{ fontWeight: "bold", fontSize: 13, color: "var(--jungle-dark)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                      {userDisp.name}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                      {authUser?.email || authUser?.username || ""}
                    </div>
                  </div>
                  
                  <Link className="account-dropdown-item" href={role === "author" ? "/author/profile" : "/profile/me"} onClick={() => setIsAccountMenuOpen(false)}>
                    <Icon name="user" />
                    Hồ sơ của tôi
                  </Link>
                  
                  <Link className="account-dropdown-item" href={role === "author" ? "/author/settings" : "/settings"} onClick={() => setIsAccountMenuOpen(false)}>
                    <Icon name="settings" />
                    Cài đặt tài khoản
                  </Link>
                  
                  {authUser?.role !== "admin" && (
                    role === "reader" ? (
                      <Link className="account-dropdown-item" href="/author/stories" onClick={() => setIsAccountMenuOpen(false)}>
                        <Icon name="edit" />
                        Chuyển sang Author
                      </Link>
                    ) : (
                      <Link className="account-dropdown-item" href="/home" onClick={() => setIsAccountMenuOpen(false)}>
                        <Icon name="book" />
                        Chuyển sang Reader
                      </Link>
                    )
                  )}
                  
                  <hr />
                  
                  <button className="account-dropdown-item logout-btn" type="button" onClick={() => { setIsAccountMenuOpen(false); handleLogout(); }} style={{ background: "transparent", border: 0, cursor: "pointer", width: "100%", textAlign: "left" }}>
                    <Icon name="close" />
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
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
