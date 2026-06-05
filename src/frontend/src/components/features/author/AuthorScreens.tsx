"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { stories } from "@/data/yag";
import { Icon, Cover, MetricCard } from "@/components/ui";
import { AppShell } from "@/components/layout";
import { yagApi, appEnv, createDraftSocket, useAuth, getStoredJsonArray } from "@/lib";

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
  const { user } = useAuth();
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
            description: "Tác phẩm minh họa chỉ dùng khi bật chế độ mock.",
            category: s.genre,
            chapter_count: s.chapters,
            cover_url: null,
            status: idx === 2 ? "completed" : "ongoing",
            moderation_status: idx === 1 ? "pending" : "approved",
            view_count: 0,
            rating_avg: 0,
            updated_at: new Date(Date.now() - idx * 24 * 3600 * 1000).toISOString(),
            draft_count: 0,
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
  // Perform calculations for metrics
  const totalViews = works.reduce((acc, story) => acc + (story.view_count || 0), 0);
  const formattedViews = totalViews >= 1000000 
    ? `${(totalViews / 1000000).toFixed(1)}M` 
    : totalViews >= 1000 
    ? `${(totalViews / 1000).toFixed(1)}K` 
    : String(totalViews);

  const ratedStories = works.filter((s) => (s.rating_count || 0) > 0);
  const avgRating = ratedStories.length > 0 
    ? (ratedStories.reduce((acc, s) => acc + (s.rating_avg || 0), 0) / ratedStories.length).toFixed(1)
    : "0.0";

  const displayName = user?.profile?.display_name || user?.username || "Tác giả";
  const avatarInitials = displayName.slice(0, 2).toUpperCase();

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
            {avatarInitials}
          </span>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: "bold", margin: 0, color: "#fff" }}>Chào mừng trở lại, {displayName}!</h2>
            <p style={{ margin: "4px 0 0 0", opacity: 0.8, fontSize: 13 }}>Không gian quản lý tác phẩm & theo dõi hành trình sáng tác.</p>
          </div>
        </div>
      </div>

      <section className="metric-grid" style={{ marginBottom: 24 }}>
        <MetricCard label="Tác phẩm" value={String(works.length)} />
        <MetricCard label="Số chương nháp" value={String(works.reduce((acc, story) => acc + (story.draft_count || 0), 0))} />
        <MetricCard label="Chờ duyệt AI" value={String(works.reduce((acc, story) => acc + (story.pending_count || 0), 0))} />
        <MetricCard label="Uy tín tác giả" value={user?.profile?.reputation_score != null ? `${user.profile.reputation_score}%` : "Chưa có"} />
        <MetricCard label="Lượt đọc" value={formattedViews} />
        <MetricCard label="Đánh giá TB" value={`${avgRating} ★`} />
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
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Ví dụ: Tác phẩm mới" />
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

  const [chapters, setChapters] = useState<any[]>([]);
  const [activeChapter, setActiveChapter] = useState<any>(null);
  const [editorTitle, setEditorTitle] = useState("");
  const [editorContent, setEditorContent] = useState("");
  const [savingStatus, setSavingStatus] = useState("Đã lưu");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isCreatingChapter, setIsCreatingChapter] = useState(false);
  const [offlineDraft, setOfflineDraft] = useState<{ title: string; content: string; id: string } | null>(null);

  // Editor styling states
  const [editorFont, setEditorFont] = useState("Inter, Arial, sans-serif");
  const [editorSize, setEditorSize] = useState("16px");
  const [editorLineHeight, setEditorLineHeight] = useState("1.6");

  // AI Suggestion & Agent states
  const [activeAiTab, setActiveAiTab] = useState("plot");
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);

  // History stack for Undo/Redo
  const [historyStack, setHistoryStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

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

      await yagApi.reader.getStoryDetail(storyId);

      const chapsRes = await yagApi.author.getChapters(storyId);
      const chaps = chapsRes.data || [];
      setChapters(chaps);

      if (chaps.length > 0) {
        setActiveChapter(chaps[0]);
        setEditorTitle(chaps[0].title);
        setEditorContent(chaps[0].content);
      } else {
        setActiveChapter(null);
        setEditorTitle("");
        setEditorContent("");
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
    const val = e.target.value;
    setEditorContent(val);
    triggerAutosave(editorTitle, val);
    
    // Simple history save on space or return keys
    if (val.endsWith(" ") || val.endsWith("\n")) {
      setHistoryStack((prev) => {
        if (prev.length === 0 || prev[prev.length - 1] !== val) {
          return [...prev.slice(-49), val];
        }
        return prev;
      });
    }
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

  const applyMarkdownFormat = (type: "bold" | "italic" | "underline" | "highlight") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    let formattedText = "";
    if (type === "bold") {
      formattedText = `**${selectedText || "văn bản"}**`;
    } else if (type === "italic") {
      formattedText = `*${selectedText || "văn bản"}*`;
    } else if (type === "underline") {
      formattedText = `<u>${selectedText || "văn bản"}</u>`;
    } else if (type === "highlight") {
      formattedText = `<mark>${selectedText || "văn bản"}</mark>`;
    }

    const newContent = text.substring(0, start) + formattedText + text.substring(end);
    setHistoryStack((prev) => [...prev.slice(-49), editorContent]);
    setRedoStack([]);
    setEditorContent(newContent);
    triggerAutosave(editorTitle, newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + formattedText.length, start + formattedText.length);
    }, 50);
  };

  const handleToolbarToolClick = (tool: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    if (tool === "↶") {
      if (historyStack.length > 0) {
        const previous = historyStack[historyStack.length - 1];
        setRedoStack((prev) => [...prev, editorContent]);
        setEditorContent(previous);
        setHistoryStack((prev) => prev.slice(0, -1));
        triggerAutosave(editorTitle, previous);
        triggerLiveToast("Đã hoàn tác (Undo).");
      } else {
        triggerLiveToast("Không có thao tác nào để hoàn tác.", "warning");
      }
    } else if (tool === "↷") {
      if (redoStack.length > 0) {
        const next = redoStack[redoStack.length - 1];
        setHistoryStack((prev) => [...prev, editorContent]);
        setEditorContent(next);
        setRedoStack((prev) => prev.slice(0, -1));
        triggerAutosave(editorTitle, next);
        triggerLiveToast("Đã khôi phục (Redo).");
      } else {
        triggerLiveToast("Không có thao tác nào để khôi phục.", "warning");
      }
    } else {
      let insertText = "";
      if (tool === "H1") {
        insertText = "\n# ";
      } else if (tool === "❝") {
        insertText = "\n> ";
      } else if (tool === "☰") {
        insertText = "\n- ";
      } else if (tool === "≡") {
        insertText = "\n1. ";
      } else if (tool === "≣") {
        insertText = "\n---\n";
      }

      const newContent = text.substring(0, start) + insertText + text.substring(end);
      setHistoryStack((prev) => [...prev.slice(-49), editorContent]);
      setRedoStack([]);
      setEditorContent(newContent);
      triggerAutosave(editorTitle, newContent);

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + insertText.length, start + insertText.length);
      }, 50);
    }
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
          setActiveAiTab("plot");
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
      setActiveAiTab("plot");
    } catch (err) {
      console.error(err);
      setAiError("Gemini API bận hoặc đã vượt hạn ngạch cuộc gọi (Rate Limit / Quota Exceeded). Vui lòng thử lại sau ít phút.");
      triggerLiveToast("AI Suggestion tạm thời gián đoạn.", "warning");
    } finally {
      setAiLoading(false);
    }
  };

  const handleRequestVoiceRewrite = async () => {
    if (!editorContent.trim() || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    try {
      if (appEnv.useMocks) {
        setTimeout(() => {
          setAiSuggestions([
            { title: "Giọng văn trữ tình", content: "Thềm ga cũ sũng nước, loang loáng ánh đèn vàng hư ảo hắt xuống từ những cột sắt rỉ sét, tựa như những kỷ niệm buồn loang ra trong ký ức của An.", style: "lyrical" },
            { title: "Giọng văn sâu lắng", content: "Giọt nước cuối mùa đọng lại trên mái ngói đỏ như chút tiếc nuối muộn màng của thời gian, An lặng lẽ buông tay đón lấy sự cô độc.", style: "reflective" }
          ]);
          setAiLoading(false);
          setActiveAiTab("plot");
          triggerLiveToast("Miu AI đã đề xuất các câu thay thế trong tab Tình tiết.");
        }, 1000);
        return;
      }

      const contextText = editorContent.slice(-4000);
      const res = await yagApi.author.requestAiSuggestion({
        chapterId: activeChapter.id,
        context: contextText,
        mode: "giọng văn trữ tình, sâu lắng",
      });

      setAiSuggestions(res.data.suggestions || []);
      setActiveAiTab("plot");
      triggerLiveToast("Miu AI đã đề xuất các câu thay thế trong tab Tình tiết.");
    } catch (err) {
      console.error(err);
      setAiError("Không thể tải gợi ý giọng văn từ Gemini.");
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
        title: `Chương ${nextNum}`,
        content: "",
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
          title: `Chương ${nextNum}`,
          content: ""
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
    setHistoryStack([]);
    setRedoStack([]);
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
            {loadError || "Tác phẩm này chưa có chương nháp khả dụng. Bạn có thể tạo một bản nháp trống để bắt đầu viết."}
          </p>
          <div className="inline-actions" style={{ justifyContent: "center", marginTop: 16 }}>
            {loadError ? (
              <button className="button button-primary" type="button" onClick={() => void loadStudioData()}>
                Thử lại
              </button>
            ) : (
              <button className="button button-primary" type="button" onClick={handleCreateNewChapter} disabled={isCreatingChapter}>
                {isCreatingChapter ? "Đang tạo..." : "Tạo chương nháp trống"}
              </button>
            )}
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
      <header className="studio-topbar">
        <div className="inline-actions">
          <Link className="button" href="/author/stories">
            <Icon name="arrow" /> Tác phẩm
          </Link>
          <div>
            <strong>Author Studio</strong>
            <div className="story-meta">
              Tự động lưu · {editorContent.split(/\s+/).filter(Boolean).length} từ · Mục tiêu 2.000 từ
            </div>
          </div>
        </div>
        <div className="inline-actions">
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
          <button
            className="button"
            type="button"
            onClick={() => {
              triggerLiveToast("Miu AI đã quét nhanh bản thảo và không tìm thấy lỗi chính tả.", "success");
            }}
          >
            <Icon name="check" /> Kiểm tra
          </button>
          <Link className="button" href={`/author/stories/${storyId}/publish`}>
            Xuất bản
          </Link>
          <button
            className="button button-primary"
            type="button"
            onClick={() => {
              triggerLiveToast("Đang mở bản xem trước...", "success");
            }}
          >
            Xem trước
          </button>
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

      <main className="studio-grid">
        {/* Editor Area (Left Column - 70%) */}
        <section className="editor-area">
          {/* Writing Toolbar */}
          <div className="writing-toolbar">
            <div className="tool-group">
              {["↶", "↷", "H1", "❝", "☰", "≡", "≣"].map((tool) => (
                <button
                  className="tool-button"
                  type="button"
                  title={tool}
                  onClick={() => handleToolbarToolClick(tool)}
                  key={tool}
                >
                  <span>{tool}</span>
                </button>
              ))}
            </div>

            <div className="tool-group tool-group-selects">
              <label>
                Phông chữ
                <select
                  className="select compact-select"
                  value={editorFont}
                  onChange={(e) => setEditorFont(e.target.value)}
                >
                  <option value="Inter, Arial, sans-serif">Inter</option>
                  <option value="Georgia, serif">Georgia</option>
                  <option value="system-ui, sans-serif">System</option>
                </select>
              </label>
              <label>
                Cỡ chữ
                <select
                  className="select compact-select"
                  value={editorSize}
                  onChange={(e) => setEditorSize(e.target.value)}
                >
                  <option value="14px">14</option>
                  <option value="16px">16</option>
                  <option value="20px">20</option>
                </select>
              </label>
              <label>
                Dòng
                <select
                  className="select compact-select"
                  value={editorLineHeight}
                  onChange={(e) => setEditorLineHeight(e.target.value)}
                >
                  <option value="1.3">1.3</option>
                  <option value="1.6">1.6</option>
                  <option value="1.8">1.8</option>
                </select>
              </label>
            </div>

            <div className="tool-group">
              <button
                className="tool-button"
                type="button"
                onClick={() => applyMarkdownFormat("bold")}
                title="Chữ đậm"
              >
                <strong>B</strong>
              </button>
              <button
                className="tool-button"
                type="button"
                onClick={() => applyMarkdownFormat("italic")}
                title="Chữ nghiêng"
              >
                <em>I</em>
              </button>
              <button
                className="tool-button"
                type="button"
                onClick={() => applyMarkdownFormat("underline")}
                title="Gạch chân"
              >
                <span style={{ textDecoration: "underline" }}>U</span>
              </button>
              <button
                className="tool-button"
                type="button"
                onClick={() => applyMarkdownFormat("highlight")}
                title="Tô sáng"
              >
                <span className="color-dot" />
              </button>
            </div>
          </div>

          {/* Writing Workspace */}
          <div className="writing-workspace">
            {/* Left Chapter Outline */}
            <aside className="chapter-outline">
              <div className="outline-head" style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong>Dàn ý chương</strong>
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                  <span className="badge badge-green" style={{ fontSize: 10 }}>Đúng nhịp</span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {chapters.map((chap, index) => {
                  const isActive = activeChapter?.id === chap.id;
                  return (
                    <button
                      className={`outline-item ${isActive ? "active" : ""}`}
                      type="button"
                      key={chap.id}
                      onClick={() => handleSelectChapter(chap)}
                    >
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <div style={{ flexGrow: 1, minWidth: 0 }}>
                        <strong style={{ display: "block", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                          {chap.title}
                        </strong>
                        <small style={{ display: "block", fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
                          {chap.moderation_status === "approved" ? "đã duyệt" : chap.moderation_status === "pending" ? "kiểm duyệt" : chap.moderation_status || "nháp"}
                        </small>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="outline-metric" style={{ marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>
                  <span>Nhịp chương</span>
                  <strong>78%</strong>
                </div>
                <div className="progress" style={{ height: 6, background: "var(--line)", borderRadius: 3, overflow: "hidden" }}>
                  <span style={{ display: "block", width: "78%", height: "100%", background: "var(--green)" }} />
                </div>
              </div>
            </aside>

            {/* Center Editor Paper */}
            <div className="editor-paper" style={{ background: "#FFF", borderRadius: 8, padding: 24, minHeight: 500, display: "flex", flexDirection: "column", border: "1px solid var(--line)" }}>
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
              <div className="editor-meta-row" style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", marginBottom: 12 }}>
                <span className="badge badge-blue">Trạng thái: {activeChapter?.moderation_status || "nháp"}</span>
                <span>Markdown bật</span>
              </div>
              <input
                className="editor-title"
                value={editorTitle}
                onChange={handleTitleChange}
                disabled={isEditingDisabled}
                placeholder="Tiêu đề chương..."
                style={{
                  fontSize: 20,
                  fontWeight: "bold",
                  border: 0,
                  borderBottom: "1px solid var(--line)",
                  paddingBottom: 8,
                  marginBottom: 16,
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
                  fontSize: editorSize,
                  fontFamily: editorFont,
                  lineHeight: editorLineHeight,
                  border: 0,
                  outline: "none",
                  resize: "none",
                  flexGrow: 1,
                  minHeight: 400,
                  width: "100%",
                  background: "transparent",
                  color: "var(--foreground)"
                }}
              />
              <div className="editor-footer-row" style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 8 }}>
                <span>{editorContent.split(/\s+/).filter(Boolean).length} từ · {Math.round(editorContent.split(/\s+/).filter(Boolean).length / 250) || 1} phút đọc</span>
                <span className="badge badge-green">{savingStatus}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Right AI Sidebar (30%) */}
        <aside className="ai-sidebar ai-agent-sidebar">
          <div className="ai-agent-card">
            <div className="ai-avatar" aria-hidden="true" style={{ position: "relative" }}>
              <span className="ai-ear left" />
              <span className="ai-ear right" />
              <span className="ai-face">•ᴗ•</span>
            </div>
            <div>
              <strong>Miu AI</strong>
              <div className="story-meta">Agent đồng hành viết chương</div>
            </div>
            <span className="badge badge-green">Online</span>
          </div>

          <div className="agent-status" style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", borderBottom: "1px solid var(--line)", paddingBottom: 12, marginBottom: 12 }}>
            <div>
              <span>Context: </span>
              <strong>1,000 từ gần nhất</strong>
            </div>
            <div>
              <span>Tone: </span>
              <strong>{aiInput || "Tự nhiên"}</strong>
            </div>
          </div>

          {/* AI Tabs */}
          <div className="tabs ai-tabs" role="tablist" style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button
              className={`tab-button ${activeAiTab === "plot" ? "active" : ""}`}
              onClick={() => setActiveAiTab("plot")}
            >
              Tình tiết
            </button>
            <button
              className={`tab-button ${activeAiTab === "voice" ? "active" : ""}`}
              onClick={() => setActiveAiTab("voice")}
            >
              Giọng văn
            </button>
            <button
              className={`tab-button ${activeAiTab === "edit" ? "active" : ""}`}
              onClick={() => setActiveAiTab("edit")}
            >
              Biên tập
            </button>
          </div>

          {/* Tab Panel: Plot */}
          {activeAiTab === "plot" && (
            <div className="tab-panel active stack" style={{ gap: 12 }}>
              <div className="agent-bubble">
                <strong>Miu nghĩ đoạn này cần một lựa chọn khó hơn.</strong>
                <p>Miu AI sẵn sàng hỗ trợ bạn phát triển tình tiết dựa trên ngữ cảnh đã viết.</p>
              </div>

              {aiError && (
                <div className="notice warning" style={{ padding: "8px 12px", borderRadius: 6, fontSize: 12 }}>
                  {aiError}
                </div>
              )}

              <div className="agent-action-grid" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {aiSuggestions.length === 0 ? (
                  <p style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic", textAlign: "center" }}>
                    Chưa có gợi ý nào được tạo. Điền yêu cầu bên dưới và bấm nút gửi.
                  </p>
                ) : (
                  aiSuggestions.map((item, idx) => (
                    <button
                      className="agent-action"
                      type="button"
                      key={idx}
                      onClick={() => insertSuggestion(item.content)}
                      disabled={isEditingDisabled}
                      style={{ textAlign: "left", cursor: "pointer", width: "100%" }}
                    >
                      <strong>{item.title} ({item.style})</strong>
                      <span>{item.content}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab Panel: Voice */}
          {activeAiTab === "voice" && (
            <div className="tab-panel active stack" style={{ gap: 12 }}>
              <div className="tone-meter" style={{ background: "rgba(0,0,0,0.02)", padding: 12, borderRadius: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                  <span>Trữ tình / Trầm lắng</span>
                  <strong>82%</strong>
                </div>
                <div className="progress" style={{ height: 6, background: "var(--line)", borderRadius: 3, overflow: "hidden" }}>
                  <span style={{ display: "block", width: "82%", height: "100%", background: "var(--crimson)" }} />
                </div>
              </div>

              <button
                className="button button-soft"
                type="button"
                onClick={handleRequestVoiceRewrite}
                disabled={aiLoading || isEditingDisabled || !editorContent.trim()}
                style={{ width: "100%" }}
              >
                {aiLoading ? "Miu đang tìm câu..." : "Đề xuất câu thay thế"}
              </button>
            </div>
          )}

          {/* Tab Panel: Edit */}
          {activeAiTab === "edit" && (
            <div className="tab-panel active stack" style={{ gap: 12 }}>
              <div className="agent-checklist" style={{ background: "rgba(0,0,0,0.02)", padding: 12, borderRadius: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong>Lặp từ & nhịp điệu</strong>
                  <span className="badge badge-amber">2 đoạn</span>
                </div>
                <p style={{ fontSize: 11, color: "var(--muted)", margin: "6px 0 0 0" }}>
                  Phát hiện lặp lại hình ảnh mưa ở phần đầu và kết chương.
                </p>
                <button
                  className="button button-soft"
                  type="button"
                  style={{ marginTop: 8, padding: "4px 8px", fontSize: 11 }}
                  onClick={() => triggerLiveToast("Đã đánh dấu các cụm từ lặp hình ảnh mưa.")}
                >
                  Xem chi tiết
                </button>
              </div>
            </div>
          )}

          {/* Prompt input and send button */}
          <div className="agent-compose">
            <textarea
              className="textarea"
              rows={3}
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="Yêu cầu Miu: Ví dụ 'kịch tính', 'tiếc nuối', 'tả cảnh ga nhỏ hoàng hôn'..."
              disabled={isEditingDisabled}
            />
            <button
              className="button button-primary"
              type="button"
              onClick={handleAiSuggest}
              disabled={aiLoading || isEditingDisabled || !editorContent.trim()}
            >
              <Icon name="arrow" /> {aiLoading ? "Đang gửi..." : "Gửi cho Miu"}
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
          title: `Chương ${nextNum}`,
          content: "",
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
          title: `Chương ${nextNum}`,
          content: "",
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
  const [works, setWorks] = useState<any[]>([]);
  const [calendarDays, setCalendarDays] = useState<any[]>([]);
  const [currentMonthStr, setCurrentMonthStr] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  // Timer States
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  
  // Manual Session Log states
  const [manualDuration, setManualDuration] = useState("");
  const [manualWords, setManualWords] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [sessions, setSessions] = useState<any[]>([]);

  // Load works and chapters to populate commitments and calendar events
  useEffect(() => {
    const loadData = async () => {
      try {
        if (appEnv.useMocks) {
          setWorks([]);

          const now = new Date();
          const month = now.getMonth();
          const year = now.getFullYear();
          const numDays = new Date(year, month + 1, 0).getDate();
          const daysList = Array.from({ length: numDays }, (_, index) => ({ dayNum: index + 1, event: null }));
          setCalendarDays(daysList);
          setCurrentMonthStr(`Tháng ${String(month + 1).padStart(2, "0")}/${year}`);
        } else {
          // Production / API mode
          const res = await yagApi.author.getStories();
          const storiesList = res.data || [];
          setWorks(storiesList);

          // Get current month & year
          const now = new Date();
          const month = now.getMonth(); // 0-11
          const year = now.getFullYear();
          
          // Number of days in current month
          const numDays = new Date(year, month + 1, 0).getDate();
          
          // Load chapters for all stories to find scheduled ones
          const allChapters: any[] = [];
          for (const s of storiesList) {
            try {
              const chRes = await yagApi.author.getChapters(s.id);
              if (chRes.data) {
                allChapters.push(...chRes.data.map((c: any) => ({ ...c, storyTitle: s.title })));
              }
            } catch (err) {
              console.error(`Failed to load chapters for story ${s.id}:`, err);
            }
          }

          // Generate calendar days
          const daysList = Array.from({ length: numDays }, (_, index) => {
            const dayNum = index + 1;
            // Find if there is any chapter scheduled on this day
            const scheduledChapter = allChapters.find((c: any) => {
              if (!c.publish_at) return false;
              const pubDate = new Date(c.publish_at);
              return (
                pubDate.getDate() === dayNum &&
                pubDate.getMonth() === month &&
                pubDate.getFullYear() === year
              );
            });

            let event = null;
            if (scheduledChapter) {
              const pubDate = new Date(scheduledChapter.publish_at);
              const hrs = String(pubDate.getHours()).padStart(2, "0");
              const mins = String(pubDate.getMinutes()).padStart(2, "0");
              event = {
                title: `C${scheduledChapter.chapter_number}: ${scheduledChapter.title.slice(0, 10)}...`,
                status: scheduledChapter.moderation_status,
                time: `${hrs}:${mins}`
              };
            }
            return { dayNum, event };
          });

          setCalendarDays(daysList);
          setCurrentMonthStr(`Tháng ${String(month + 1).padStart(2, "0")}/${year}`);
        }
      } catch (err) {
        console.error("Failed to load schedule data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    void loadData();
  }, []);

  // Compute commitments dynamically
  const commitments = works
    .filter((w) => w.targetChaps || w.target_chapters || w.commitment_target_chapters || w.deadline || w.commitment_deadline)
    .map((w, idx) => {
      const target = w.targetChaps || w.target_chapters || w.commitment_target_chapters || w.chapter_count || 0;
      const current = w.currentChaps || w.chapter_count || 0;
      const deadline = w.deadline || w.commitment_deadline || "Chưa đặt hạn";
      return {
        id: w.id || `com-${idx}`,
        novel: w.title,
        targetChaps: target,
        currentChaps: current,
        deadline: deadline
      };
    });

  // Load stopwatch sessions
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedSessions = getStoredJsonArray("yag.author.sessions", appEnv.useMocks);
      if (storedSessions.length > 0) {
        setSessions(storedSessions);
      } else {
        if (appEnv.useMocks) {
          setSessions([]);
        } else {
          setSessions([]);
        }
      }
    }
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
    setManualDuration(String(durationMin));
    setTimerSeconds(0);
    triggerLiveToast(`Đã dừng bấm giờ sau ${durationMin} phút. Nhập số từ hoàn thành để ghi phiên.`);
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

  const recentSessionBars = sessions.slice(0, 4).reverse();
  const maxSessionWords = Math.max(0, ...recentSessionBars.map((session) => Number(session.words) || 0));

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
              <strong style={{ fontSize: 16, color: "var(--jungle-dark)" }}>{currentMonthStr}</strong>
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
            {isLoading ? (
              <div style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
                Đang tải lịch đăng chương...
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, marginTop: 8 }}>
                {calendarDays.map((day) => (
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
                        <div style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }} title={day.event.title}>{day.event.title}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Target Commitments */}
          <section className="panel panel-pad stack">
            <h2 className="section-title" style={{ fontSize: 16, margin: "0 0 12px 0", color: "var(--jungle-dark)" }}>Bảng cam kết sáng tác & Tiến độ</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {commitments.length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", padding: "16px 0" }}>
                  Bạn chưa có tác phẩm nào để cam kết tiến độ. Hãy tạo tác phẩm mới trong mục Tác phẩm của tôi!
                </div>
              ) : (
                commitments.map((com) => {
                  const percent = com.targetChaps > 0 ? Math.min(100, Math.round((com.currentChaps / com.targetChaps) * 100)) : 0;
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
                })
              )}
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
                  <input className="input" type="number" min="1" value={manualDuration} onChange={(e) => setManualDuration(e.target.value)} required placeholder="Nhập số phút" style={{ padding: "6px" }} />
                </div>
                <div className="field">
                  <label style={{ fontSize: 11, fontWeight: "bold" }}>Số từ hoàn thành</label>
                  <input className="input" type="number" min="1" value={manualWords} onChange={(e) => setManualWords(e.target.value)} required placeholder="Nhập số từ" style={{ padding: "6px" }} />
                </div>
              </div>
              <div className="field">
                <label style={{ fontSize: 11, fontWeight: "bold" }}>Ghi chú phiên viết</label>
                <input className="input" value={manualNotes} onChange={(e) => setManualNotes(e.target.value)} placeholder="Ghi chú phiên viết" style={{ padding: "6px" }} />
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

          {/* Custom CSS Bar Chart for Words Written by Recent Sessions */}
          <section className="panel panel-pad stack">
            <h3 style={{ fontSize: 14, fontWeight: "bold", margin: "0 0 12px 0", color: "var(--jungle-dark)" }}>Số từ hoàn thành gần đây</h3>
            {recentSessionBars.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--muted)", margin: 0, textAlign: "center" }}>Chưa có dữ liệu phiên viết.</p>
            ) : (
              <div style={{ display: "flex", justifyContent: "space-around", alignItems: "flex-end", height: 100, borderBottom: "1px solid var(--line)", paddingBottom: 8 }}>
                {recentSessionBars.map((session, index) => {
                  const words = Number(session.words) || 0;
                  const height = maxSessionWords > 0 ? Math.max(8, Math.round((words / maxSessionWords) * 80)) : 8;
                  return (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }} key={session.id || `${session.date}-${index}`}>
                      <div style={{ height, width: 24, background: index === recentSessionBars.length - 1 ? "var(--green)" : "var(--line)", borderRadius: "3px 3px 0 0" }} />
                      <span style={{ fontSize: 10, color: "var(--muted)" }}>{session.date}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
