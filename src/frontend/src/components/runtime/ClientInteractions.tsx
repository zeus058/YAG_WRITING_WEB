"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { appEnv, yagApi } from "@/lib";

const legacyRoutes: Record<string, string> = {
  "s02-auth.html": "/auth",
  "s03-password-recovery.html": "/auth/recovery",
  "s04-home-feed.html": "/dashboard",
  "s05-discover-search.html": "/discover",
  "s06-story-detail.html": "/story-detail",
  "s07-reader-mode.html": "/reader-mode",
  "s08-forum.html": "/forum",
  "s09-membership.html": "/membership",
  "s10-payment-result.html": "/payment-result",
  "s11-library.html": "/library",
  "s12-profile.html": "/profile",
  "s13-account-settings.html": "/account-settings",
  "s14-notifications.html": "/notifications",
  "s15-author-works.html": "/author-works",
  "s16-author-studio.html": "/author-studio",
  "s17-publish-chapter.html": "/publish-chapter",
  "s18-schedule-commitment.html": "/schedule-commitment",
  "s19-admin-dashboard.html": "/admin-dashboard",
  "s20-content-moderation.html": "/content-moderation",
  "s21-reports.html": "/reports",
  "/auth": "/auth",
  "/auth/recovery": "/auth/recovery",
  "/dashboard": "/dashboard",
  "/discover": "/discover",
  "/story-detail": "/story-detail",
  "/reader-mode": "/reader-mode",
  "/forum": "/forum",
  "/membership": "/membership",
  "/payment-result": "/payment-result",
  "/library": "/library",
  "/profile": "/profile",
  "/account-settings": "/account-settings",
  "/notifications": "/notifications",
  "/author-works": "/author-works",
  "/author-studio": "/author-studio",
  "/publish-chapter": "/publish-chapter",
  "/schedule-commitment": "/schedule-commitment",
  "/admin-dashboard": "/admin-dashboard",
  "/content-moderation": "/content-moderation",
  "/reports": "/reports",
};

function normalizeRoute(target: string) {
  const cleanTarget = target.replace(/^\//, "");
  return legacyRoutes[cleanTarget] ?? legacyRoutes[`${cleanTarget}.html`] ?? target;
}

function showToast(message: string, type = "success") {
  let stack = document.querySelector<HTMLElement>("[data-runtime-toast-stack]");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "toast-stack";
    stack.dataset.runtimeToastStack = "true";
    document.body.appendChild(stack);
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type} toast-${type}`;
  toast.innerHTML = `<strong>${type === "warning" ? "Cần chú ý" : "YAG"}</strong><span>${message}</span>`;
  stack.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
    if (stack && stack.childElementCount === 0) stack.remove();
  }, 3600);
}

function updatePasswordRules(input: HTMLInputElement) {
  const id = input.dataset.passwordCheck;
  if (!id) return;

  const rules = document.querySelector<HTMLElement>(`[data-password-rules="${id}"]`);
  if (!rules) return;

  const value = input.value;
  const checks: Record<string, boolean> = {
    length: value.length >= 8,
    mixed: /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value),
    special: /[^A-Za-z0-9]/.test(value),
  };

  Object.entries(checks).forEach(([key, valid]) => {
    const row = rules.querySelector<HTMLElement>(`[data-rule="${key}"]`);
    if (!row) return;
    row.classList.toggle("valid", valid);
    const icon = row.querySelector(".rule-icon");
    if (icon) icon.textContent = valid ? "✓" : "×";
  });
}

function activateTab(trigger: HTMLElement) {
  const tabId = trigger.dataset.tabTrigger;
  if (!tabId) return;

  let scope: HTMLElement | null = trigger.closest(".panel, .auth-window, .ai-sidebar, .reader-page, .studio-page");
  while (scope && !scope.querySelector(`[data-tab-panel="${tabId}"]`)) {
    scope = scope.parentElement;
  }
  if (!scope) return;

  scope.querySelectorAll<HTMLElement>("[data-tab-trigger]").forEach((item) => {
    item.classList.toggle("active", item === trigger);
  });
  scope.querySelectorAll<HTMLElement>("[data-tab-panel]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.tabPanel === tabId);
  });
}

function openModal(id: string) {
  document.querySelector<HTMLElement>(`[data-modal="${id}"]`)?.classList.add("open");
}

function closeModal(target: HTMLElement) {
  target.closest<HTMLElement>(".modal-backdrop")?.classList.remove("open");
}

function updateReaderFont(input: HTMLInputElement) {
  const content = document.querySelector<HTMLElement>(".reader-content");
  if (!content) return;
  content.style.setProperty("--reader-font-size", `${input.value}px`);
  content.querySelectorAll<HTMLElement>("p").forEach((paragraph) => {
    paragraph.style.fontSize = `${input.value}px`;
  });
}

function toggleReaderTheme() {
  const page = document.querySelector<HTMLElement>(".reader-page");
  if (!page) return;
  page.classList.toggle("reader-dark");
}

function toggleReaderWidth() {
  const page = document.querySelector<HTMLElement>(".reader-page");
  if (!page) return;
  page.classList.toggle("reader-wide");
}

function applyEditorControl(target: HTMLElement) {
  const editor = document.querySelector<HTMLTextAreaElement>(".editor-body");
  if (!editor) return;

  if (target.matches("[data-editor-font]")) editor.style.fontFamily = (target as HTMLSelectElement).value;
  if (target.matches("[data-editor-size]")) editor.style.fontSize = (target as HTMLSelectElement).value;
  if (target.matches("[data-editor-line]")) editor.style.lineHeight = (target as HTMLSelectElement).value;
}

function toggleEditorFormat(button: HTMLElement) {
  const format = button.dataset.formatToggle;
  const editor = document.querySelector<HTMLElement>(".editor-body");
  if (!format || !editor) return;

  button.classList.toggle("active");
  if (format === "bold") editor.style.fontWeight = button.classList.contains("active") ? "700" : "";
  if (format === "italic") editor.style.fontStyle = button.classList.contains("active") ? "italic" : "";
  if (format === "underline") editor.style.textDecoration = button.classList.contains("active") ? "underline" : "";
  if (format === "highlight") editor.classList.toggle("editor-highlighted", button.classList.contains("active"));
}

export function ClientInteractions() {
  const router = useRouter();

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const navigateTarget = target.closest<HTMLElement>("[data-navigate]");
      if (navigateTarget?.dataset.navigate) {
        event.preventDefault();
        router.push(normalizeRoute(navigateTarget.dataset.navigate));
      }

      const billingTarget = target.closest<HTMLElement>("[data-billing-plan]");
      if (billingTarget?.dataset.billingPlan && !appEnv.useMocks) {
        event.preventDefault();
        showToast("Đang tạo phiên thanh toán VNPAY...", "success");
        void yagApi.billing
          .createVnpayCheckout({
            planCode: billingTarget.dataset.billingPlan,
            returnUrl: `${window.location.origin}/payment-result`,
          })
          .then((result) => {
            window.location.href = result.data.paymentUrl;
          })
          .catch(() => {
            showToast("Không thể tạo phiên thanh toán. Vui lòng thử lại sau.", "warning");
          });
      }

      const toastTarget = target.closest<HTMLElement>("[data-toast]");
      if (toastTarget?.dataset.toast) {
        showToast(toastTarget.dataset.toast, toastTarget.dataset.toastType ?? "success");
      }

      const tabTrigger = target.closest<HTMLElement>("[data-tab-trigger]");
      if (tabTrigger) activateTab(tabTrigger);

      const modalOpen = target.closest<HTMLElement>("[data-modal-open]");
      if (modalOpen?.dataset.modalOpen) openModal(modalOpen.dataset.modalOpen);

      if (target.closest("[data-modal-close]")) closeModal(target);

      const sidebarOpen = target.closest("[data-sidebar-open]");
      if (sidebarOpen) document.querySelector(".prototype-sidebar")?.classList.add("open");

      const sidebarClose = target.closest("[data-sidebar-close]");
      if (sidebarClose) document.querySelector(".prototype-sidebar")?.classList.remove("open");

      const passwordToggle = target.closest<HTMLElement>("[data-password-toggle]");
      if (passwordToggle) {
        const input = passwordToggle.parentElement?.querySelector<HTMLInputElement>("[data-password-input]");
        if (input) input.type = input.type === "password" ? "text" : "password";
      }

      if (target.closest("[data-reader-theme-toggle]")) toggleReaderTheme();
      if (target.closest("[data-reader-width-toggle]")) toggleReaderWidth();

      const formatToggle = target.closest<HTMLElement>("[data-format-toggle]");
      if (formatToggle) toggleEditorFormat(formatToggle);
    };

    const handleInput = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      if (target.matches("[data-password-input]")) updatePasswordRules(target as HTMLInputElement);
      if (target.matches("[data-reader-range]")) updateReaderFont(target as HTMLInputElement);
      applyEditorControl(target);
    };

    const closeOnBackdrop = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.classList.contains("modal-backdrop")) target.classList.remove("open");
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        document.querySelectorAll(".modal-backdrop.open").forEach((modal) => modal.classList.remove("open"));
      }
    };

    const protectReaderContent = (event: Event) => {
      if ((event.target as HTMLElement | null)?.closest(".reader-content")) {
        event.preventDefault();
      }
    };

    document.addEventListener("click", handleClick);
    document.addEventListener("click", closeOnBackdrop);
    document.addEventListener("input", handleInput);
    document.addEventListener("change", handleInput);
    document.addEventListener("keydown", handleEscape);
    document.addEventListener("copy", protectReaderContent);
    document.addEventListener("cut", protectReaderContent);
    document.addEventListener("contextmenu", protectReaderContent);

    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("click", closeOnBackdrop);
      document.removeEventListener("input", handleInput);
      document.removeEventListener("change", handleInput);
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("copy", protectReaderContent);
      document.removeEventListener("cut", protectReaderContent);
      document.removeEventListener("contextmenu", protectReaderContent);
    };
  }, [router]);

  return null;
}
