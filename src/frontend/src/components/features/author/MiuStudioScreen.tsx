"use client";

import React, { useEffect, useRef, useState } from "react";
import { stories } from "@/data/yag";
import { AppShell, ProductFooter } from "@/components/layout";
import { ApiError, yagApi } from "@/lib/api";
import { Icon, Cover, MetricCard } from "@/components/ui";

type AiMode = "kịch tính" | "lãng mạn" | "bí ẩn";

type AiSuggestion = {
  title: string;
  content: string;
  reason?: string | null;
};

const DEFAULT_DRAFT =
  "Mưa đã ngừng khi An quay lại sân ga. Những ô cửa kính phản chiếu thành phố như một bản thảo chưa kịp sửa, nơi mọi vệt sáng đều giữ lại một lựa chọn cũ.\n\n" +
  "Cô đặt phong bì lên chiếc ghế gỗ dài. Lần này, cô không chờ ai đến nhận thư.";

const MODE_META: Record<AiMode, { label: string; hint: string; button: string }> = {
  "kịch tính": { label: "Kịch tính", hint: "Đẩy xung đột, bí mật và nhịp câu chuyện lên cao.", button: "Gợi ý kịch tính" },
  "lãng mạn": { label: "Lãng mạn", hint: "Tăng cảm xúc và khoảng lặng giữa hai nhân vật.", button: "Gợi ý lãng mạn" },
  "bí ẩn": { label: "Bí ẩn", hint: "Gợi mở dấu vết, manh mối và một cú bẻ lái mới.", button: "Gợi ý bí ẩn" },
};

export function AuthorStudioScreen() {
  const [mode, setMode] = useState<AiMode>("kịch tính");
  const [context, setContext] = useState(DEFAULT_DRAFT);
  const [composerPrompt, setComposerPrompt] = useState("Miu ơi, giúp mình viết đoạn kết chương tạo cảm giác tiếc nuối.");
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const selectionRef = useRef({ start: DEFAULT_DRAFT.length, end: DEFAULT_DRAFT.length });

  const requestSuggestions = async (nextMode: AiMode, extraContext = "") => {
    setMode(nextMode);
    setLoading(true);
    setFeedback(null);

    const mergedContext = extraContext.trim()
      ? `${context}\n\nYêu cầu của tác giả: ${extraContext.trim()}`
      : context;

    try {
      const response = await yagApi.author.requestAiSuggestion({
        chapterId: "chapter-13",
        context: mergedContext,
        mode: nextMode,
      });
      const payload = response.data as {
        suggestions: AiSuggestion[];
        fallback?: boolean;
        message?: string;
      };

      setSuggestions(payload.suggestions);
      setActiveSuggestionIndex(0);
      setFeedback(
        payload.fallback
          ? payload.message ?? "Gemini fallback was used."
          : "Miu AI đã tạo 3 gợi ý."
      );
    } catch (error) {
      if (error instanceof ApiError) {
        setFeedback(
          error.status === 401
            ? "Cần đăng nhập bằng tài khoản tác giả để dùng Miu AI."
            : error.message
        );
      } else {
        setFeedback("Không thể gọi Miu AI lúc này.");
      }
    } finally {
      setLoading(false);
    }
  };

  const insertSuggestion = (content: string) => {
    const textarea = editorRef.current;
    const { start, end } = selectionRef.current;
    const cursor = start + content.length;

    setContext((current) => `${current.slice(0, start)}${content}${current.slice(end)}`);

    requestAnimationFrame(() => {
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const syncEditorSelection = (target: HTMLTextAreaElement | null = editorRef.current) => {
    if (!target) return;
    selectionRef.current = {
      start: target.selectionStart ?? target.value.length,
      end: target.selectionEnd ?? target.value.length,
    };
  };

  useEffect(() => {
    if (activeSuggestionIndex >= suggestions.length) {
      setActiveSuggestionIndex(Math.max(0, suggestions.length - 1));
    }
  }, [activeSuggestionIndex, suggestions.length]);

  const activeModeMeta = MODE_META[mode];
  const activeSuggestion = suggestions[activeSuggestionIndex] ?? null;

  return (
    <AppShell
      activeId="s16"
      actions={
        <div className="inline-actions">
          <button className="button" data-toast="Bản nháp đã được lưu.">
            Lưu nháp
          </button>
          <button
            className="button"
            data-toast="Miu AI đã quét nhanh bản thảo và đánh dấu 2 đoạn nên rút gọn."
            data-toast-type="warning"
          >
            <Icon name="check" />
            Kiểm tra
          </button>
          <a className="button" href="/publish-chapter">
            Xuất bản
          </a>
          <button className="button button-primary" data-toast="Đã mở bản đọc thử.">
            Xem trước
          </button>
        </div>
      }
    >
      <section className="metric-grid" style={{ marginBottom: 24 }}>
        <MetricCard label="Tác phẩm" value="8" />
        <MetricCard label="Chương đã đăng" value="284" />
        <MetricCard label="Độc giả theo dõi" value="48K" />
        <MetricCard label="Đúng lịch" value="92%" />
      </section>

      <section className="action-strip" style={{ marginBottom: 24 }}>
        <div>
          <strong>2 tác phẩm cần xử lý trong tuần</strong>
          <div className="list-meta">Ưu tiên viết tiếp các truyện có độc giả đang chờ chương mới.</div>
        </div>
        <button className="button" data-toast="Đã lọc danh sách tác phẩm cần cập nhật trước hạn.">
          Xem việc cần làm
        </button>
      </section>

      <main className="studio-grid">
        <section className="editor-area">
          <div className="writing-toolbar">
            <div className="tool-group">
              {["↶", "↷", "H1", "❝", "☰", "≡", "≣"].map((tool) => (
                <button
                  className="tool-button"
                  type="button"
                  title={tool}
                  data-toast="Đã áp dụng công cụ soạn thảo."
                  key={tool}
                >
                  <span>{tool}</span>
                </button>
              ))}
            </div>
            <div className="tool-group tool-group-selects">
              <label>
                Phông chữ
                <select className="select compact-select" data-editor-font>
                  <option value="Inter, Arial, sans-serif">Inter</option>
                  <option value="Georgia, serif">Georgia</option>
                </select>
              </label>
              <label>
                Cỡ chữ
                <select className="select compact-select" data-editor-size>
                  <option value="14px">14</option>
                  <option value="16px">16</option>
                  <option value="20px">20</option>
                </select>
              </label>
              <label>
                Dòng
                <select className="select compact-select" data-editor-line>
                  <option value="1.3">1.3</option>
                  <option value="1.6">1.6</option>
                </select>
              </label>
            </div>
            <div className="tool-group">
              <button className="tool-button" data-format-toggle="bold">
                <strong>B</strong>
              </button>
              <button className="tool-button" data-format-toggle="italic">
                <em>I</em>
              </button>
              <button className="tool-button" data-format-toggle="underline">
                <span style={{ textDecoration: "underline" }}>U</span>
              </button>
              <button className="tool-button" data-format-toggle="highlight">
                <span className="color-dot" />
              </button>
            </div>
          </div>

          <div className="writing-workspace">
            <aside className="chapter-outline">
              <div className="outline-head">
                <strong>Dàn ý chương</strong>
                <span className="badge badge-green">Đúng nhịp</span>
              </div>
              {["Sân ga sau mưa", "Lá thư bị trả lại", "Tiếng còi cuối mùa"].map((item, index) => (
                <button
                  className={`outline-item ${index === 0 ? "active" : ""}`}
                  type="button"
                  data-toast={`Đã mở ${item}.`}
                  key={item}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{item}</strong>
                  <small>{index === 0 ? "Đang viết" : "Ghi chú"}</small>
                </button>
              ))}
              <div className="outline-metric">
                <span>Nhịp chương</span>
                <strong>78%</strong>
                <div className="progress">
                  <span style={{ width: "78%" }} />
                </div>
              </div>
            </aside>

            <div className="editor-paper">
              <div className="editor-meta-row">
                <span className="badge badge-blue">Bản nháp</span>
                <span>Đã lưu lúc 10:42</span>
                <span>Markdown bật</span>
              </div>
              <input className="editor-title" defaultValue="Chương 13: Tiếng còi cuối mùa" />
              <textarea
                ref={editorRef}
                className="editor-body"
                value={context}
                onChange={(event) => {
                  setContext(event.target.value);
                  syncEditorSelection(event.currentTarget);
                }}
                onClick={(event) => syncEditorSelection(event.currentTarget)}
                onKeyUp={(event) => syncEditorSelection(event.currentTarget)}
                onMouseUp={(event) => syncEditorSelection(event.currentTarget)}
                onSelect={(event) => syncEditorSelection(event.currentTarget)}
                onFocus={(event) => syncEditorSelection(event.currentTarget)}
              />
              <div className="editor-footer-row">
                <span>1.284 từ · 7 phút đọc</span>
                <span className="badge badge-green">Đã lưu</span>
              </div>
            </div>
          </div>
        </section>

        <aside className="ai-sidebar ai-agent-sidebar">
          <div className="miu-hero">
            <div className="ai-agent-card">
              <div className="ai-avatar" aria-hidden="true">
                <span className="ai-ear left" />
                <span className="ai-ear right" />
                <span className="ai-face">•ᴗ•</span>
              </div>
              <div>
                <strong>Miu AI</strong>
                <div className="story-meta">Trợ lý soạn thảo 30% bên phải</div>
              </div>
              <span className="badge badge-green">Online</span>
            </div>

            <div className="agent-status">
              <div>
                <span>Context</span>
                <strong>1.000 từ gần nhất</strong>
              </div>
              <div>
                <span>Tone</span>
                <strong>{activeModeMeta.label}</strong>
              </div>
            </div>

            <div className="miu-note">{activeModeMeta.hint}</div>
          </div>

          <div className="tabs ai-tabs">
            {(["kịch tính", "lãng mạn", "bí ẩn"] as AiMode[]).map((item) => (
              <button
                key={item}
                className={`tab-button ${mode === item ? "active" : ""}`}
                type="button"
                onClick={() => void requestSuggestions(item)}
              >
                {MODE_META[item].label}
              </button>
            ))}
          </div>

          <div className="miu-quick-grid">
            <button className="miu-quick" type="button" onClick={() => void requestSuggestions("kịch tính")}>
              <strong>Gợi ý kịch tính</strong>
              <span>Đẩy xung đột và nhịp truyện lên cao</span>
            </button>
            <button className="miu-quick" type="button" onClick={() => void requestSuggestions("lãng mạn")}>
              <strong>Gợi ý lãng mạn</strong>
              <span>Thêm khoảng lặng và cảm xúc giữa nhân vật</span>
            </button>
            <button className="miu-quick" type="button" onClick={() => void requestSuggestions("bí ẩn")}>
              <strong>Gợi ý bí ẩn</strong>
              <span>Mở thêm manh mối để giữ độc giả ở lại</span>
            </button>
          </div>

          <div className="agent-bubble">
            <strong>Miu đang chờ ngữ cảnh để tạo 3 hướng tiếp theo.</strong>
            <p>
              {feedback ??
                "Bấm một chế độ ở trên hoặc gửi lời nhắn bên dưới để nhận 3 gợi ý. Mỗi gợi ý đều có thể chèn trực tiếp vào bản thảo."}
            </p>
          </div>

          <div className="miu-suggestion-grid">
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <article className="miu-suggestion-card" key={index}>
                  <div className="skeleton" style={{ width: "46%", height: 16 }} />
                  <div className="skeleton" style={{ width: "100%", height: 60, marginTop: 10 }} />
                </article>
              ))
            ) : suggestions.length > 0 ? (
              suggestions.map((item, index) => (
                <article className="miu-suggestion-card" key={`${item.title}-${index}`}>
                  <div className="miu-suggestion-head">
                    <strong>{item.title}</strong>
                    <span className="badge badge-blue">#{index + 1}</span>
                  </div>
                  <p>{item.content}</p>
                  {item.reason ? <small>{item.reason}</small> : null}
                  <div className="inline-actions">
                    <button
                      className="button button-primary"
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => insertSuggestion(item.content)}
                    >
                      Chèn vào truyện
                    </button>
                  </div>
                </article>
              ))
            ) : (
              Array.from({ length: 3 }).map((_, index) => (
                <article className="miu-suggestion-card" key={index}>
                  <strong>Gợi ý số {index + 1}</strong>
                  <p>Ba phương án AI sẽ xuất hiện ở đây sau khi bạn gửi ngữ cảnh.</p>
                </article>
              ))
            )}
          </div>

          <div className="agent-compose">
            <textarea
              className="textarea"
              rows={3}
              value={composerPrompt}
              onChange={(event) => setComposerPrompt(event.target.value)}
            />
            <button
              className="button button-primary"
              type="button"
              onClick={() => void requestSuggestions(mode, composerPrompt)}
              disabled={loading}
            >
              <Icon name="arrow" />
              {loading ? "Đang gửi..." : "Gửi cho Miu"}
            </button>
          </div>
        </aside>
      </main>

      <ProductFooter />
    </AppShell>
  );
}
