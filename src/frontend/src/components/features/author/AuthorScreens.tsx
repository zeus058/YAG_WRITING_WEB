"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { stories } from "@/data/yag";
import { Icon, Cover, MetricCard } from "@/components/ui";
import { AppShell, ProductFooter } from "@/components/layout";
import { yagApi, appEnv, createDraftSocket } from "@/lib";

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

export function AuthorWorksScreen() {
  const [works, setWorks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states for creating a new story
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Ngôn tình");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadWorks = async () => {
    try {
      if (appEnv.useMocks) {
        setWorks(stories.slice(0, 3));
      } else {
        const res = await yagApi.author.getStories();
        setWorks(res.data || []);
      }
    } catch (err) {
      console.error("Failed to load author works:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadWorks();
  }, []);

  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (appEnv.useMocks) {
        const fakeNew = {
          id: String(Math.random()),
          title,
          description,
          category,
          chapter_count: 0,
          cover_url: null,
          status: "ongoing",
        };
        setWorks([fakeNew, ...works]);
        setIsModalOpen(false);
        setTitle("");
        setDescription("");
        setSubmitting(false);
        triggerLiveToast("Đã khởi tạo bộ truyện nháp (Mock).");
        return;
      }

      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("category", category);
      formData.append("status", "ongoing");
      if (coverFile) {
        formData.append("cover_file", coverFile);
      }

      await yagApi.author.createStory(formData);
      void loadWorks();
      setIsModalOpen(false);
      setTitle("");
      setDescription("");
      setCoverFile(null);
      triggerLiveToast("Đã tạo bộ truyện mới thành công!");
    } catch (err) {
      console.error(err);
      triggerLiveToast("Không thể tạo tác phẩm. Trùng tiêu đề?", "warning");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell
      activeId="s15"
      actions={
        <button className="button button-primary" onClick={() => setIsModalOpen(true)}>
          <Icon name="edit" />Tạo tác phẩm mới
        </button>
      }
    >
      <section className="metric-grid" style={{ marginBottom: 24 }}>
        <MetricCard label="Tác phẩm" value={String(works.length)} />
        <MetricCard label="Cam kết lịch đăng" value="100%" />
        <MetricCard label="Điểm uy tín tác giả" value="100" />
      </section>

      {isLoading ? (
        <div style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>
          Đang tải danh sách tác phẩm...
        </div>
      ) : works.length === 0 ? (
        <div className="empty-state" style={{ padding: 48 }}>
          <h2 className="section-title">Bạn chưa có tác phẩm nào</h2>
          <p>Nhấp vào nút &quot;Tạo tác phẩm mới&quot; ở góc trên bên phải để bắt đầu sáng tác câu chuyện của riêng bạn.</p>
        </div>
      ) : (
        <section className="grid grid-3">
          {works.map((story, index) => {
            const editHref = `/author/stories/${story.id}/edit`;
            const publishHref = `/author/stories/${story.id}/publish`;
            const chapCount = story.chapter_count ?? story.chapters?.length ?? 0;
            return (
              <article className="story-card" key={story.id || story.title}>
                <Cover index={index} coverUrl={story.cover_url} />
                <div className="compact-stack">
                  <span className="badge badge-green">Đang cập nhật</span>
                  <h3 className="story-title">{story.title}</h3>
                  <div className="story-meta">{chapCount} chương · {story.category}</div>
                  <div className="inline-actions" style={{ marginTop: 12 }}>
                    <Link className="button button-primary" href={editHref}>Viết tiếp</Link>
                    <Link className="button" href={publishHref}>Đăng chương</Link>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* Story creation modal */}
      {isModalOpen && (
        <div className="modal-backdrop open" style={{ display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setIsModalOpen(false)}>
          <div className="modal-window panel panel-pad" style={{ maxWidth: 500, width: "100%" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Khởi tạo tác phẩm mới</h2>
              <button className="button icon-button" onClick={() => setIsModalOpen(false)}><Icon name="close" /></button>
            </div>
            <form onSubmit={handleCreateStory} className="stack" style={{ gap: 16, marginTop: 16 }}>
              <div className="field">
                <label>Tên tác phẩm (Độc bản)</label>
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Ví dụ: Mưa Trên Thành Cũ" />
              </div>
              <div className="field">
                <label>Thể loại chính</label>
                <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {["Ngôn tình", "Kiếm hiệp", "Kỳ ảo", "Trinh thám", "Khoa học viễn tưởng", "Đời thường", "Lịch sử"].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Tóm tắt cốt truyện</label>
                <textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} required placeholder="Tóm tắt ngắn gọn câu chuyện của bạn..." />
              </div>
              <div className="field">
                <label>Ảnh bìa tác phẩm (Không bắt buộc)</label>
                <input type="file" className="input" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
              </div>
              <div className="inline-actions" style={{ justifyContent: "flex-end", gap: 12 }}>
                <button className="button" type="button" onClick={() => setIsModalOpen(false)}>Hủy bỏ</button>
                <button className="button button-primary" type="submit" disabled={submitting}>Khởi tạo</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export function AuthorStudioScreen() {
  const params = useParams();
  const storyId = params?.id as string;

  const [story, setStory] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [activeChapter, setActiveChapter] = useState<any>(null);
  const [editorTitle, setEditorTitle] = useState("");
  const [editorContent, setEditorContent] = useState("");
  const [savingStatus, setSavingStatus] = useState("Đã lưu");
  const [isLoading, setIsLoading] = useState(true);

  // AI Suggestion state
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInput, setAiInput] = useState("");

  const wsRef = useRef<any>(null);
  const debounceTimerRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadStudioData = async () => {
    try {
      if (appEnv.useMocks) {
        setStory({ title: "Mưa Trên Thành Cũ" });
        const mockChaps = [
          { id: "c1", chapter_number: 13, title: "Tiếng còi cuối mùa", content: "Mưa đã ngừng..." }
        ];
        setChapters(mockChaps);
        setActiveChapter(mockChaps[0]);
        setEditorTitle(mockChaps[0].title);
        setEditorContent(mockChaps[0].content);
        setIsLoading(false);
        return;
      }

      const storyRes = await yagApi.reader.getStoryDetail(storyId);
      setStory(storyRes.data);

      const chapsRes = await yagApi.author.getChapters(storyId);
      const chaps = chapsRes.data || [];
      setChapters(chaps);

      if (chaps.length > 0) {
        setActiveChapter(chaps[0]);
        setEditorTitle(chaps[0].title);
        setEditorContent(chaps[0].content);
      } else {
        // Create an initial draft chapter if empty
        const newChap = await yagApi.apiFetch<any>("/api/v1/chapters/", {
          method: "POST",
          body: {
            story_id: storyId,
            chapter_number: 1,
            title: "Chương 1: Khởi đầu",
            content: "Nội dung chương viết ở đây..."
          }
        });
        setChapters([newChap.data]);
        setActiveChapter(newChap.data);
        setEditorTitle(newChap.data.title);
        setEditorContent(newChap.data.content);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadStudioData();
  }, [storyId]);

  // Setup WebSocket Autosave
  useEffect(() => {
    if (!activeChapter?.id || appEnv.useMocks) return;

    if (wsRef.current) wsRef.current.close();

    const socketObj = createDraftSocket({
      storyId,
      chapterId: activeChapter.id,
      onOpen: () => {
        console.log("Autosave WS connected.");
      },
      onMessage: (msg: any) => {
        if (msg.type === "autosave" && msg.status === "success") {
          setSavingStatus("Đã lưu (WS)");
        }
      },
      onClose: () => {
        console.log("Autosave WS closed.");
      },
    });

    wsRef.current = socketObj;

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [activeChapter]);

  // Debounced Autosave Trigger
  const triggerAutosave = (newTitle: string, newBody: string) => {
    setSavingStatus("Đang lưu...");
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      if (appEnv.useMocks) {
        setSavingStatus("Đã lưu (Mock)");
        return;
      }

      if (wsRef.current && wsRef.current.socket.readyState === WebSocket.OPEN) {
        wsRef.current.sendDraftPatch({ title: newTitle, content: newBody });
      } else {
        // Fallback REST autosave
        try {
          await yagApi.author.saveDraft(activeChapter.id, { title: newTitle, content: newBody });
          setSavingStatus("Đã lưu (REST)");
        } catch (err) {
          console.error("Autosave failed:", err);
          setSavingStatus("Lưu thất bại!");
        }
      }
    }, 3000);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditorTitle(e.target.value);
    triggerAutosave(e.target.value, editorContent);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditorContent(e.target.value);
    triggerAutosave(editorTitle, e.target.value);
  };

  const insertSuggestion = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setEditorContent(prev => {
        const updated = prev ? `${prev}\n\n${text}` : text;
        triggerAutosave(editorTitle, updated);
        return updated;
      });
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;

    const before = value.substring(0, start);
    const after = value.substring(end);
    const updated = `${before}${text}${after}`;

    setEditorContent(updated);
    triggerAutosave(editorTitle, updated);

    // Set focus and cursor position after the inserted text
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 50);
  };

  // Request AI Plot Suggestions
  const handleAiSuggest = async () => {
    if (!editorContent.trim() || aiLoading) return;
    setAiLoading(true);
    try {
      if (appEnv.useMocks) {
        setAiSuggestions([
          { title: "Hướng đi 1", content: "Cho An tìm thấy phong bì màu lam của mười năm trước.", style: "drama" },
          { title: "Hướng đi 2", content: "Đoạn ga Bắc xuất hiện thêm một người bán vé bí ẩn.", style: "mystery" },
        ]);
        setAiLoading(false);
        return;
      }

      // Extract last 1000 words roughly (approx 5000 characters)
      const contextText = editorContent.slice(-4000);
      const res = await yagApi.author.requestAiSuggestion({
        chapterId: activeChapter.id,
        context: contextText,
        mode: aiInput || "kịch tính",
      });

      setAiSuggestions(res.data.suggestions || []);
    } catch (err) {
      console.error(err);
      triggerLiveToast("Gemini API bận hoặc hết hạn ngạch. Vui lòng thử lại sau.", "warning");
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreateNewChapter = async () => {
    if (appEnv.useMocks) return;
    try {
      const nextNum = chapters.length + 1;
      const res = await yagApi.apiFetch<any>("/api/v1/chapters/", {
        method: "POST",
        body: {
          story_id: storyId,
          chapter_number: nextNum,
          title: `Chương ${nextNum}: Tiêu đề mới`,
          content: "Nội dung chương viết ở đây..."
        }
      });
      const newChap = res.data;
      setChapters([...chapters, newChap]);
      setActiveChapter(newChap);
      setEditorTitle(newChap.title);
      setEditorContent(newChap.content);
      triggerLiveToast("Đã khởi tạo chương mới.");
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="studio-page" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--muted)" }}>
        Đang tải không gian viết...
      </div>
    );
  }

  return (
    <div className="studio-page">
      <header className="studio-topbar">
        <div className="inline-actions">
          <Link className="button" href="/author/stories">
            <Icon name="arrow" />Tác phẩm
          </Link>
          <div>
            <strong>Author Studio - {story?.title}</strong>
            <div className="story-meta">{editorContent.split(/\s+/).length} từ · {savingStatus}</div>
          </div>
        </div>
        <div className="inline-actions">
          <button className="button" onClick={() => triggerAutosave(editorTitle, editorContent)}>Lưu nháp</button>
          <Link className="button button-primary" href={`/author/stories/${storyId}/publish`}>
            Xuất bản chương
          </Link>
        </div>
      </header>
      <main className="studio-grid">
        <section className="editor-area">
          <div className="writing-workspace">
            <aside className="chapter-outline">
              <div className="outline-head">
                <strong>Chương viết</strong>
                <button className="button button-soft" style={{ padding: "4px 8px" }} onClick={handleCreateNewChapter}>+</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", maxHeight: "60vh" }}>
                {chapters.map((chap) => (
                  <button
                    className={`outline-item ${activeChapter?.id === chap.id ? "active" : ""}`}
                    type="button"
                    key={chap.id}
                    onClick={() => {
                      setActiveChapter(chap);
                      setEditorTitle(chap.title);
                      setEditorContent(chap.content);
                    }}
                  >
                    <span>{String(chap.chapter_number).padStart(2, "0")}</span>
                    <strong>{chap.title}</strong>
                    <small>{chap.moderation_status}</small>
                  </button>
                ))}
              </div>
            </aside>
            <div className="editor-paper">
              <div className="editor-meta-row">
                <span className="badge badge-blue">{activeChapter?.moderation_status || "nháp"}</span>
                <span>Tự động lưu kích hoạt</span>
              </div>
              <input className="editor-title" value={editorTitle} onChange={handleTitleChange} />
              <textarea ref={textareaRef} className="editor-body" value={editorContent} onChange={handleContentChange} />
              <div className="editor-footer-row">
                <span>{editorContent.split(/\s+/).length} từ · {savingStatus}</span>
              </div>
            </div>
          </div>
        </section>
        <aside className="ai-sidebar ai-agent-sidebar">
          <div className="ai-agent-card">
            <div className="ai-avatar" aria-hidden="true">
              <span className="ai-ear left" />
              <span className="ai-ear right" />
              <span className="ai-face">•ᴗ•</span>
            </div>
            <div>
              <strong>Miu AI suggestions</strong>
              <div className="story-meta">Hỗ trợ biên tập & tìm ý tưởng</div>
            </div>
          </div>
          <div className="agent-status">
            <div><span>Context</span><strong>1000 từ cuối</strong></div>
          </div>
          <div className="tab-panel active stack">
            <div className="agent-bubble">
              <strong>Chọn tông giọng và gợi ý tình tiết tiếp theo:</strong>
            </div>
            {aiSuggestions.map((item, idx) => (
              <div className="agent-action" key={idx} style={{ background: "rgba(255, 255, 255, 0.05)", borderLeft: "4px solid var(--crimson)", padding: 8, borderRadius: 4, display: "flex", flexDirection: "column", gap: 8 }}>
                <div>
                  <strong>{item.title || `Gợi ý ${idx + 1}`} ({item.style || "AI"})</strong>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>{item.content || item.text}</p>
                </div>
                <button
                  className="button button-soft"
                  style={{ width: "fit-content", padding: "4px 8px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
                  onClick={() => insertSuggestion(item.content || item.text || "")}
                >
                  <Icon name="edit" /> Chèn vào truyện
                </button>
              </div>
            ))}
            <div className="agent-compose" style={{ marginTop: "auto" }}>
              <input
                className="input"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="Tông giọng (VD: kịch tính, trầm lắng...)"
                style={{ marginBottom: 8 }}
              />
              <button className="button button-primary" onClick={handleAiSuggest} disabled={aiLoading || !editorContent}>
                {aiLoading ? "Đang gợi ý..." : "Yêu cầu gợi ý AI"}
              </button>
            </div>
          </div>
        </aside>
      </main>
      <ProductFooter />
    </div>
  );
}

export function PublishScreen() {
  const params = useParams();
  const storyId = params?.id as string;
  const router = useRouter();

  const [chapters, setChapters] = useState<any[]>([]);
  const [selectedChapId, setSelectedChapId] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [publishDate, setPublishDate] = useState("");
  const [agreement, setAgreement] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (appEnv.useMocks) return;
    const fetchDrafts = async () => {
      try {
        const res = await yagApi.author.getChapters(storyId);
        const drafts = (res.data || []).filter((c: any) => c.moderation_status === "draft");
        setChapters(drafts);
        if (drafts.length > 0) setSelectedChapId(drafts[0].id);
      } catch (err) {
        console.error(err);
      }
    };
    void fetchDrafts();
  }, [storyId]);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChapId || !agreement) {
      triggerLiveToast("Vui lòng xác nhận cam kết nội dung.", "warning");
      return;
    }
    setSubmitting(true);
    try {
      if (appEnv.useMocks) {
        triggerLiveToast("Đã gửi kiểm duyệt AI chương (Mock).");
        router.push("/author/stories");
        return;
      }
      await yagApi.author.publishChapter(selectedChapId, {
        isPremium,
        scheduleAt: publishDate ? new Date(publishDate).toISOString() : undefined,
      });
      triggerLiveToast("Chương đã được gửi thành công. Hệ thống AI đang tiến hành kiểm duyệt...", "success");
      router.push("/author/stories");
    } catch (err) {
      console.error(err);
      triggerLiveToast("Xuất bản chương thất bại.", "warning");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell activeId="s17">
      <section className="panel panel-pad stack">
        <h2>Xuất bản chương truyện mới</h2>
        <form onSubmit={handlePublish} className="stack" style={{ gap: 20, marginTop: 16 }}>
          <div className="grid grid-3">
            <div className="field">
              <label>Chọn chương nháp</label>
              <select className="select" value={selectedChapId} onChange={(e) => setSelectedChapId(e.target.value)}>
                {chapters.map(c => (
                  <option key={c.id} value={c.id}>Chương {c.chapter_number}: {c.title}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Loại chương</label>
              <select className="select" value={isPremium ? "premium" : "free"} onChange={(e) => setIsPremium(e.target.value === "premium")}>
                <option value="free">Miễn phí (Free)</option>
                <option value="premium">Premium (Cần gói hội viên)</option>
              </select>
            </div>
            <div className="field">
              <label>Hẹn giờ công bố (Không bắt buộc)</label>
              <input type="datetime-local" className="input" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} />
            </div>
          </div>
          <div className="stack">
            <label className="pill" style={{ marginBottom: 12 }}>
              <input type="checkbox" checked={agreement} onChange={(e) => setAgreement(e.target.checked)} /> Tôi cam kết nội dung tuân thủ đầy đủ điều khoản bản quyền và chính sách an toàn YAG.
            </label>
            <button className="button button-primary" type="submit" disabled={submitting || chapters.length === 0}>
              Gửi duyệt & Xuất bản
            </button>
          </div>
        </form>
      </section>
    </AppShell>
  );
}

export function ScheduleScreen() {
  return (
    <AppShell activeId="s18">
      <section className="layout-right">
        <main className="panel panel-pad stack">
          <div className="inline-actions" style={{ justifyContent: "space-between" }}>
            <h2 className="section-title">Tháng 05/2026</h2>
          </div>
          <div className="calendar">
            {Array.from({ length: 28 }, (_, index) => (
              <div className="calendar-day" key={index}>
                <strong>{index + 1}</strong>
                {index % 7 === 0 ? <span className="badge badge-amber">Đến hạn</span> : null}
              </div>
            ))}
          </div>
        </main>
      </section>
    </AppShell>
  );
}
