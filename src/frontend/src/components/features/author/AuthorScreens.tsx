"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { stories } from "@/data/yag";
import { Icon, Cover, MetricCard } from "@/components/ui";
import { AppShell } from "@/components/layout";
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

const AUTHOR_DRAFT_STATUSES = new Set(["draft", "nháp", "rejected", "flagged"]);

function isAuthorDraftChapter(chapter: any) {
  const status = String(chapter?.moderation_status || "draft").toLowerCase();
  return AUTHOR_DRAFT_STATUSES.has(status);
}

function getNextChapterNumber(chapters: any[]) {
  return Math.max(0, ...chapters.map((chapter) => Number(chapter.chapter_number) || 0)) + 1;
}

export function AuthorWorksScreen() {
  const router = useRouter();
  const [works, setWorks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states for creating a new story
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Ngôn tình");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Live filter states
  const [statusFilter, setStatusFilter] = useState("all");
  const [moderationFilter, setModerationFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recently_updated");

  const loadWorks = async () => {
    try {
      if (appEnv.useMocks) {
        setWorks(
          stories.slice(0, 3).map((s, idx) => ({
            id: `mock-story-${idx + 1}`,
            title: s.title,
            description: `Tác phẩm ngôn tình mang đậm màu sắc hoài niệm về tình yêu và chiến tranh của Linh An.`,
            category: s.genre,
            chapter_count: s.chapters,
            cover_url: null,
            status: idx === 2 ? "completed" : "ongoing",
            moderation_status: idx === 1 ? "pending" : "approved",
            view_count: 125000 + idx * 45000,
            rating_avg: 4.6 + idx * 0.15,
            updated_at: new Date(Date.now() - idx * 24 * 3600 * 1000).toISOString(),
            draft_count: idx + 2,
          }))
        );
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

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setCoverFile(file);
    if (file) {
      setCoverUrl(URL.createObjectURL(file));
    } else {
      setCoverUrl(null);
    }
  };

  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      triggerLiveToast("Vui lòng điền đầy đủ thông tin bắt buộc.", "warning");
      return;
    }
    setSubmitting(true);
    try {
      if (appEnv.useMocks) {
        const fakeNew = {
          id: `mock-story-${Date.now()}`,
          title,
          description,
          category,
          chapter_count: 0,
          cover_url: coverUrl,
          status: "ongoing",
          moderation_status: "approved",
          view_count: 0,
          rating_avg: 0.0,
          updated_at: new Date().toISOString(),
          draft_count: 1,
        };
        setWorks([fakeNew, ...works]);
        setIsModalOpen(false);
        setTitle("");
        setDescription("");
        setCoverUrl(null);
        setCoverFile(null);
        triggerLiveToast("Đã khởi tạo bộ truyện nháp (Mock).");
        router.push(`/author/stories/${fakeNew.id}/edit`);
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

      const response = await yagApi.author.createStory(formData);
      void loadWorks();
      setIsModalOpen(false);
      setTitle("");
      setDescription("");
      setCoverFile(null);
      setCoverUrl(null);
      triggerLiveToast("Đã tạo bộ truyện mới thành công!");
      if (response.data?.id) {
        router.push(`/author/stories/${response.data.id}/edit`);
      }
    } catch (err) {
      console.error(err);
      triggerLiveToast("Không thể tạo tác phẩm. Trùng tiêu đề?", "warning");
    } finally {
      setSubmitting(false);
    }
  };

  // Perform filtering & sorting on works list
  const filteredWorks = works
    .filter((story) => {
      if (statusFilter !== "all" && story.status !== statusFilter) return false;
      if (moderationFilter !== "all" && story.moderation_status !== moderationFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "views") {
        return (b.view_count || 0) - (a.view_count || 0);
      }
      if (sortBy === "rating") {
        return (b.rating_avg || 0) - (a.rating_avg || 0);
      }
      return (b.updated_at || "").localeCompare(a.updated_at || "");
    });

  return (
    <AppShell
      activeId="s15"
      actions={
        <button className="button button-primary" onClick={() => setIsModalOpen(true)}>
          <Icon name="edit" />Tạo tác phẩm mới
        </button>
      }
    >
      <div className="author-header-panel panel panel-pad" style={{ marginBottom: 24, background: "linear-gradient(135deg, var(--jungle-dark) 0%, #163020 100%)", color: "#fff", borderRadius: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <span className="user-avatar" style={{ background: "var(--crimson)", color: "#fff", width: 64, height: 64, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: 24 }}>
            LA
          </span>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: "bold", margin: 0, color: "#fff" }}>Chào mừng trở lại, Linh An!</h2>
            <p style={{ margin: "4px 0 0 0", opacity: 0.8, fontSize: 13 }}>Không gian quản lý tác phẩm & theo dõi hành trình sáng tác.</p>
          </div>
        </div>
      </div>

      <section className="metric-grid" style={{ marginBottom: 24 }}>
        <MetricCard label="Tác phẩm" value={String(works.length)} />
        <MetricCard label="Số chương nháp" value={String(works.reduce((acc, story) => acc + (story.draft_count || 0), 0))} />
        <MetricCard label="Chờ duyệt AI" value={String(works.reduce((acc, story) => acc + (story.moderation_status === "pending" ? 1 : 0), 0))} />
        <MetricCard label="Uy tín tác giả" value="98%" />
        <MetricCard label="Lượt đọc tháng" value="154.5K" />
        <MetricCard label="Đánh giá TB" value="4.8 ★" />
      </section>

      <div className="panel panel-pad inline-actions" style={{ marginBottom: 24, justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div className="field-inline" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 13, color: "var(--muted)", fontWeight: "bold" }}>Trạng thái:</label>
            <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: "4px 8px", fontSize: 13 }}>
              <option value="all">Tất cả</option>
              <option value="ongoing">Đang viết</option>
              <option value="completed">Hoàn thành</option>
              <option value="paused">Tạm ngưng</option>
            </select>
          </div>
          <div className="field-inline" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 13, color: "var(--muted)", fontWeight: "bold" }}>Kiểm duyệt:</label>
            <select className="select" value={moderationFilter} onChange={(e) => setModerationFilter(e.target.value)} style={{ padding: "4px 8px", fontSize: 13 }}>
              <option value="all">Tất cả</option>
              <option value="pending">Chờ duyệt</option>
              <option value="approved">Đã duyệt</option>
              <option value="flagged">Vi phạm</option>
            </select>
          </div>
        </div>
        <div className="field-inline" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: 13, color: "var(--muted)", fontWeight: "bold" }}>Sắp xếp:</label>
          <select className="select" value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: "4px 8px", fontSize: 13 }}>
            <option value="recently_updated">Mới chỉnh sửa</option>
            <option value="views">Lượt đọc</option>
            <option value="rating">Đánh giá</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>
          Đang tải danh sách tác phẩm...
        </div>
      ) : filteredWorks.length === 0 ? (
        <div className="empty-state panel panel-pad" style={{ padding: 48, textAlign: "center" }}>
          <h3 className="section-title" style={{ margin: "0 0 8px 0" }}>Không tìm thấy tác phẩm</h3>
          <p style={{ color: "var(--muted)", margin: 0 }}>Điều chỉnh bộ lọc hoặc nhấp vào &quot;Tạo tác phẩm mới&quot; để viết truyện.</p>
        </div>
      ) : (
        <section className="grid grid-3" style={{ gap: 20 }}>
          {filteredWorks.map((story, index) => {
            const editHref = `/author/stories/${story.id}/edit`;
            const publishHref = `/author/stories/${story.id}/publish`;
            const detailHref = `/stories/${story.id}`;
            const scheduleHref = `/author/schedule`;
            const chapCount = story.chapter_count ?? 0;
            return (
              <article className="story-card" key={story.id || story.title} style={{ display: "flex", flexDirection: "column" }}>
                <Cover index={index} coverUrl={story.cover_url} />
                <div className="compact-stack" style={{ flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "16px 0 0 0" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span className={`badge ${story.status === "completed" ? "badge-green" : story.status === "paused" ? "badge-amber" : "badge-blue"}`}>
                        {story.status === "completed" ? "Hoàn thành" : story.status === "paused" ? "Tạm ngưng" : "Đang viết"}
                      </span>
                      <span className={`badge ${story.moderation_status === "approved" ? "badge-green" : story.moderation_status === "pending" ? "badge-blue" : "badge-red"}`} style={{ fontSize: 10 }}>
                        {story.moderation_status === "approved" ? "Đã duyệt" : story.moderation_status === "pending" ? "Chờ duyệt" : "Vi phạm"}
                      </span>
                    </div>
                    <h3 className="story-title" style={{ fontSize: 16, fontWeight: "bold", margin: "0 0 6px 0" }}>{story.title}</h3>
                    <p style={{ fontSize: 12, color: "var(--muted)", height: 32, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", margin: "0 0 10px 0", lineHeight: 1.4 }}>
                      {story.description || "Chưa có mô tả ngắn."}
                    </p>
                    <div className="story-meta" style={{ fontSize: 11, color: "var(--muted)", margin: "0 0 12px 0" }}>
                      <strong>{chapCount}</strong> chương · <span>{story.category}</span> · <strong>{(story.view_count || 0).toLocaleString()}</strong> đọc · <strong>{story.rating_avg || 0}★</strong>
                    </div>
                  </div>
                  <div className="grid grid-2" style={{ gap: 8 }}>
                    <Link className="button button-primary" href={editHref} style={{ fontSize: 11, padding: "6px", textAlign: "center" }}>Viết tiếp</Link>
                    <Link className="button button-soft" href={publishHref} style={{ fontSize: 11, padding: "6px", textAlign: "center" }}>Đăng chương</Link>
                    <Link className="button" href={detailHref} style={{ fontSize: 11, padding: "6px", textAlign: "center" }}>Chi tiết</Link>
                    <Link className="button" href={scheduleHref} style={{ fontSize: 11, padding: "6px", textAlign: "center" }}>Xem lịch</Link>
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
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: "bold" }}>Khởi tạo tác phẩm mới</h2>
              <button className="button icon-button" onClick={() => setIsModalOpen(false)}><Icon name="close" /></button>
            </div>
            <form onSubmit={handleCreateStory} className="stack" style={{ gap: 16, marginTop: 16 }}>
              <div className="field">
                <label style={{ fontWeight: "bold", fontSize: 13 }}>Tên tác phẩm (Độc bản) <span style={{ color: "var(--crimson)" }}>*</span></label>
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Ví dụ: Mưa Trên Thành Cũ" />
              </div>
              <div className="field">
                <label style={{ fontWeight: "bold", fontSize: 13 }}>Thể loại chính</label>
                <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {["Ngôn tình", "Kiếm hiệp", "Kỳ ảo", "Trinh thám", "Khoa học viễn tưởng", "Đời thường", "Lịch sử"].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label style={{ fontWeight: "bold", fontSize: 13 }}>Tóm tắt cốt truyện <span style={{ color: "var(--crimson)" }}>*</span></label>
                <textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} required placeholder="Tóm tắt ngắn gọn câu chuyện của bạn..." style={{ height: 100 }} />
              </div>
              <div className="field">
                <label style={{ fontWeight: "bold", fontSize: 13 }}>Ảnh bìa tác phẩm (Không bắt buộc)</label>
                <input type="file" className="input" accept="image/*" onChange={handleCoverChange} />
                {coverUrl && (
                  <div style={{ marginTop: 12, textAlign: "center" }}>
                    <p style={{ fontSize: 11, color: "var(--muted)", margin: "0 0 6px 0" }}>Bản xem trước ảnh bìa:</p>
                    <img src={coverUrl} alt="Cover preview" style={{ maxWidth: "120px", maxHeight: "160px", borderRadius: 6, border: "1px solid var(--line)", objectFit: "cover" }} />
                  </div>
                )}
              </div>
              <div className="inline-actions" style={{ justifyContent: "flex-end", gap: 12, marginTop: 8 }}>
                <button className="button" type="button" onClick={() => setIsModalOpen(false)}>Hủy bỏ</button>
                <button className="button button-primary" type="submit" disabled={submitting}>
                  {submitting ? "Đang tạo..." : "Khởi tạo"}
                </button>
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isCreatingChapter, setIsCreatingChapter] = useState(false);
  const [offlineDraft, setOfflineDraft] = useState<{ title: string; content: string; id: string } | null>(null);

  // AI Suggestion state
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);

  const wsRef = useRef<any>(null);
  const debounceTimerRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadStudioData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      if (!storyId) {
        throw new Error("MISSING_STORY_ID");
      }
      if (appEnv.useMocks) {
        setStory({ title: "Mưa Trên Thành Cũ" });
        const mockChaps = [
          { id: "c1", chapter_number: 13, title: "Tiếng còi cuối mùa", content: "Mưa đã ngừng rơi trên các thềm đá cũ. Những ánh đèn đường nhạt nhòa hắt bóng dài xuống lòng đường sũng nước. An đưa tay đón lấy những giọt nước cuối cùng từ mái ngói đỏ...", moderation_status: "draft" },
          { id: "c2", chapter_number: 12, title: "Ga nhỏ hoàng hôn", content: "Tiếng còi tàu hú vang vọng kéo An ra khỏi miền ký ức xa xăm...", moderation_status: "approved" }
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
      setLoadError("Không thể mở không gian viết cho tác phẩm này. Vui lòng kiểm tra quyền truy cập hoặc thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadStudioData();
  }, [storyId]);

  useEffect(() => {
    if (typeof window !== "undefined" && activeChapter?.id) {
      const stored = localStorage.getItem(`yag_offline_draft:${activeChapter.id}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && (parsed.content !== activeChapter.content || parsed.title !== activeChapter.title)) {
            setOfflineDraft({
              id: activeChapter.id,
              title: parsed.title,
              content: parsed.content
            });
          } else {
            setOfflineDraft(null);
          }
        } catch (e) {
          console.error("Failed to parse offline draft:", e);
          setOfflineDraft(null);
        }
      } else {
        setOfflineDraft(null);
      }
    } else {
      setOfflineDraft(null);
    }
  }, [activeChapter]);

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
          if (typeof window !== "undefined" && activeChapter?.id) {
            localStorage.removeItem(`yag_offline_draft:${activeChapter.id}`);
          }
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

  const persistDraft = async (chapterId: string | undefined, newTitle: string, newBody: string, mode: "auto" | "manual" = "auto") => {
    if (!chapterId) return false;
    setSavingStatus("Đang lưu...");
    setSaveError(null);

    const markSaved = (label: string) => {
      setSavingStatus(label);
      setLastSavedAt(new Date());
      setChapters((prev) => prev.map((c) => c.id === chapterId ? { ...c, title: newTitle, content: newBody } : c));
      setActiveChapter((current: any) => current?.id === chapterId ? { ...current, title: newTitle, content: newBody } : current);
    };

    if (appEnv.useMocks) {
      markSaved("Đã lưu (Mock)");
      return true;
    }

    const saveLocally = () => {
      if (typeof window !== "undefined") {
        const draftData = {
          title: newTitle,
          content: newBody,
          updatedAt: Date.now()
        };
        localStorage.setItem(`yag_offline_draft:${chapterId}`, JSON.stringify(draftData));
        setSavingStatus("Ngoại tuyến - Đã lưu tạm");
        setSaveError("Bản nháp đã được lưu cục bộ vì chưa kết nối được máy chủ.");
      }
    };

    if (typeof window !== "undefined" && !navigator.onLine) {
      saveLocally();
      return false;
    }

    if (mode === "auto" && wsRef.current && wsRef.current.socket.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.sendDraftPatch({ title: newTitle, content: newBody });
        if (typeof window !== "undefined") {
          localStorage.removeItem(`yag_offline_draft:${chapterId}`);
        }
        markSaved("Đã lưu (WS)");
        return true;
      } catch (err) {
        console.error("WS autosave failed, saving offline:", err);
        saveLocally();
        return false;
      }
    }

    try {
      await yagApi.author.saveDraft(chapterId, { title: newTitle, content: newBody });
      if (typeof window !== "undefined") {
        localStorage.removeItem(`yag_offline_draft:${chapterId}`);
      }
      markSaved(mode === "manual" ? "Đã lưu thủ công" : "Đã lưu (REST)");
      return true;
    } catch (err) {
      console.error("Draft save failed, saving offline:", err);
      saveLocally();
      return false;
    }
  };

  const triggerAutosave = (newTitle: string, newBody: string) => {
    setSavingStatus("Đang lưu...");
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    const chapterId = activeChapter?.id;

    debounceTimerRef.current = setTimeout(() => {
      void persistDraft(chapterId, newTitle, newBody, "auto");
    }, 2000);
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

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 50);
  };

  const handleAiSuggest = async () => {
    if (!editorContent.trim() || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    try {
      if (appEnv.useMocks) {
        setTimeout(() => {
          setAiSuggestions([
            { title: "Kịch bản kịch tính", content: "Linh khẽ kéo chiếc khăn quàng cổ màu lam. Từ trong túi áo khoác rơi ra một mẩu giấy gấp nhỏ. Nét chữ quen thuộc của mười năm trước hiện lên nhạt nhòa: 'Hẹn gặp em nơi thềm ga cũ.'", style: "drama" },
            { title: "Kịch bản bí ẩn", content: "Từ phía góc khuất ga tàu, một người đàn ông trung niên mặc áo gió sẫm màu bước ra. Ông ta nhìn chăm chú vào chiếc vali của An và khẽ gật đầu.", style: "mystery" },
          ]);
          setAiLoading(false);
        }, 1000);
        return;
      }

      const contextText = editorContent.slice(-4000);
      const res = await yagApi.author.requestAiSuggestion({
        chapterId: activeChapter.id,
        context: contextText,
        mode: aiInput || "kịch tính",
      });

      setAiSuggestions(res.data.suggestions || []);
    } catch (err) {
      console.error(err);
      setAiError("Gemini API bận hoặc đã vượt hạn ngạch cuộc gọi (Rate Limit / Quota Exceeded). Vui lòng thử lại sau ít phút.");
      triggerLiveToast("AI Suggestion tạm thời gián đoạn.", "warning");
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreateNewChapter = async () => {
    if (isCreatingChapter) return;
    setIsCreatingChapter(true);
    setSaveError(null);
    const nextNum = getNextChapterNumber(chapters);
    if (appEnv.useMocks) {
      const newChap = {
        id: `mock-chap-${Date.now()}`,
        chapter_number: nextNum,
        title: `Chương ${nextNum}: Tiêu đề mới`,
        content: "Nội dung chương viết ở đây...",
        moderation_status: "draft",
      };
      const updated = [...chapters, newChap];
      setChapters(updated);
      setActiveChapter(newChap);
      setEditorTitle(newChap.title);
      setEditorContent(newChap.content);
      triggerLiveToast("Đã khởi tạo chương nháp mới (Mock).");
      setIsCreatingChapter(false);
      return;
    }
    try {
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
      setSaveError("Không thể tạo chương mới. Vui lòng thử lại hoặc kiểm tra kết nối.");
      triggerLiveToast("Không thể tạo chương mới.", "warning");
    } finally {
      setIsCreatingChapter(false);
    }
  };

  const handleSelectChapter = (chap: any) => {
    if (activeChapter?.id && debounceTimerRef.current && !isEditingDisabled) {
      clearTimeout(debounceTimerRef.current);
      void persistDraft(activeChapter.id, editorTitle, editorContent, "manual");
    }
    setActiveChapter(chap);
    setEditorTitle(chap.title);
    setEditorContent(chap.content);
    setSaveError(null);
    setLastSavedAt(null);
  };

  const isEditingDisabled = activeChapter && activeChapter.moderation_status && activeChapter.moderation_status !== "draft" && activeChapter.moderation_status !== "nháp";

  if (isLoading) {
    return (
      <div className="studio-page" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--muted)" }}>
        Đang tải không gian viết...
      </div>
    );
  }

  if (loadError || !activeChapter) {
    return (
      <AppShell activeId="s15">
        <section className="empty-state panel panel-pad" style={{ maxWidth: 720, margin: "48px auto", textAlign: "center" }}>
          <h2 className="section-title">Không mở được không gian viết</h2>
          <p style={{ color: "var(--muted)" }}>
            {loadError || "Tác phẩm này chưa có chương nháp khả dụng. Hãy thử tạo lại chương đầu tiên."}
          </p>
          <div className="inline-actions" style={{ justifyContent: "center", marginTop: 16 }}>
            <button className="button button-primary" type="button" onClick={() => void loadStudioData()}>
              Thử lại
            </button>
            <Link className="button" href="/author/stories">
              Quay về tác phẩm của tôi
            </Link>
          </div>
        </section>
      </AppShell>
    );
  }

  return (
    <div className="studio-page">
      <header className="studio-topbar" style={{ padding: "12px 24px", borderBottom: "1px solid var(--line)", background: "#FFF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="breadcrumbs" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <Link href="/author/stories" style={{ color: "var(--muted)", textDecoration: "none" }}>Tác phẩm của tôi</Link>
            <span style={{ color: "var(--muted)" }}>/</span>
            <span style={{ color: "var(--muted)" }}>{story?.title || "Đang tải..."}</span>
            <span style={{ color: "var(--muted)" }}>/</span>
            <strong style={{ color: "var(--jungle-dark)" }}>Đang viết</strong>
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", paddingLeft: 12, borderLeft: "1px solid var(--line)" }}>
            {editorContent.split(/\s+/).filter(Boolean).length} từ · {savingStatus}
            {lastSavedAt ? ` · ${lastSavedAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}` : ""}
          </div>
        </div>
        <div className="inline-actions" style={{ gap: 12 }}>
          <button
            className="button"
            type="button"
            onClick={() => {
              if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
              void persistDraft(activeChapter?.id, editorTitle, editorContent, "manual");
            }}
            disabled={isEditingDisabled}
          >
            Lưu nháp
          </button>
          <Link className="button button-primary" href={`/author/stories/${storyId}/publish`}>
            Xuất bản chương
          </Link>
        </div>
      </header>

      {offlineDraft && (
        <div className="offline-recovery-banner" style={{ background: "rgba(230, 57, 70, 0.1)", borderLeft: "4px solid var(--crimson)", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <span style={{ color: "var(--foreground)", fontSize: 13 }}>Phát hiện bản nháp lưu ngoại tuyến mới hơn cho chương này. Bạn có muốn khôi phục không?</span>
          <div className="inline-actions" style={{ gap: 12 }}>
            <button className="button button-primary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => {
              setEditorTitle(offlineDraft.title);
              setEditorContent(offlineDraft.content);
              triggerAutosave(offlineDraft.title, offlineDraft.content);
              setOfflineDraft(null);
            }}>Khôi phục</button>
            <button className="button" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => {
              if (typeof window !== "undefined" && activeChapter?.id) {
                localStorage.removeItem(`yag_offline_draft:${activeChapter.id}`);
              }
              setOfflineDraft(null);
            }}>Bỏ qua</button>
          </div>
        </div>
      )}

      <main className="studio-grid" style={{ display: "grid", gridTemplateColumns: "1fr 3fr 1.2fr", height: "calc(100vh - 65px)" }}>
        {/* Left Chapter Outline */}
        <aside className="chapter-outline" style={{ borderRight: "1px solid var(--line)", padding: 16, overflowY: "auto", background: "#fcfcfc" }}>
          <div className="outline-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <strong style={{ fontSize: 14, color: "var(--jungle-dark)" }}>Đại cương chương</strong>
            <button
              className="button button-soft"
              style={{ padding: "2px 8px", fontSize: 12 }}
              onClick={handleCreateNewChapter}
              disabled={isCreatingChapter}
              aria-label="Tạo chương mới"
            >
              {isCreatingChapter ? "..." : "+"}
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {chapters.map((chap) => {
              const isActive = activeChapter?.id === chap.id;
              return (
                <button
                  className={`outline-item ${isActive ? "active" : ""}`}
                  type="button"
                  key={chap.id}
                  onClick={() => handleSelectChapter(chap)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid " + (isActive ? "var(--jungle-dark)" : "var(--line)"),
                    background: isActive ? "rgba(22, 48, 32, 0.05)" : "#fff",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: "bold", color: "var(--muted)" }}>Chương {chap.chapter_number}</span>
                    <span className={`badge ${chap.moderation_status === "approved" ? "badge-green" : chap.moderation_status === "pending" ? "badge-blue" : "badge-red"}`} style={{ fontSize: 9 }}>
                      {chap.moderation_status === "approved" ? "đã duyệt" : chap.moderation_status === "pending" ? "kiểm duyệt" : chap.moderation_status || "nháp"}
                    </span>
                  </div>
                  <strong style={{ fontSize: 13, display: "block", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", width: "100%", color: isActive ? "var(--jungle-dark)" : "var(--foreground)" }}>
                    {chap.title}
                  </strong>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Center Editor Paper */}
        <section className="editor-area" style={{ padding: "24px 32px", overflowY: "auto", background: "#F5F7F8", display: "flex", flexDirection: "column" }}>
          <div className="editor-paper" style={{ background: "#FFF", borderRadius: 8, padding: 32, flexGrow: 1, display: "flex", flexDirection: "column", boxShadow: "0 4px 12px rgba(0,0,0,0.02)", border: "1px solid var(--line)" }}>
            {isEditingDisabled && (
              <div className="notice warning" style={{ marginBottom: 16, padding: "10px 16px", borderRadius: 6, fontSize: 13, display: "flex", alignItems: "center", gap: 10 }}>
                <Icon name="lock" />
                <span>Chương truyện đã được duyệt hoặc đang gửi duyệt. Chế độ chỉnh sửa bị khóa để đảm bảo tính an toàn.</span>
              </div>
            )}
            {saveError && (
              <div className="notice warning" style={{ marginBottom: 16, padding: "10px 16px", borderRadius: 6, fontSize: 13 }}>
                {saveError}
              </div>
            )}
            <div className="editor-meta-row" style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>
              <span className="badge badge-blue">Trạng thái: {activeChapter?.moderation_status || "nháp"}</span>
              <span>Tự động lưu đang bật · {editorContent.split(/\s+/).filter(Boolean).length} từ</span>
            </div>
            <input
              className="editor-title"
              value={editorTitle}
              onChange={handleTitleChange}
              disabled={isEditingDisabled}
              placeholder="Tiêu đề chương..."
              style={{
                fontSize: 22,
                fontWeight: "bold",
                border: 0,
                borderBottom: "1px solid var(--line)",
                paddingBottom: 12,
                marginBottom: 20,
                outline: "none",
                width: "100%",
                background: "transparent",
                color: "var(--jungle-dark)"
              }}
            />
            <textarea
              ref={textareaRef}
              className="editor-body"
              value={editorContent}
              onChange={handleContentChange}
              disabled={isEditingDisabled}
              placeholder="Bắt đầu viết nội dung chương tại đây..."
              style={{
                fontSize: 15,
                lineHeight: 1.7,
                border: 0,
                outline: "none",
                resize: "none",
                flexGrow: 1,
                width: "100%",
                background: "transparent"
              }}
            />
          </div>
        </section>

        {/* Right AI Sidebar */}
        <aside className="ai-sidebar ai-agent-sidebar" style={{ borderLeft: "1px solid var(--line)", padding: 16, display: "flex", flexDirection: "column", gap: 16, background: "#fcfcfc", overflowY: "auto" }}>
          <div className="ai-agent-card" style={{ display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--line)", paddingBottom: 16 }}>
            <div className="ai-avatar" aria-hidden="true" style={{ position: "relative", width: 40, height: 40, background: "linear-gradient(135deg, var(--jungle-dark) 0%, #163020 100%)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "bold" }}>
              AI
            </div>
            <div>
              <strong style={{ fontSize: 14, color: "var(--jungle-dark)", display: "block" }}>Miu AI Assistant</strong>
              <small style={{ fontSize: 11, color: "var(--muted)" }}>Biên tập & Gợi ý tình tiết</small>
            </div>
          </div>

          <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>Nhấp &quot;Yêu cầu gợi ý AI&quot; để tạo định hướng nội dung dựa trên 1,000 từ cuối cùng.</p>

            {aiError && (
              <div className="notice warning" style={{ padding: "8px 12px", borderRadius: 6, fontSize: 12, color: "var(--crimson)", background: "rgba(230,57,70,0.05)", borderLeft: "3px solid var(--crimson)" }}>
                {aiError}
              </div>
            )}

            {aiSuggestions.map((item, idx) => (
              <div className="agent-action" key={idx} style={{ background: "#fff", border: "1px solid var(--line)", borderLeft: "3px solid var(--crimson)", padding: 10, borderRadius: 6, display: "flex", flexDirection: "column", gap: 8 }}>
                <div>
                  <strong style={{ fontSize: 12, color: "var(--jungle-dark)", display: "block" }}>{item.title} ({item.style})</strong>
                  <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "var(--muted)", lineHeight: 1.4 }}>{item.content}</p>
                </div>
                <button
                  className="button button-soft"
                  style={{ width: "fit-content", padding: "4px 8px", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}
                  onClick={() => insertSuggestion(item.content)}
                  disabled={isEditingDisabled}
                >
                  <Icon name="edit" /> Chèn vào truyện
                </button>
              </div>
            ))}
          </div>

          <div className="agent-compose" style={{ marginTop: "auto", borderTop: "1px solid var(--line)", paddingTop: 16 }}>
            <div className="field" style={{ marginBottom: 12 }}>
              <input
                className="input"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="Tông giọng (VD: kịch tính, trầm lắng...)"
                style={{ fontSize: 12, padding: "8px 10px" }}
              />
            </div>
            <button className="button button-primary" style={{ width: "100%" }} onClick={handleAiSuggest} disabled={aiLoading || !editorContent.trim()}>
              {aiLoading ? "Đang gợi ý..." : "Yêu cầu gợi ý AI"}
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}

export function PublishScreen() {
  const params = useParams();
  const storyId = params?.id as string;
  const router = useRouter();

  const [chapters, setChapters] = useState<any[]>([]);
  const [allChapters, setAllChapters] = useState<any[]>([]);
  const [selectedChapId, setSelectedChapId] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [publishDate, setPublishDate] = useState("");
  const [agreement, setAgreement] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isLoadingChapters, setIsLoadingChapters] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creatingDraft, setCreatingDraft] = useState(false);

  const loadPublishDrafts = async () => {
    setIsLoadingChapters(true);
    setLoadError(null);
    if (appEnv.useMocks) {
      const mockDrafts = [
        { id: "mock-draft-1", chapter_number: 14, title: "Đêm lạnh ga xưa", content: "Đêm mùa đông ga nhỏ đìu hiu, gió bấc rít qua từng khe cửa gỗ cũ kỹ. An ngồi co ro bên chiếc lò sưởi cũ kỹ bằng sắt rỉ sét, đôi tay lạnh cóng đan chéo vào nhau tìm chút hơi ấm ít ỏi. Cả thềm ga im lìm, không một bóng người qua lại...", moderation_status: "draft" },
        { id: "mock-draft-2", chapter_number: 15, title: "Bức thư thất lạc", content: "Lá thư đã ngả màu ố vàng nằm im lìm dưới đáy ngăn kéo suốt mười năm ròng rã. Linh vô tình tìm thấy nó khi đang dọn dẹp lại đống tài liệu cũ của bố. Nét mực xanh đã phai màu nhưng những dòng chữ gửi gắm hoài bão tuổi trẻ vẫn rõ mồn một...", moderation_status: "draft" }
      ];
      setAllChapters(mockDrafts);
      setChapters(mockDrafts);
      setSelectedChapId(mockDrafts[0].id);
      setIsLoadingChapters(false);
      return;
    }
    try {
      if (!storyId) {
        throw new Error("MISSING_STORY_ID");
      }
      const res = await yagApi.author.getChapters(storyId);
      const authorChapters = res.data || [];
      const drafts = authorChapters.filter(isAuthorDraftChapter);
      setAllChapters(authorChapters);
      setChapters(drafts);
      setSelectedChapId(drafts[0]?.id || "");
    } catch (err) {
      console.error(err);
      setLoadError("Không thể tải danh sách chương nháp của tác phẩm này.");
    } finally {
      setIsLoadingChapters(false);
    }
  };

  useEffect(() => {
    void loadPublishDrafts();
  }, [storyId]);

  const handleCreateStarterDraft = async () => {
    setCreatingDraft(true);
    try {
      const nextNum = getNextChapterNumber(allChapters);
      if (appEnv.useMocks) {
        const newDraft = {
          id: `mock-draft-${Date.now()}`,
          chapter_number: nextNum,
          title: `Chương ${nextNum}: Tiêu đề mới`,
          content: "Nội dung chương viết ở đây...",
          moderation_status: "draft",
        };
        setAllChapters((current) => [...current, newDraft]);
        setChapters((current) => [...current, newDraft]);
        setSelectedChapId(newDraft.id);
        triggerLiveToast("Đã tạo chương nháp mới. Bạn có thể mở không gian viết để hoàn thiện nội dung.");
        return;
      }

      const res = await yagApi.apiFetch<any>("/api/v1/chapters/", {
        method: "POST",
        body: {
          story_id: storyId,
          chapter_number: nextNum,
          title: `Chương ${nextNum}: Tiêu đề mới`,
          content: "Nội dung chương viết ở đây...",
        },
      });
      const newDraft = res.data;
      setAllChapters((current) => [...current, newDraft]);
      setChapters((current) => [...current, newDraft]);
      setSelectedChapId(newDraft.id);
      triggerLiveToast("Đã tạo chương nháp mới. Hãy hoàn thiện nội dung trước khi gửi duyệt.");
    } catch (err) {
      console.error(err);
      triggerLiveToast("Không thể tạo chương nháp mới.", "warning");
    } finally {
      setCreatingDraft(false);
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChapId) {
      triggerLiveToast("Vui lòng chọn chương nháp để xuất bản.", "warning");
      return;
    }
    if (!agreement) {
      triggerLiveToast("Vui lòng xác nhận cam kết nội dung.", "warning");
      return;
    }

    if (publishDate) {
      const scheduleTime = new Date(publishDate).getTime();
      const now = Date.now();
      if (scheduleTime <= now) {
        triggerLiveToast("Thời gian hẹn giờ xuất bản phải ở tương lai.", "warning");
        return;
      }
    }

    setSubmitting(true);
    try {
      if (appEnv.useMocks) {
        triggerLiveToast("Chương đã được gửi thành công. Hệ thống AI đang tiến hành kiểm duyệt...", "success");
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

  const selectedChapter = chapters.find(c => c.id === selectedChapId);

  return (
    <AppShell activeId="s17">
      <section className="panel panel-pad stack" style={{ maxWidth: 750, margin: "0 auto" }}>
        <h2 style={{ fontSize: 18, fontWeight: "bold", margin: "0 0 16px 0", color: "var(--jungle-dark)" }}>Xuất bản chương truyện mới</h2>
        {loadError && (
          <div className="notice warning" style={{ padding: 12, borderRadius: 6, marginBottom: 12 }}>
            {loadError}
            <button className="button button-soft" type="button" onClick={() => void loadPublishDrafts()} style={{ marginLeft: 12, padding: "4px 10px", fontSize: 12 }}>
              Tải lại
            </button>
          </div>
        )}
        <form onSubmit={handlePublish} className="stack" style={{ gap: 20 }}>
          <div className="grid grid-3" style={{ gap: 16 }}>
            <div className="field">
              <label style={{ fontWeight: "bold", fontSize: 13, display: "block", marginBottom: 6 }}>Chọn chương nháp</label>
              {isLoadingChapters ? (
                <div style={{ color: "var(--muted)", fontSize: 12, padding: "8px", border: "1px dashed var(--line)", borderRadius: 6 }}>
                  Đang tải chương nháp...
                </div>
              ) : chapters.length === 0 ? (
                <div style={{ color: "var(--muted)", fontSize: 12, padding: "10px", border: "1px dashed var(--line)", borderRadius: 6, display: "grid", gap: 8 }}>
                  <span>Chưa có chương nháp khả dụng để gửi duyệt.</span>
                  <button className="button button-soft" type="button" onClick={handleCreateStarterDraft} disabled={creatingDraft}>
                    {creatingDraft ? "Đang tạo..." : "Tạo chương nháp"}
                  </button>
                  <Link className="button" href={`/author/stories/${storyId}/edit`}>
                    Mở không gian viết
                  </Link>
                </div>
              ) : (
                <select className="select" value={selectedChapId} onChange={(e) => setSelectedChapId(e.target.value)}>
                  {chapters.map(c => (
                    <option key={c.id} value={c.id}>Chương {c.chapter_number}: {c.title}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="field">
              <label style={{ fontWeight: "bold", fontSize: 13, display: "block", marginBottom: 6 }}>Quyền truy cập</label>
              <select className="select" value={isPremium ? "premium" : "free"} onChange={(e) => setIsPremium(e.target.value === "premium")}>
                <option value="free">Miễn phí (Free)</option>
                <option value="premium">Premium (Cần gói Membership)</option>
              </select>
            </div>
            <div className="field">
              <label style={{ fontWeight: "bold", fontSize: 13, display: "block", marginBottom: 6 }}>Hẹn giờ công bố (Tùy chọn)</label>
              <input type="datetime-local" className="input" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} />
              <small style={{ fontSize: 10, color: "var(--muted)", display: "block", marginTop: 4 }}>Để trống để phát hành ngay sau khi AI duyệt xong.</small>
            </div>
          </div>

          {selectedChapter && (
            <div className="panel panel-pad" style={{ background: "rgba(22, 48, 32, 0.02)", border: "1px solid var(--line)", borderRadius: 8 }}>
              <strong style={{ display: "block", marginBottom: 6, fontSize: 13, color: "var(--jungle-dark)" }}>Chi tiết chương nháp được chọn:</strong>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
                Độ dài: <strong>{selectedChapter.content ? selectedChapter.content.split(/\s+/).filter(Boolean).length : 0} từ</strong> · 
                Ký tự: <strong>{selectedChapter.content ? selectedChapter.content.length : 0} ký tự</strong>
              </div>
              <div style={{ borderLeft: "3px solid var(--crimson)", paddingLeft: 12, fontStyle: "italic", fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
                &ldquo;{selectedChapter.content ? selectedChapter.content.substring(0, 180) + "..." : "Không có nội dung."}&rdquo;
              </div>
            </div>
          )}

          <div className="stack" style={{ gap: 16 }}>
            <label className="pill" style={{ display: "flex", gap: 8, alignItems: "flex-start", cursor: "pointer", padding: "10px", borderRadius: 6, background: "rgba(0,0,0,0.02)", fontSize: 13 }}>
              <input type="checkbox" checked={agreement} onChange={(e) => setAgreement(e.target.checked)} style={{ marginTop: 2 }} /> 
              <span>Tôi cam kết nội dung chương truyện này hoàn toàn tự sáng tác, không vi phạm bản quyền và tuân thủ các quy tắc thuần phong mỹ tục của nền tảng YAG.</span>
            </label>
            <button className="button button-primary" type="submit" disabled={submitting || isLoadingChapters || creatingDraft || chapters.length === 0} style={{ width: "100%", padding: "12px" }}>
              {submitting ? "Đang gửi nội dung..." : "Gửi duyệt & Xuất bản"}
            </button>
            {chapters.length > 0 && (
              <Link className="button" href={`/author/stories/${storyId}/edit`} style={{ width: "100%", justifyContent: "center" }}>
                Mở không gian viết để chỉnh sửa thêm
              </Link>
            )}
          </div>
        </form>
      </section>
    </AppShell>
  );
}

export function ScheduleScreen() {
  const [juneDays, setJuneDays] = useState<any[]>([]);
  
  // Timer States
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  
  // Manual Session Log states
  const [manualDuration, setManualDuration] = useState("");
  const [manualWords, setManualWords] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [sessions, setSessions] = useState<any[]>([]);

  // Commitments targets
  const [commitments, setCommitments] = useState<any[]>([
    { id: "com-1", novel: "Mưa Trên Thành Cũ", targetChaps: 100, currentChaps: 72, deadline: "30/08/2026" },
    { id: "com-2", novel: "Cánh Cửa Sau Sao Băng", targetChaps: 60, currentChaps: 48, deadline: "15/07/2026" }
  ]);

  // Load stopwatch sessions
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("yag.author.sessions");
      if (stored) {
        try { setSessions(JSON.parse(stored)); } catch (e) { setSessions([]); }
      } else {
        const initialMock = [
          { id: "s1", date: "02/06/2026", duration: 45, words: 1200, notes: "Chỉnh sửa thô chương 12" },
          { id: "s2", date: "03/06/2026", duration: 60, words: 1800, notes: "Hoàn thiện chương 13 nháp" },
        ];
        setSessions(initialMock);
        localStorage.setItem("yag.author.sessions", JSON.stringify(initialMock));
      }
    }
  }, []);

  // Generate June 2026 calendar days
  useEffect(() => {
    const daysList = Array.from({ length: 30 }, (_, index) => {
      const dayNum = index + 1;
      let event = null;
      if (dayNum === 4) {
        event = { title: "C14: Đêm lạnh", status: "pending", time: "10:00" };
      } else if (dayNum === 7) {
        event = { title: "C15: Bức thư", status: "approved", time: "15:00" };
      } else if (dayNum === 12) {
        event = { title: "Lịch nháp", status: "draft", time: "08:00" };
      }
      return { dayNum, event };
    });
    setJuneDays(daysList);
  }, []);

  // Timer stopwatch trigger
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  const handleStartTimer = () => {
    setIsTimerRunning(true);
  };

  const handleStopTimer = () => {
    setIsTimerRunning(false);
    const durationMin = Math.round(timerSeconds / 60) || 1;
    const wordsEstimate = durationMin * 30; // Estimate 30 words per minute

    const newSession = {
      id: `session-${Date.now()}`,
      date: new Date().toLocaleDateString("vi-VN"),
      duration: durationMin,
      words: wordsEstimate,
      notes: "Ghi nhận từ bấm giờ trực tiếp",
    };

    const updated = [newSession, ...sessions];
    setSessions(updated);
    localStorage.setItem("yag.author.sessions", JSON.stringify(updated));
    setTimerSeconds(0);
    triggerLiveToast(`Đã lưu phiên làm việc: ${durationMin} phút, ~${wordsEstimate} từ.`);
  };

  const handleAddManualSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualDuration || !manualWords) {
      triggerLiveToast("Vui lòng điền thời gian và số từ viết.", "warning");
      return;
    }
    const newSession = {
      id: `session-${Date.now()}`,
      date: new Date().toLocaleDateString("vi-VN"),
      duration: Number(manualDuration),
      words: Number(manualWords),
      notes: manualNotes || "Tự nhập tay",
    };
    const updated = [newSession, ...sessions];
    setSessions(updated);
    localStorage.setItem("yag.author.sessions", JSON.stringify(updated));
    setManualDuration("");
    setManualWords("");
    setManualNotes("");
    triggerLiveToast("Đã ghi nhận phiên viết tay thành công.");
  };

  const formatTimerTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <AppShell activeId="s18">
      <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr", gap: 24, alignItems: "start" }} className="schedule-workspace">
        {/* Left Column: Calendar Planning & Commitments */}
        <div className="stack" style={{ gap: 24 }}>
          {/* Calendar Panel */}
          <section className="panel panel-pad stack">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <h2 className="section-title" style={{ margin: 0, fontSize: 18, color: "var(--jungle-dark)" }}>Bảng lịch đăng chương</h2>
                <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>Hẹn giờ phát hành & Trạng thái duyệt tự động của AI</p>
              </div>
              <strong style={{ fontSize: 16, color: "var(--jungle-dark)" }}>Tháng 06/2026</strong>
            </div>

            {/* Weekdays header */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, textAlign: "center", fontWeight: "bold", fontSize: 12, color: "var(--muted)", borderBottom: "1px solid var(--line)", paddingBottom: 8 }}>
              <div>T2</div>
              <div>T3</div>
              <div>T4</div>
              <div>T5</div>
              <div>T6</div>
              <div>T7</div>
              <div>CN</div>
            </div>

            {/* Calendar grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, marginTop: 8 }}>
              {/* Padding for first day of June 2026 (June 1st, 2026 is Monday) */}
              {juneDays.map((day) => (
                <div
                  key={day.dayNum}
                  style={{
                    minHeight: 85,
                    border: "1px solid var(--line)",
                    borderRadius: 6,
                    padding: 6,
                    background: day.event ? "rgba(22, 48, 32, 0.02)" : "#fff",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between"
                  }}
                >
                  <strong style={{ fontSize: 11, color: "var(--muted)" }}>{day.dayNum}</strong>
                  {day.event && (
                    <div
                      style={{
                        fontSize: 9,
                        padding: "4px",
                        borderRadius: 4,
                        background:
                          day.event.status === "approved"
                            ? "var(--green-light)"
                            : day.event.status === "pending"
                            ? "var(--blue-light)"
                            : "var(--amber-light)",
                        color:
                          day.event.status === "approved"
                            ? "var(--green)"
                            : day.event.status === "pending"
                            ? "var(--blue)"
                            : "var(--amber)",
                        borderLeft: `2.5px solid ${
                          day.event.status === "approved"
                            ? "var(--green)"
                            : day.event.status === "pending"
                            ? "var(--blue)"
                            : "var(--amber)"
                        }`,
                        lineHeight: 1.2
                      }}
                    >
                      <div style={{ fontWeight: "bold" }}>{day.event.time}</div>
                      <div style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{day.event.title}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Target Commitments */}
          <section className="panel panel-pad stack">
            <h2 className="section-title" style={{ fontSize: 16, margin: "0 0 12px 0", color: "var(--jungle-dark)" }}>Bảng cam kết sáng tác & Tiến độ</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {commitments.map((com) => {
                const percent = Math.min(100, Math.round((com.currentChaps / com.targetChaps) * 100));
                return (
                  <div key={com.id} style={{ borderBottom: "1px solid var(--line)", paddingBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div>
                        <strong style={{ fontSize: 14, color: "var(--foreground)" }}>{com.novel}</strong>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>Hạn hoàn thành: {com.deadline}</div>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: "bold", color: "var(--jungle-dark)" }}>
                        {com.currentChaps} / {com.targetChaps} chương ({percent}%)
                      </span>
                    </div>
                    {/* Progress bar container */}
                    <div style={{ height: 8, background: "var(--line)", borderRadius: 4, overflow: "hidden", position: "relative" }}>
                      <div style={{ width: `${percent}%`, height: "100%", background: "linear-gradient(90deg, var(--jungle-dark) 0%, var(--green) 100%)", borderRadius: 4 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right Column: Writing Tracker & Statistics */}
        <div className="stack" style={{ gap: 24 }}>
          {/* Stopwatch panel */}
          <section className="panel panel-pad stack" style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", color: "#fff" }}>
            <h3 style={{ fontSize: 15, fontWeight: "bold", margin: "0 0 12px 0", color: "#fff" }}>Bộ bấm giờ viết truyện</h3>
            <div style={{ textAlign: "center", margin: "12px 0" }}>
              <div style={{ fontSize: 36, fontWeight: "bold", fontFamily: "monospace", letterSpacing: 2 }}>
                {formatTimerTime(timerSeconds)}
              </div>
              <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                {isTimerRunning ? "Đang ghi nhận thời gian tập trung..." : "Bấm giờ để theo dõi năng suất viết"}
              </p>
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              {!isTimerRunning ? (
                <button className="button button-primary" style={{ padding: "8px 24px", fontSize: 13 }} onClick={handleStartTimer}>
                  Bắt đầu
                </button>
              ) : (
                <button className="button button-crimson" style={{ padding: "8px 24px", fontSize: 13, background: "var(--crimson)", border: 0 }} onClick={handleStopTimer}>
                  Dừng & Ghi
                </button>
              )}
            </div>
          </section>

          {/* Manual Logging Form */}
          <section className="panel panel-pad stack">
            <h3 style={{ fontSize: 14, fontWeight: "bold", margin: "0 0 12px 0", color: "var(--jungle-dark)" }}>Ghi nhận phiên viết tay</h3>
            <form onSubmit={handleAddManualSession} className="stack" style={{ gap: 12 }}>
              <div className="grid grid-2" style={{ gap: 10 }}>
                <div className="field">
                  <label style={{ fontSize: 11, fontWeight: "bold" }}>Số phút viết</label>
                  <input className="input" type="number" min="1" value={manualDuration} onChange={(e) => setManualDuration(e.target.value)} required placeholder="30" style={{ padding: "6px" }} />
                </div>
                <div className="field">
                  <label style={{ fontSize: 11, fontWeight: "bold" }}>Số từ hoàn thành</label>
                  <input className="input" type="number" min="1" value={manualWords} onChange={(e) => setManualWords(e.target.value)} required placeholder="800" style={{ padding: "6px" }} />
                </div>
              </div>
              <div className="field">
                <label style={{ fontSize: 11, fontWeight: "bold" }}>Ghi chú phiên viết</label>
                <input className="input" value={manualNotes} onChange={(e) => setManualNotes(e.target.value)} placeholder="Ví dụ: Lên ý tưởng chương 14" style={{ padding: "6px" }} />
              </div>
              <button className="button button-primary" style={{ padding: "8px", fontSize: 12 }} type="submit">Ghi phiên viết</button>
            </form>
          </section>

          {/* History Panel */}
          <section className="panel panel-pad stack" style={{ maxHeight: 250, overflowY: "auto" }}>
            <h3 style={{ fontSize: 14, fontWeight: "bold", margin: "0 0 10px 0", color: "var(--jungle-dark)" }}>Lịch sử phiên viết</h3>
            {sessions.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--muted)", margin: 0, textAlign: "center" }}>Chưa có phiên nào được lưu.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {sessions.map((s) => (
                  <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, borderBottom: "1px solid var(--line)", paddingBottom: 6 }}>
                    <div>
                      <strong style={{ color: "var(--foreground)" }}>{s.notes}</strong>
                      <div style={{ fontSize: 10, color: "var(--muted)" }}>{s.date} · {s.duration} phút</div>
                    </div>
                    <span style={{ fontWeight: "bold", color: "var(--green)" }}>+{s.words} từ</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Custom CSS Bar Chart for Words Written by Week */}
          <section className="panel panel-pad stack">
            <h3 style={{ fontSize: 14, fontWeight: "bold", margin: "0 0 12px 0", color: "var(--jungle-dark)" }}>Số từ hoàn thành theo tuần</h3>
            <div style={{ display: "flex", justifyContent: "space-around", alignItems: "flex-end", height: 100, borderBottom: "1px solid var(--line)", paddingBottom: 8 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ height: 40, width: 24, background: "var(--line)", borderRadius: "3px 3px 0 0" }} />
                <span style={{ fontSize: 10, color: "var(--muted)" }}>T19</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ height: 55, width: 24, background: "var(--line)", borderRadius: "3px 3px 0 0" }} />
                <span style={{ fontSize: 10, color: "var(--muted)" }}>T20</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ height: 80, width: 24, background: "var(--green)", borderRadius: "3px 3px 0 0" }} />
                <span style={{ fontSize: 10, color: "var(--muted)" }}>T21</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ height: 68, width: 24, background: "var(--jungle-dark)", borderRadius: "3px 3px 0 0" }} />
                <span style={{ fontSize: 10, color: "var(--muted)" }}>T22</span>
              </div>
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", marginTop: 8 }}>Mục tiêu tuần: 8,000 từ</div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
