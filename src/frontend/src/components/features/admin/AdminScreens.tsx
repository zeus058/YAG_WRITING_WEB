"use client";

import React, { useState, useEffect } from "react";
import { BarChart, LineChart, MetricCard } from "@/components/ui";
import { AppShell } from "@/components/layout";
import { yagApi, appEnv } from "@/lib";

const triggerLiveToast = (message: string, type = "success") => {
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
};

export function AdminDashboardScreen() {
  const [stats, setStats] = useState<any>({
    active_readers_count: 1284,
    pending_moderations_count: 38,
    total_revenue_vnd: 84000000,
    violation_alerts_count: 7,
  });
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboard = async () => {
    try {
      if (appEnv.useMocks) {
        setIsLoading(false);
        return;
      }
      const [statsRes, alertsRes] = await Promise.all([
        yagApi.apiFetch<any>("/api/v1/admin/stats"),
        yagApi.apiFetch<any[]>("/api/v1/admin/schedule-alerts"),
      ]);
      setStats(statsRes.data);
      setAlerts(alertsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const formatVnd = (val: number) => {
    return val >= 1000000 ? `${(val / 1000000).toFixed(0)}M` : `${val}đ`;
  };

  return (
    <AppShell activeId="s19">
      <section className="metric-grid">
        <MetricCard label="Người dùng mới" value={String(stats.active_readers_count)} change="+12%" />
        <MetricCard label="Chương chờ duyệt" value={String(stats.pending_moderations_count)} change="Cần xử lý" />
        <MetricCard label="Doanh thu tháng" value={formatVnd(stats.total_revenue_vnd || 84000000)} change="+18%" />
        <MetricCard label="Cảnh báo vi phạm" value={String(stats.violation_alerts_count)} change="Ưu tiên cao" />
      </section>
      <section className="action-strip" style={{ marginTop: 24 }}>
        <div>
          <strong>Hệ thống ổn định</strong>
          <div className="list-meta">Hàng đợi kiểm duyệt AI đang vận hành bình thường.</div>
        </div>
        <button className="button" onClick={loadDashboard}>Làm mới dữ liệu</button>
      </section>
      <section className="layout-right" style={{ marginTop: 24 }}>
        <div className="panel panel-pad">
          <h2 className="section-title">Xu hướng doanh thu</h2>
          <LineChart />
        </div>
        <div className="panel panel-pad stack">
          <h2 className="section-title">Thông báo lịch đăng trễ</h2>
          {isLoading ? (
            <div>Đang tải...</div>
          ) : alerts.length === 0 ? (
            <div style={{ color: "var(--muted)" }}>Không có cảnh báo trễ lịch đăng nào.</div>
          ) : (
            <div className="list">
              {alerts.map((item) => (
                <div className="list-item" key={item.id}>
                  <div>
                    <h3 className="list-title">{item.message}</h3>
                    <div className="list-meta">Tác giả bị trừ điểm uy tín.</div>
                  </div>
                  <span className="badge badge-red">Trễ hạn</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}

export function ModerationScreen() {
  const [queue, setQueue] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadQueue = async () => {
    try {
      if (appEnv.useMocks) {
        const mockQueue = [
          { id: "c1", title: "Bóng Đêm Sau Cửa Sổ", story: { title: "Mưa Trên Thành Cũ" }, author: { username: "Linh An" }, moderation_status: "flagged", reason: "Bạo lực mô tả chi tiết" }
        ];
        setQueue(mockQueue);
        setSelectedItem(mockQueue[0]);
        setIsLoading(false);
        return;
      }
      const res = await yagApi.admin.moderationQueue();
      const items = res.data || [];
      setQueue(items);
      if (items.length > 0) setSelectedItem(items[0]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadQueue();
  }, []);

  const handleApprove = async () => {
    if (!selectedItem) return;
    setSubmitting(true);
    try {
      if (appEnv.useMocks) {
        triggerLiveToast("Đã duyệt chương (Mock).");
        void loadQueue();
        return;
      }
      await yagApi.apiFetch(`/api/v1/admin/moderation/${selectedItem.id}/approve`, {
        method: "POST",
        body: { reason: reason || "Admin duyệt thủ công" }
      });
      triggerLiveToast("Đã phê duyệt chương thành công!");
      setReason("");
      void loadQueue();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedItem) return;
    setSubmitting(true);
    try {
      if (appEnv.useMocks) {
        triggerLiveToast("Đã từ chối chương (Mock).");
        void loadQueue();
        return;
      }
      await yagApi.apiFetch(`/api/v1/admin/moderation/${selectedItem.id}/reject`, {
        method: "POST",
        body: { reason: reason || "Vi phạm quy chế cộng đồng" }
      });
      triggerLiveToast("Đã từ chối chương truyện.", "warning");
      setReason("");
      void loadQueue();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell activeId="s20">
      <section className="layout-right">
        <main className="panel panel-pad stack">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Chương</th>
                  <th>Truyện</th>
                  <th>Lý do hệ thống</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={4}>Đang tải danh sách chờ duyệt...</td></tr>
                ) : queue.length === 0 ? (
                  <tr><td colSpan={4}>Hàng đợi trống. Không có chương nào chờ kiểm duyệt.</td></tr>
                ) : (
                  queue.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      style={{ cursor: "pointer", background: selectedItem?.id === item.id ? "rgba(255, 255, 255, 0.05)" : "" }}
                    >
                      <td>{item.title}</td>
                      <td>{item.story?.title || "Không rõ"}</td>
                      <td>{item.reason || "Cần quét bộ lọc"}</td>
                      <td><span className="badge badge-amber">{item.moderation_status}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </main>
        <aside className="panel panel-pad stack">
          <h2 className="section-title">Quyết định kiểm duyệt</h2>
          {selectedItem ? (
            <>
              <span className="badge badge-red">Gắn cờ: {selectedItem.reason || "Cần đánh giá nội dung"}</span>
              <p className="section-subtitle">Chương: {selectedItem.title}</p>
              <div className="field" style={{ marginTop: 12 }}>
                <label>Lý do quyết định (gửi cho tác giả)</label>
                <textarea className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Nhập lý do duyệt/từ chối..." required />
              </div>
              <div className="inline-actions" style={{ gap: 12, marginTop: 16 }}>
                <button className="button button-success" onClick={handleApprove} disabled={submitting}>Duyệt thông qua</button>
                <button className="button button-danger" onClick={handleReject} disabled={submitting}>Từ chối</button>
              </div>
            </>
          ) : (
            <div style={{ color: "var(--muted)" }}>Chọn một chương trong hàng đợi để kiểm duyệt.</div>
          )}
        </aside>
      </section>
    </AppShell>
  );
}

export function ReportsScreen() {
  return (
    <AppShell activeId="s21">
      <section className="panel panel-pad stack">
        <div className="inline-actions" style={{ justifyContent: "space-between" }}>
          <div className="tabs">
            <button className="tab-button active">Báo cáo doanh thu & Người dùng</button>
          </div>
        </div>
        <div className="tab-panel active">
          <BarChart />
        </div>
      </section>
    </AppShell>
  );
}
