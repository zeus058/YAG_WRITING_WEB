"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MetricCard } from "@/components/ui";
import { AppShell } from "@/components/layout";
import { yagApi } from "@/lib";

type AdminStats = {
  users_total: number;
  users_new_7d: number;
  users_locked: number;
  stories_total: number;
  chapters_total: number;
  premium_revenue_total: number;
  premium_revenue_30d: number;
  moderation_pending: number;
  moderation_flagged: number;
  moderation_rejected: number;
  moderation_approved: number;
  unresolved_admin_alerts: number;
  audit_logs_total: number;
};

type RevenuePoint = {
  label: string;
  revenue: number;
  revenue_vnd: number;
  memberships: number;
};

type ScheduleAlert = {
  id: string;
  severity?: string;
  message: string;
  is_resolved?: boolean;
  created_at?: string;
};

type AuditLog = {
  id: string;
  action: string;
  target_type: string;
  target_id: string;
  reason?: string;
  created_at?: string;
};

type ModerationStatus = "pending" | "flagged" | "rejected" | "approved";
type ModerationDecision = Exclude<ModerationStatus, "pending">;

type ModerationItem = {
  id?: string;
  chapter_id?: string;
  story_id?: string;
  chapter_number?: number;
  title: string;
  content?: string;
  moderation_status: ModerationStatus;
  reason?: string;
  violation_category?: string | null;
  confidence_score?: number | null;
  is_violation?: boolean | null;
  model_name?: string | null;
  updated_at?: string;
  story?: { title?: string };
  author?: { username?: string };
};

type ReportType = "revenue" | "users" | "content";

type ReportRow = {
  label: string;
  revenue: number;
  revenue_vnd: number;
  memberships: number;
  users: number;
  content: number;
};

const DEFAULT_STATS: AdminStats = {
  users_total: 0,
  users_new_7d: 0,
  users_locked: 0,
  stories_total: 0,
  chapters_total: 0,
  premium_revenue_total: 0,
  premium_revenue_30d: 0,
  moderation_pending: 0,
  moderation_flagged: 0,
  moderation_rejected: 0,
  moderation_approved: 0,
  unresolved_admin_alerts: 0,
  audit_logs_total: 0,
};



const reportTabs: { id: ReportType; label: string; metricLabel: string }[] = [
  { id: "revenue", label: "Doanh thu", metricLabel: "Doanh thu" },
  { id: "users", label: "Người dùng", metricLabel: "Người dùng mới" },
  { id: "content", label: "Nội dung", metricLabel: "Chương mới" },
];

function triggerLiveToast(message: string, type = "success") {
  if (typeof window === "undefined") return;
  let stack = document.querySelector<HTMLElement>("[data-runtime-toast-stack]");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "toast-stack";
    stack.dataset.runtimeToastStack = "true";
    document.body.appendChild(stack);
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type} toast-${type}`;
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
}

function formatNumber(value: number | undefined | null) {
  return Number(value || 0).toLocaleString("vi-VN");
}

function formatMillionVnd(value: number | undefined | null) {
  const million = Number(value || 0);
  if (million <= 0) return "0đ";
  return `${formatNumber(million)} triệu`;
}

function formatVnd(value: number | undefined | null) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function formatDateTime(value?: string) {
  if (!value) return "Chưa có thời gian";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có thời gian";
  return date.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

function getItemId(item: ModerationItem | null) {
  return item?.chapter_id || item?.id || "";
}

function statusLabel(status: string) {
  switch (status) {
    case "pending":
      return "Chờ duyệt";
    case "flagged":
      return "Cần xem xét";
    case "rejected":
      return "Đã từ chối";
    case "approved":
      return "Đã duyệt";
    default:
      return status || "Không rõ";
  }
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "approved":
      return "badge-green";
    case "pending":
      return "badge-blue";
    case "rejected":
      return "badge-red";
    default:
      return "badge-amber";
  }
}

function ReportBars({ rows, type }: { rows: ReportRow[]; type: ReportType }) {
  const values = rows.map((row) => {
    if (type === "revenue") return row.revenue_vnd;
    if (type === "users") return row.users;
    return row.content;
  });
  const max = Math.max(...values, 1);

  return (
    <div className="admin-bars" aria-label="Biểu đồ báo cáo">
      {rows.map((row, index) => {
        const value = values[index] || 0;
        return (
          <div className="admin-bar-row" key={`${row.label}-${index}`}>
            <span>{row.label}</span>
            <div className="admin-bar-track">
              <div className="admin-bar-fill" style={{ width: `${Math.max((value / max) * 100, value > 0 ? 6 : 0)}%` }} />
            </div>
            <strong>{type === "revenue" ? formatVnd(row.revenue_vnd) : formatNumber(value)}</strong>
          </div>
        );
      })}
    </div>
  );
}

function RevenueTrend({ rows }: { rows: RevenuePoint[] }) {
  const max = Math.max(...rows.map((row) => row.revenue_vnd), 1);

  return (
    <div className="admin-trend-grid" aria-label="Xu hướng doanh thu">
      {rows.map((row) => (
        <div className="admin-trend-item" key={row.label}>
          <div className="admin-trend-column" style={{ height: `${Math.max((row.revenue_vnd / max) * 100, row.revenue_vnd > 0 ? 8 : 0)}%` }} />
          <span>{row.label}</span>
          <strong>{formatNumber(row.memberships)}</strong>
        </div>
      ))}
    </div>
  );
}

export function AdminDashboardScreen() {
  const [stats, setStats] = useState<AdminStats>(DEFAULT_STATS);
  const [alerts, setAlerts] = useState<ScheduleAlert[]>([]);
  const [revenueSeries, setRevenueSeries] = useState<RevenuePoint[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    setIsLoading(true);
    setError("");
    try {


      const [statsRes, alertsRes, revenueRes, logsRes] = await Promise.all([
        yagApi.admin.stats(),
        yagApi.admin.scheduleAlerts(),
        yagApi.admin.revenueSeries("month"),
        yagApi.admin.auditLogs(),
      ]);

      setStats({ ...DEFAULT_STATS, ...statsRes.data });
      setAlerts(alertsRes.data || []);
      setRevenueSeries(revenueRes.data.series || []);
      setAuditLogs(logsRes.data || []);
    } catch (err) {
      console.error(err);
      setError("Không tải được dữ liệu quản trị. Vui lòng kiểm tra kết nối backend hoặc đăng nhập lại bằng tài khoản admin.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();

    const handleAdminAlert = (e: Event) => {
      const customEvent = e as CustomEvent;
      const message = customEvent.detail;
      if (message) {
        const newAlert: ScheduleAlert = {
          id: message.alert_id || String(Date.now()),
          severity: message.severity || "warning",
          message: message.message || "Missed publish schedule warning",
          is_resolved: false,
          created_at: new Date().toISOString()
        };
        setAlerts((prev) => [newAlert, ...prev]);
        setStats((prev) => ({
          ...prev,
          unresolved_admin_alerts: (prev.unresolved_admin_alerts || 0) + 1
        }));
      }
    };

    window.addEventListener("yag.admin.alert", handleAdminAlert);
    return () => {
      window.removeEventListener("yag.admin.alert", handleAdminAlert);
    };
  }, []);

  const handleScheduleScan = async () => {
    setIsScanning(true);
    setError("");
    try {
      await yagApi.admin.runScheduleScan();
      triggerLiveToast("Đã quét lịch đăng và cập nhật cảnh báo.");
      await loadDashboard();
    } catch (err) {
      console.error(err);
      setError("Không thể chạy quét lịch đăng lúc này.");
    } finally {
      setIsScanning(false);
    }
  };

  const moderationTotal = stats.moderation_pending + stats.moderation_flagged + stats.moderation_rejected;

  return (
    <AppShell
      activeId="s19"
      actions={
        <div className="admin-toolbar admin-toolbar-actions-only">
          <div className="inline-actions">
            <button className="button" type="button" onClick={loadDashboard} disabled={isLoading}>
              {isLoading ? "Đang tải..." : "Làm mới"}
            </button>
            <button className="button button-primary" type="button" onClick={handleScheduleScan} disabled={isScanning}>
              {isScanning ? "Đang quét..." : "Quét lịch đăng"}
            </button>
          </div>
        </div>
      }
    >
      {error ? <div className="form-message error" role="alert">{error}</div> : null}

      <section className="metric-grid admin-metric-grid">
        <MetricCard label="Người dùng toàn hệ thống" value={formatNumber(stats.users_total)} change={`+${formatNumber(stats.users_new_7d)} trong 7 ngày`} />
        <MetricCard label="Tác phẩm / chương" value={`${formatNumber(stats.stories_total)} / ${formatNumber(stats.chapters_total)}`} change="Kho nội dung đang hoạt động" />
        <MetricCard label="Doanh thu 30 ngày" value={formatMillionVnd(stats.premium_revenue_30d)} change={`${formatMillionVnd(stats.premium_revenue_total)} lũy kế`} />
        <MetricCard label="Cần quản trị xử lý" value={formatNumber(moderationTotal + stats.unresolved_admin_alerts)} change={`${formatNumber(stats.users_locked)} tài khoản bị khóa`} />
      </section>

      <section className="admin-health-strip">
        <div>
          <strong>Trạng thái vận hành</strong>
          <span>{stats.moderation_pending > 0 ? "Có chương đang chờ kiểm duyệt, nên xử lý trước khi public." : "Hàng đợi kiểm duyệt đang ổn định."}</span>
        </div>
        <div className="admin-health-pills">
          <span className="badge badge-blue">{formatNumber(stats.moderation_pending)} chờ duyệt</span>
          <span className="badge badge-amber">{formatNumber(stats.moderation_flagged)} cần xem xét</span>
          <span className="badge badge-red">{formatNumber(stats.unresolved_admin_alerts)} cảnh báo</span>
        </div>
      </section>

      <section className="admin-dashboard-grid">
        <div className="panel panel-pad stack">
          <div className="section-heading">
            <div>
              <h2 className="section-title">Xu hướng membership</h2>
              <p className="section-subtitle">Doanh thu và số lượt nâng cấp gần đây.</p>
            </div>
            <Link className="button" href="/admin/stats">Xem báo cáo</Link>
          </div>
          {revenueSeries.length === 0 ? (
            <div className="empty-state">Chưa có giao dịch thành công trong kỳ này.</div>
          ) : (
            <RevenueTrend rows={revenueSeries} />
          )}
        </div>

        <div className="panel panel-pad stack">
          <div className="section-heading">
            <div>
              <h2 className="section-title">Cảnh báo lịch đăng</h2>
              <p className="section-subtitle">Các cam kết xuất bản cần admin theo dõi.</p>
            </div>
          </div>
          {isLoading ? (
            <div>Đang tải cảnh báo...</div>
          ) : alerts.length === 0 ? (
            <div className="empty-state">Không có cảnh báo trễ lịch đăng.</div>
          ) : (
            <div className="list admin-alert-list">
              {alerts.slice(0, 5).map((item) => (
                <div className="list-item" key={item.id}>
                  <div>
                    <h3 className="list-title">{item.message}</h3>
                    <div className="list-meta">{formatDateTime(item.created_at)}</div>
                  </div>
                  <span className={`badge ${item.severity === "critical" ? "badge-red" : "badge-amber"}`}>
                    {item.severity === "critical" ? "Khẩn cấp" : "Theo dõi"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel panel-pad stack admin-wide-panel">
          <div className="section-heading">
            <div>
              <h2 className="section-title">Nhật ký thao tác gần đây</h2>
              <p className="section-subtitle">Dùng để truy vết quyết định kiểm duyệt và quản trị tài khoản.</p>
            </div>
          </div>
          {auditLogs.length === 0 ? (
            <div className="empty-state">Chưa có thao tác admin nào được ghi nhận.</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table admin-compact-table">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Hành động</th>
                    <th>Đối tượng</th>
                    <th>Lý do</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.slice(0, 6).map((log) => (
                    <tr key={log.id}>
                      <td>{formatDateTime(log.created_at)}</td>
                      <td>{log.action}</td>
                      <td>{log.target_type}</td>
                      <td>{log.reason || "Không có ghi chú"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}

export function ModerationScreen() {
  const [queue, setQueue] = useState<ModerationItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [reason, setReason] = useState("");
  const [filter, setFilter] = useState<"all" | ModerationStatus>("all");
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState<"" | ModerationDecision>("");
  const [error, setError] = useState("");

  const selectedItem = useMemo(() => queue.find((item) => getItemId(item) === selectedId) || queue[0] || null, [queue, selectedId]);

  const filteredQueue = useMemo(() => {
    const text = query.trim().toLowerCase();
    return queue.filter((item) => {
      if (filter !== "all" && item.moderation_status !== filter) return false;
      if (!text) return true;
      const haystack = [item.title, item.story?.title, item.author?.username, item.reason, item.content].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(text);
    });
  }, [queue, filter, query]);

  const loadQueue = async () => {
    setIsLoading(true);
    setError("");
    try {

      const res = await yagApi.admin.moderationQueue();
      const items = (res.data || []) as ModerationItem[];
      setQueue(items);
      setSelectedId((current) => current && items.some((item) => getItemId(item) === current) ? current : getItemId(items[0] || null));
    } catch (err) {
      console.error(err);
      setError("Không tải được hàng đợi kiểm duyệt. Hãy kiểm tra quyền admin hoặc backend.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadQueue();
  }, []);

  const submitDecision = async (decision: ModerationDecision) => {
    const chapterId = getItemId(selectedItem);
    if (!chapterId || !selectedItem) return;
    if (decision !== "approved" && reason.trim().length < 3) {
      setError("Vui lòng nhập lý do tối thiểu 3 ký tự khi từ chối hoặc gắn cờ chương.");
      return;
    }

    setSubmitting(decision);
    setError("");
    try {
      await yagApi.admin.overrideModeration(chapterId, {
        decision,
        reason: reason.trim() || (decision === "approved" ? "Admin duyệt thủ công sau khi kiểm tra nội dung." : "Vi phạm quy chế cộng đồng."),
        violation_category: decision === "approved" ? null : "admin_review",
        confidence_score: 1,
      });

      triggerLiveToast(
        decision === "approved"
          ? "Đã duyệt chương truyện."
          : decision === "flagged"
            ? "Đã giữ chương ở trạng thái cần xem xét."
            : "Đã từ chối chương truyện.",
        decision === "approved" ? "success" : "warning"
      );
      setReason("");
      await loadQueue();
    } catch (err) {
      console.error(err);
      setError("Không thể gửi quyết định kiểm duyệt. Vui lòng thử lại.");
    } finally {
      setSubmitting("");
    }
  };

  const statusCounts = queue.reduce<Record<string, number>>((acc, item) => {
    acc[item.moderation_status] = (acc[item.moderation_status] || 0) + 1;
    return acc;
  }, {});

  return (
    <AppShell
      activeId="s20"
      actions={
        <div className="admin-toolbar admin-toolbar-actions-only">
          <div className="inline-actions">
            <button className="button" type="button" onClick={loadQueue} disabled={isLoading}>
              {isLoading ? "Đang tải..." : "Làm mới hàng đợi"}
            </button>
          </div>
        </div>
      }
    >
      {error ? <div className="form-message error" role="alert">{error}</div> : null}

      <section className="admin-moderation-layout">
        <main className="panel panel-pad stack">
          <div className="section-heading">
            <div>
              <h2 className="section-title">Hàng đợi kiểm duyệt AI</h2>
              <p className="section-subtitle">Ưu tiên chương bị gắn cờ trước khi chương được hiển thị công khai.</p>
            </div>
          </div>

          <div className="admin-filter-row">
            <div className="tabs" role="tablist" aria-label="Lọc trạng thái kiểm duyệt">
              {[
                { id: "all", label: "Tất cả", count: queue.length },
                { id: "pending", label: "Chờ duyệt", count: statusCounts.pending || 0 },
                { id: "flagged", label: "Cần xem xét", count: statusCounts.flagged || 0 },
                { id: "rejected", label: "Từ chối", count: statusCounts.rejected || 0 },
              ].map((item) => (
                <button
                  key={item.id}
                  className={`tab-button ${filter === item.id ? "active" : ""}`}
                  type="button"
                  onClick={() => setFilter(item.id as typeof filter)}
                >
                  {item.label} <span>{item.count}</span>
                </button>
              ))}
            </div>
            <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm chương, truyện, tác giả..." />
          </div>

          <div className="table-wrap">
            <table className="data-table admin-moderation-table">
              <thead>
                <tr>
                  <th>Nội dung</th>
                  <th>Đánh giá hệ thống</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={3}>Đang tải danh sách chờ duyệt...</td></tr>
                ) : filteredQueue.length === 0 ? (
                  <tr><td colSpan={3}>Không có chương nào phù hợp với bộ lọc hiện tại.</td></tr>
                ) : (
                  filteredQueue.map((item) => {
                    const itemId = getItemId(item);
                    return (
                      <tr
                        key={itemId}
                        onClick={() => setSelectedId(itemId)}
                        className={getItemId(selectedItem) === itemId ? "selected-row" : ""}
                      >
                        <td>
                          <strong>{item.title}</strong>
                          <div className="list-meta">
                            {item.story?.title || item.story_id || "Không rõ truyện"} · Chương {item.chapter_number || "?"}
                          </div>
                        </td>
                        <td>
                          <strong>{item.reason || "Cần admin đánh giá ngữ cảnh"}</strong>
                          <div className="list-meta">
                            {item.violation_category || "policy_review"} · {item.confidence_score != null ? `${Math.round(item.confidence_score * 100)}%` : "chưa có điểm"} · {formatDateTime(item.updated_at)}
                          </div>
                        </td>
                        <td><span className={`badge ${statusBadgeClass(item.moderation_status)}`}>{statusLabel(item.moderation_status)}</span></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </main>

        <aside className="panel panel-pad stack admin-decision-panel">
          <div>
            <h2 className="section-title">Quyết định kiểm duyệt</h2>
            <p className="section-subtitle">Quyết định này được ghi vào audit log và gửi trạng thái về tác giả.</p>
          </div>

          {selectedItem ? (
            <>
              <div className="admin-selected-summary">
                <span className={`badge ${statusBadgeClass(selectedItem.moderation_status)}`}>{statusLabel(selectedItem.moderation_status)}</span>
                <h3>{selectedItem.title}</h3>
                <p>{selectedItem.story?.title || "Truyện chưa xác định"} · Chương {selectedItem.chapter_number || "?"}</p>
              </div>

              <div className="admin-ai-report">
                <div>
                  <span>AI confidence</span>
                  <strong>{selectedItem.confidence_score != null ? `${Math.round(selectedItem.confidence_score * 100)}%` : "Chưa có"}</strong>
                </div>
                <div>
                  <span>Category</span>
                  <strong>{selectedItem.violation_category || "policy_review"}</strong>
                </div>
                <div>
                  <span>Model</span>
                  <strong>{selectedItem.model_name || "Gemini / fallback"}</strong>
                </div>
              </div>

              <div className="field">
                <label>Nội dung chương</label>
                <div className="admin-content-preview">
                  {selectedItem.content || "Không có nội dung để xem trước."}
                </div>
              </div>

              <div className="field">
                <label>Lý do gửi cho tác giả</label>
                <textarea
                  className="textarea"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ví dụ: Chương được duyệt sau khi kiểm tra ngữ cảnh, hoặc mô tả rõ điểm vi phạm cần chỉnh sửa."
                />
                <span className="field-note">Bắt buộc khi gắn cờ hoặc từ chối. Nội dung nên rõ ràng, lịch sự và có thể hành động.</span>
              </div>

              <div className="admin-decision-actions">
                <button className="button button-success" type="button" onClick={() => submitDecision("approved")} disabled={Boolean(submitting)}>
                  {submitting === "approved" ? "Đang duyệt..." : "Duyệt"}
                </button>
                <button className="button" type="button" onClick={() => submitDecision("flagged")} disabled={Boolean(submitting)}>
                  {submitting === "flagged" ? "Đang giữ..." : "Giữ xem xét"}
                </button>
                <button className="button button-danger" type="button" onClick={() => submitDecision("rejected")} disabled={Boolean(submitting)}>
                  {submitting === "rejected" ? "Đang từ chối..." : "Từ chối"}
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state">Chọn một chương trong hàng đợi để kiểm duyệt.</div>
          )}
        </aside>
      </section>
    </AppShell>
  );
}

export function ReportsScreen() {
  const today = new Date();
  const start = new Date();
  start.setDate(today.getDate() - 30);

  const [activeType, setActiveType] = useState<ReportType>("revenue");
  const [fromDate, setFromDate] = useState(start.toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(today.toISOString().slice(0, 10));
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReport = async () => {
    setIsLoading(true);
    setError("");
    try {


      const [reportRes, logsRes] = await Promise.all([
        yagApi.admin.reports({ from: fromDate, to: toDate, type: activeType }),
        yagApi.admin.auditLogs(),
      ]);
      setRows(reportRes.data.rows || []);
      setAuditLogs(logsRes.data || []);
    } catch (err) {
      console.error(err);
      setError("Không tải được báo cáo. Vui lòng kiểm tra khoảng ngày hoặc quyền admin.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadReport();
  }, [activeType]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => ({
        revenue: acc.revenue + Number(row.revenue_vnd || 0),
        memberships: acc.memberships + Number(row.memberships || 0),
        users: acc.users + Number(row.users || 0),
        content: acc.content + Number(row.content || 0),
      }),
      { revenue: 0, memberships: 0, users: 0, content: 0 }
    );
  }, [rows]);

  const activeTab = reportTabs.find((tab) => tab.id === activeType) || reportTabs[0];

  return (
    <AppShell
      activeId="s21"
      actions={
        <div className="admin-toolbar admin-toolbar-actions-only">
          <div className="inline-actions">
            <button className="button" type="button" onClick={loadReport} disabled={isLoading}>
              {isLoading ? "Đang tải..." : "Cập nhật báo cáo"}
            </button>
          </div>
        </div>
      }
    >
      {error ? <div className="form-message error" role="alert">{error}</div> : null}

      <section className="panel panel-pad stack">
        <div className="section-heading">
          <div>
            <h2 className="section-title">Báo cáo vận hành</h2>
            <p className="section-subtitle">Theo dõi doanh thu membership, tăng trưởng người dùng, nội dung mới và audit log admin.</p>
          </div>
        </div>

        <div className="admin-report-controls">
          <div className="tabs" role="tablist" aria-label="Loại báo cáo">
            {reportTabs.map((tab) => (
              <button
                key={tab.id}
                className={`tab-button ${activeType === tab.id ? "active" : ""}`}
                type="button"
                onClick={() => setActiveType(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="admin-date-controls">
            <label>
              Từ ngày
              <input className="input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </label>
            <label>
              Đến ngày
              <input className="input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </label>
            <button className="button button-primary" type="button" onClick={loadReport} disabled={isLoading}>
              Áp dụng
            </button>
          </div>
        </div>

        <section className="metric-grid admin-metric-grid">
          <MetricCard label="Doanh thu" value={formatVnd(totals.revenue)} change={`${formatNumber(totals.memberships)} gói membership`} />
          <MetricCard label="Người dùng mới" value={formatNumber(totals.users)} change="Theo kỳ đã chọn" />
          <MetricCard label="Chương mới" value={formatNumber(totals.content)} change="Nội dung phát sinh" />
          <MetricCard label="Audit logs" value={formatNumber(auditLogs.length)} change="100 thao tác gần nhất" />
        </section>

        {isLoading ? (
          <div className="empty-state">Đang tải dữ liệu báo cáo...</div>
        ) : rows.length === 0 ? (
          <div className="empty-state">Không có dữ liệu trong khoảng ngày đã chọn.</div>
        ) : (
          <div className="admin-report-grid">
            <div className="panel panel-pad stack admin-report-chart-panel">
              <h3 className="section-title">{activeTab.metricLabel} theo kỳ</h3>
              <ReportBars rows={rows} type={activeType} />
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Kỳ</th>
                    <th>Doanh thu</th>
                    <th>Membership</th>
                    <th>Người dùng</th>
                    <th>Nội dung</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.label}>
                      <td>{row.label}</td>
                      <td>{formatVnd(row.revenue_vnd)}</td>
                      <td>{formatNumber(row.memberships)}</td>
                      <td>{formatNumber(row.users)}</td>
                      <td>{formatNumber(row.content)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className="panel panel-pad stack" style={{ marginTop: 24 }}>
        <div className="section-heading">
          <div>
            <h2 className="section-title">Audit log quản trị</h2>
            <p className="section-subtitle">Bản ghi thao tác để phục vụ kiểm toán nội bộ và xử lý khiếu nại.</p>
          </div>
        </div>
        {auditLogs.length === 0 ? (
          <div className="empty-state">Chưa có audit log.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table admin-compact-table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Hành động</th>
                  <th>Đối tượng</th>
                  <th>ID</th>
                  <th>Lý do</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{formatDateTime(log.created_at)}</td>
                    <td>{log.action}</td>
                    <td>{log.target_type}</td>
                    <td><code>{log.target_id}</code></td>
                    <td>{log.reason || "Không có ghi chú"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
