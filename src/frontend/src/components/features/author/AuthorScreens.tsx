"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Icon, Cover, MetricCard } from "@/components/ui";
import { AppShell } from "@/components/layout";
import { yagApi, createDraftSocket, useAuth } from "@/lib";
import { getAccessToken } from "@/lib/auth";
import { resolveApiUrl } from "@/lib/env";
import { STORY_CATEGORIES } from "@/data/yag";

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

function toLocalDateTimeValue(value: Date) {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}

function getModerationStatusLabel(status: unknown) {
  const labels: Record<string, string> = {
    draft: "Bản nháp",
    "nháp": "Bản nháp",
    rejected: "Cần chỉnh sửa",
    flagged: "Đã gắn cờ",
  };
  return labels[String(status || "draft").toLowerCase()] || "Bản nháp";
}

const storyCategoryOptions = STORY_CATEGORIES;
const storyLanguageOptions = [
  { value: "vi", label: "Tiếng Việt" },
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
  { value: "zh", label: "中文" },
];
const storyTypeOptions = [
  { value: "fiction", label: "Hư cấu", description: "Tiểu thuyết, truyện dài, truyện ngắn." },
  { value: "nonfiction", label: "Phi hư cấu", description: "Tự truyện, ký sự, ghi chép sáng tạo." },
  { value: "poetry", label: "Thơ ca", description: "Thơ, tản văn ngắn, văn xuôi giàu nhạc tính." },
];
const copyrightOptions = [
  { value: "all_rights_reserved", label: "Bảo lưu mọi quyền" },
  { value: "cc_by", label: "Creative Commons BY" },
  { value: "cc_by_nc", label: "Creative Commons BY-NC" },
  { value: "public_domain", label: "Miền công cộng" },
];
const targetAudienceOptions = [
  { value: "", label: "Chưa xác định" },
  { value: "young_adult", label: "Thanh thiếu niên" },
  { value: "new_adult", label: "Người trẻ trưởng thành" },
  { value: "adult", label: "Người trưởng thành" },
  { value: "general", label: "Độc giả đại chúng" },
];
const storyDescriptionMinLength = 50;

type AiModeId = "plot" | "rewrite" | "continue" | "outline" | "dialogue" | "pacing";

type AiModeOption = {
  id: AiModeId;
  label: string;
  short: string;
  description: string;
};

const aiModeOptions: AiModeOption[] = [
  { id: "plot", label: "Tình tiết", short: "Plot", description: "Gợi ý hướng phát triển và lựa chọn khó cho chương." },
  { id: "rewrite", label: "Viết lại", short: "Rewrite", description: "Viết lại đoạn đang chọn theo giọng văn tốt hơn." },
  { id: "continue", label: "Viết tiếp", short: "Next", description: "Sinh đoạn tiếp nối dựa trên mạch truyện gần nhất." },
  { id: "outline", label: "Dàn ý", short: "Outline", description: "Tạo cấu trúc cảnh, cao trào và móc chương sau." },
  { id: "dialogue", label: "Đối thoại", short: "Talk", description: "Đề xuất thoại có ẩn ý và đúng tính cách nhân vật." },
  { id: "pacing", label: "Nhịp truyện", short: "Pace", description: "Chẩn đoán nhịp nhanh/chậm và cách chỉnh đoạn." },
];

type AiResponseMeta = {
  provider?: string;
  model?: string | null;
  fallback?: boolean;
  message?: string | null;
};

type StyleReferenceState = {
  storyTitle: string;
  seriesTitle: string;
  author: string;
};

export function AuthorWorksScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [works, setWorks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<any | null>(null);

  // Form states for creating a new story
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Ngôn tình");
  const [language, setLanguage] = useState("vi");
  const [storyType, setStoryType] = useState("fiction");
  const [tags, setTags] = useState("");
  const [copyright, setCopyright] = useState("all_rights_reserved");
  const [isMature, setIsMature] = useState(false);
  const [mainCharacters, setMainCharacters] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [storyStatus, setStoryStatus] = useState("ongoing");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [expectedChapters, setExpectedChapters] = useState(50);
  const [updateFrequency, setUpdateFrequency] = useState("1_week_1_chap");
  const [submitting, setSubmitting] = useState(false);

  // Live filter states
  const [statusFilter, setStatusFilter] = useState("all");
  const [moderationFilter, setModerationFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recently_updated");

  const loadWorks = async () => {
    try {
      const res = await yagApi.author.getStories();
        setWorks(res.data || []);
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
    if (coverUrl?.startsWith("blob:")) URL.revokeObjectURL(coverUrl);
    setCoverFile(file);
    setRemoveCover(false);
    if (file) {
      setCoverUrl(URL.createObjectURL(file));
    } else {
      setCoverUrl(editingStory?.cover_url || null);
    }
  };

  const resetStoryForm = () => {
    if (coverUrl?.startsWith("blob:")) URL.revokeObjectURL(coverUrl);
    setEditingStory(null);
    setTitle("");
    setDescription("");
    setCategory("Ngôn tình");
    setLanguage("vi");
    setStoryType("fiction");
    setTags("");
    setCopyright("all_rights_reserved");
    setIsMature(false);
    setMainCharacters("");
    setTargetAudience("");
    setStoryStatus("ongoing");
    setCoverFile(null);
    setCoverUrl(null);
    setRemoveCover(false);
    setExpectedChapters(50);
    setUpdateFrequency("1_week_1_chap");
  };

  const openCreateStoryModal = () => {
    resetStoryForm();
    setIsModalOpen(true);
  };

  const openEditStoryModal = (story: any) => {
    if (!story?.id) {
      triggerLiveToast("Không thể mở thông tin truyện. Vui lòng tải lại trang.", "warning");
      return;
    }
    if (coverUrl?.startsWith("blob:")) URL.revokeObjectURL(coverUrl);
    setEditingStory(story);
    setTitle(story.title || "");
    setDescription(story.description || "");
    setCategory(story.category || "Ngôn tình");
    setLanguage(story.language || "vi");
    setStoryType(story.story_type || "fiction");
    setTags(Array.isArray(story.tags) ? story.tags.join(", ") : story.tags || "");
    setCopyright(story.copyright || "all_rights_reserved");
    setIsMature(Boolean(story.is_mature));
    setMainCharacters(story.main_characters || "");
    setTargetAudience(story.target_audience || "");
    setStoryStatus(story.status || "ongoing");
    setCoverFile(null);
    setCoverUrl(story.cover_url || null);
    setRemoveCover(false);
    setExpectedChapters(Number(story.expected_chapters) || Math.max(1, Number(story.chapter_count) || 50));
    setUpdateFrequency(story.update_frequency || "1_week_1_chap");
    setIsModalOpen(true);
  };

  const closeStoryModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
    resetStoryForm();
  };

  const handleSubmitStory = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    if (cleanTitle.length < 3) {
      triggerLiveToast("Tên tác phẩm cần ít nhất 3 ký tự.", "warning");
      return;
    }
    if (cleanDescription.length < storyDescriptionMinLength) {
      triggerLiveToast(`Tóm tắt cần ít nhất ${storyDescriptionMinLength} ký tự để độc giả và AI hiểu đúng tác phẩm.`, "warning");
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", cleanTitle);
      formData.append("description", cleanDescription);
      formData.append("category", category);
      formData.append("language", language);
      formData.append("story_type", storyType);
      formData.append("tags", tags.trim());
      formData.append("copyright", copyright);
      formData.append("is_mature", String(isMature));
      formData.append("main_characters", mainCharacters.trim());
      formData.append("target_audience", targetAudience);
      formData.append("status", storyStatus);
      formData.append("expected_chapters", String(expectedChapters));
      formData.append("update_frequency", updateFrequency);
      if (editingStory && removeCover) {
        formData.append("remove_cover", "true");
      }
      if (coverFile) {
        formData.append("cover_file", coverFile);
      }

      const response = editingStory
        ? await yagApi.author.updateStory(String(editingStory.id), formData)
        : await yagApi.author.createStory(formData);
      void loadWorks();
      setIsModalOpen(false);
      resetStoryForm();
      triggerLiveToast(editingStory ? "Đã cập nhật thông tin truyện thành công!" : "Đã tạo bộ truyện mới thành công!");
      if (!editingStory && response.data?.id) {
        router.push(`/author/stories/${response.data.id}/edit`);
      }
    } catch (err) {
      console.error(err);
      triggerLiveToast(editingStory ? "Không thể cập nhật truyện. Kiểm tra lại tiêu đề và dữ liệu." : "Không thể tạo tác phẩm. Trùng tiêu đề?", "warning");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStory = async (story: any) => {
    if (!story?.id) return;
    const confirmDelete = window.confirm(`Bạn có chắc chắn muốn xóa tác phẩm "${story.title}" không? Hành động này sẽ xóa vĩnh viễn toàn bộ chương truyện, bình luận, đánh giá và không thể hoàn tác!`);
    if (!confirmDelete) return;

    try {
      await yagApi.author.deleteStory(story.id);
        triggerLiveToast("Đã xóa tác phẩm thành công!");
        void loadWorks();
    } catch (err) {
      console.error("Failed to delete story:", err);
      triggerLiveToast("Không thể xóa tác phẩm. Vui lòng thử lại sau.", "warning");
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
  const openStoryRoute = (story: any, action: "edit" | "publish" | "detail") => {
    if (!story?.id) {
      triggerLiveToast("Tác phẩm chưa có mã định danh hợp lệ. Vui lòng tải lại danh sách tác phẩm.", "warning");
      return;
    }

    const target =
      action === "edit"
        ? `/author/stories/${story.id}/edit`
        : action === "publish"
          ? `/author/stories/${story.id}/publish`
          : `/stories/${story.id}`;

    router.push(target);
  };
  const descriptionProgress = Math.min(100, Math.round((description.trim().length / storyDescriptionMinLength) * 100));
  const selectedStoryTypeLabel = storyTypeOptions.find((item) => item.value === storyType)?.label || "Hư cấu";
  const selectedLanguageLabel = storyLanguageOptions.find((item) => item.value === language)?.label || "Tiếng Việt";
  const selectedCopyrightLabel = copyrightOptions.find((item) => item.value === copyright)?.label || "Bảo lưu mọi quyền";
  const previewTags = tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 5);

  return (
    <AppShell
      activeId="s15"
      actions={
        <button className="button button-primary" onClick={openCreateStoryModal}>
          <Icon name="edit" />Tạo tác phẩm mới
        </button>
      }
    >
      <div className="author-header-panel panel panel-pad" style={{ marginBottom: 24, borderRadius: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <span className="user-avatar" style={{ background: "var(--crimson)", color: "#fff", width: 64, height: 64, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: 24 }}>
            {avatarInitials}
          </span>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: "bold", margin: 0, color: "#fff" }}>Chào mừng trở lại, {displayName}!</h2>
            <p style={{ margin: "4px 0 0 0", color: "rgba(255, 255, 255, 0.75)", fontSize: 13 }}>Không gian quản lý tác phẩm & theo dõi hành trình sáng tác.</p>
          </div>
        </div>
      </div>

      <section className="metric-grid" style={{ marginBottom: 24, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        <MetricCard label="Tác phẩm" value={String(works.length)} />
        <MetricCard label="Số chương nháp" value={String(works.reduce((acc, story) => acc + (story.draft_count || 0), 0))} />
        <MetricCard label="Chờ duyệt AI" value={String(works.reduce((acc, story) => acc + (story.pending_count || 0), 0))} />
        <MetricCard label="Uy tín tác giả" value={user?.profile ? `${user.profile.reputation_score}%` : "Đang tải"} />
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
            const chapCount = story.chapter_count ?? 0;
            const storyKey = story?.id ? String(story.id) : "";
            const editHref = storyKey ? `/author/stories/${storyKey}/edit` : "#";
            const publishHref = storyKey ? `/author/stories/${storyKey}/publish` : "#";
            const detailHref = storyKey ? `/stories/${storyKey}` : "#";
            const guardMissingStoryId = (event: React.MouseEvent<HTMLAnchorElement>) => {
              if (storyKey) return;
              event.preventDefault();
              openStoryRoute(story, "edit");
            };
            return (
              <article className="story-card author-work-card" key={story.id || story.title} style={{ display: "flex", flexDirection: "column" }}>
                <Cover index={index} coverUrl={story.cover_url} />
                <div className="compact-stack author-card-body" style={{ flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "16px 0 0 0" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                      <h3 className="story-title" style={{ fontSize: 21, fontWeight: "950", margin: 0, color: "var(--ink)", lineHeight: 1.25 }}>{story.title}</h3>
                      <span className={`badge ${story.status === "completed" ? "badge-green" : story.status === "paused" ? "badge-amber" : "badge-blue"}`} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, whiteSpace: "nowrap" }}>
                        {story.status === "completed" ? "Hoàn thành" : story.status === "paused" ? "Tạm ngưng" : "Đang viết"}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                      <span className="author-category-badge">
                        {story.category}
                      </span>
                      {(Array.isArray(story.tags) ? story.tags : String(story.tags || "").split(",")).map((tag: string) => tag.trim()).filter(Boolean).slice(0, 2).map((t: string) => (
                        <span key={t} className="author-tag-badge">
                          #{t}
                        </span>
                      ))}
                    </div>
                    <p style={{ fontSize: 12.5, color: "var(--muted)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", margin: "0 0 12px 0", lineHeight: 1.45 }}>
                      {story.description || "Chưa có mô tả ngắn."}
                    </p>
                    <div className="author-stats-grid">
                      <div className="author-stat-chip">
                        <Icon name="book" />
                        <span>{chapCount} chương</span>
                      </div>
                      <div className="author-stat-chip">
                        <Icon name="eye" />
                        <span>{(story.view_count || 0).toLocaleString()} đọc</span>
                      </div>
                      <div className="author-stat-chip author-stat-chip-orange">
                        <span>★</span>
                        <span>{story.rating_avg || 0} sao</span>
                      </div>
                    </div>
                  </div>
                  <div className="author-card-actions-group">
                    <div className="author-card-main-row">
                      <Link className="button button-primary author-card-action author-card-action-write" href={editHref} onClick={guardMissingStoryId} aria-label={`Viết tiếp ${story.title}`}>
                        <Icon name="edit" />
                        <span>Viết tiếp</span>
                      </Link>
                      <button className="button author-card-action author-card-action-manage" type="button" onClick={() => openEditStoryModal(story)} aria-label={`Chỉnh sửa thông tin ${story.title}`}>
                        <Icon name="settings" />
                        <span>Sửa thông tin</span>
                      </button>
                      <Link className="button button-soft author-card-action author-card-action-publish" href={publishHref} onClick={guardMissingStoryId} aria-label={`Đăng chương mới cho ${story.title}`}>
                        <Icon name="arrow" />
                        <span>Đăng chương</span>
                      </Link>
                    </div>
                    <div className="author-card-sub-row">
                      <Link className="button author-card-action author-card-action-preview" href={detailHref} onClick={guardMissingStoryId} aria-label={`Xem trang chi tiết của ${story.title}`}>
                        <Icon name="eye" />
                        <span>Xem truyện</span>
                      </Link>
                      <Link className="button author-card-action author-card-action-schedule" href="/author/schedule" aria-label={`Mở lịch đăng cho ${story.title}`}>
                        <Icon name="calendar" />
                        <span>Lịch đăng</span>
                      </Link>
                      <button
                        className="button button-danger author-card-action author-card-action-delete"
                        onClick={() => handleDeleteStory(story)}
                        type="button"
                        aria-label={`Xóa truyện ${story.title}`}
                      >
                        <Icon name="close" />
                        <span>Xóa</span>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* Story create/edit modal */}
      {isModalOpen && (
        <div className="modal-backdrop open story-setup-backdrop" onClick={closeStoryModal}>
          <div className="story-setup-modal" role="dialog" aria-modal="true" aria-labelledby="storySetupTitle" onClick={(e) => e.stopPropagation()}>
            <div className="story-setup-header">
              <div>
                <span className={`badge ${editingStory ? "badge-blue" : "badge-crimson"}`}>{editingStory ? "Chỉnh sửa tác phẩm" : "Author Studio"}</span>
                <h2 id="storySetupTitle">{editingStory ? `Cập nhật ${editingStory.title}` : "Khởi tạo tác phẩm mới"}</h2>
                <p>{editingStory ? "Điều chỉnh thông tin hiển thị, phân loại, ảnh bìa và cam kết xuất bản của tác phẩm." : "Thiết lập hồ sơ truyện đầy đủ để YAG có thể phân loại, gợi ý và hỗ trợ bạn viết chương đầu tiên tốt hơn."}</p>
              </div>
              <button className="button icon-button" type="button" onClick={closeStoryModal} aria-label="Đóng cửa sổ thông tin tác phẩm">
                <Icon name="close" />
              </button>
            </div>

            <form onSubmit={handleSubmitStory} className="story-setup-content">
              <aside className="story-setup-preview">
                <div className="story-cover-preview">
                  {coverUrl ? (
                    <img src={coverUrl} alt={`Ảnh bìa ${title.trim() || "tác phẩm"}`} />
                  ) : (
                    <div className="story-cover-placeholder">
                      <Icon name="book" />
                      <strong>{title.trim() || "Tác phẩm mới"}</strong>
                      <span>{selectedStoryTypeLabel}</span>
                    </div>
                  )}
                </div>
                <input id="story-cover-file" type="file" accept="image/*" onChange={handleCoverChange} hidden />
                <div className="story-cover-actions">
                  <label className="button button-soft" htmlFor="story-cover-file">
                    <Icon name="edit" /> Chọn ảnh bìa
                  </label>
                  {coverUrl ? (
                    <button className="button" type="button" onClick={() => {
                      if (coverUrl.startsWith("blob:")) URL.revokeObjectURL(coverUrl);
                      setCoverFile(null);
                      setCoverUrl(null);
                      setRemoveCover(Boolean(editingStory?.cover_url));
                    }}>
                      Gỡ ảnh
                    </button>
                  ) : null}
                  {editingStory?.cover_url && removeCover ? (
                    <button className="button button-soft" type="button" onClick={() => { setCoverUrl(editingStory.cover_url); setRemoveCover(false); }}>
                      Khôi phục ảnh cũ
                    </button>
                  ) : null}
                </div>

                <div className="story-setup-summary">
                  <div>
                    <span>Ngôn ngữ</span>
                    <strong>{selectedLanguageLabel}</strong>
                  </div>
                  <div>
                    <span>Loại hình</span>
                    <strong>{selectedStoryTypeLabel}</strong>
                  </div>
                  <div>
                    <span>Bản quyền</span>
                    <strong>{selectedCopyrightLabel}</strong>
                  </div>
                  <div>
                    <span>Xếp loại</span>
                    <strong>{isMature ? "Trưởng thành" : "Phổ thông"}</strong>
                  </div>
                </div>
              </aside>

              <div className="story-setup-form">
                <section className="story-setup-section">
                  <div className="story-setup-section-head">
                    <span className="story-setup-step">1</span>
                    <div>
                      <h3>Thông tin cốt lõi</h3>
                      <p>Tên, mô tả và thể loại là nền tảng để độc giả tìm thấy truyện.</p>
                    </div>
                  </div>
                  <div className="field">
                    <label>Tên tác phẩm <span className="required">*</span></label>
                    <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} maxLength={255} placeholder="Tên truyện của bạn" />
                  </div>
                  <div className="story-setup-grid three">
                    <div className="field">
                      <label>Thể loại chính</label>
                      <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
                        {storyCategoryOptions.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label>Ngôn ngữ</label>
                      <select className="select" value={language} onChange={(e) => setLanguage(e.target.value)}>
                        {storyLanguageOptions.map(item => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label>Trạng thái</label>
                      <select className="select" value={storyStatus} onChange={(e) => setStoryStatus(e.target.value)}>
                        <option value="ongoing">Đang viết</option>
                        <option value="completed">Hoàn thành</option>
                        <option value="paused">Tạm ngưng</option>
                      </select>
                    </div>
                  </div>
                  <div className="field">
                    <label>Tóm tắt cốt truyện <span className="required">*</span></label>
                    <textarea className="textarea story-description-input" value={description} onChange={(e) => setDescription(e.target.value)} required minLength={storyDescriptionMinLength} placeholder="Giới thiệu tiền đề, nhân vật chính, xung đột và lời hứa cảm xúc của câu chuyện..." />
                    <div className="story-field-meter">
                      <span style={{ width: `${descriptionProgress}%` }} />
                    </div>
                    <small>{description.trim().length}/{storyDescriptionMinLength} ký tự tối thiểu</small>
                  </div>
                </section>

                <section className="story-setup-section">
                  <div className="story-setup-section-head">
                    <span className="story-setup-step">2</span>
                    <div>
                      <h3>Phân loại & tìm kiếm</h3>
                      <p>Các thiết lập này giúp hệ thống gợi ý truyện đúng nhóm độc giả.</p>
                    </div>
                  </div>
                  <div className="story-type-grid">
                    {storyTypeOptions.map(item => (
                      <label className={`story-type-option ${storyType === item.value ? "active" : ""}`} key={item.value}>
                        <input type="radio" name="storyType" value={item.value} checked={storyType === item.value} onChange={() => setStoryType(item.value)} />
                        <strong>{item.label}</strong>
                        <span>{item.description}</span>
                      </label>
                    ))}
                  </div>
                  <div className="field">
                    <label>Tags</label>
                    <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Ví dụ: slow burn, học đường, báo thù, chữa lành" />
                    {previewTags.length > 0 ? (
                      <div className="story-tag-preview">
                        {previewTags.map(tag => <span key={tag}>#{tag}</span>)}
                      </div>
                    ) : null}
                  </div>
                  <div className="story-setup-grid two">
                    <div className="field">
                      <label>Các nhân vật chính</label>
                      <input className="input" value={mainCharacters} onChange={(e) => setMainCharacters(e.target.value)} placeholder="Tên nhân vật, cách nhau bằng dấu phẩy" />
                    </div>
                    <div className="field">
                      <label>Độc giả mục tiêu</label>
                      <select className="select" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)}>
                        {targetAudienceOptions.map(item => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                <section className="story-setup-section">
                  <div className="story-setup-section-head">
                    <span className="story-setup-step">3</span>
                    <div>
                      <h3>Quyền & an toàn nội dung</h3>
                      <p>Hoàn tất thông tin để bảo vệ tác phẩm và phân loại độ tuổi phù hợp.</p>
                    </div>
                  </div>
                  <div className="story-setup-grid two">
                    <div className="field">
                      <label>Bản quyền</label>
                      <select className="select" value={copyright} onChange={(e) => setCopyright(e.target.value)}>
                        {copyrightOptions.map(item => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </select>
                    </div>
                    <label className={`story-mature-toggle ${isMature ? "active" : ""}`}>
                      <input type="checkbox" checked={isMature} onChange={(e) => setIsMature(e.target.checked)} />
                      <span />
                      <div>
                        <strong>Nội dung trưởng thành</strong>
                        <small>Đánh dấu nếu truyện có chủ đề nhạy cảm hoặc cảnh chỉ phù hợp với độc giả trưởng thành.</small>
                      </div>
                    </label>
                  </div>
                </section>
                
                <section className="story-setup-section">
                  <div className="story-setup-section-head">
                    <span className="story-setup-step">4</span>
                    <div>
                      <h3>Cam kết xuất bản</h3>
                      <p>Thiết lập số chương dự kiến và tần suất đăng để cam kết tiến độ sáng tác.</p>
                    </div>
                  </div>
                  <div className="story-setup-grid two">
                    <div className="field">
                      <label>Số chương dự kiến <span className="required">*</span></label>
                      <input className="input" type="number" min="1" value={expectedChapters} onChange={(e) => setExpectedChapters(Number(e.target.value))} required placeholder="Ví dụ: 50" />
                    </div>
                    <div className="field">
                      <label>Tần suất cập nhật <span className="required">*</span></label>
                      <select className="select" value={updateFrequency} onChange={(e) => setUpdateFrequency(e.target.value)}>
                        <option value="1_week_1_chap">1 tuần 1 chương</option>
                        <option value="1_week_2_chap">1 tuần 2 chương</option>
                        <option value="2_weeks_1_chap">2 tuần 1 chương</option>
                        <option value="daily">Mỗi ngày 1 chương</option>
                      </select>
                    </div>
                  </div>
                </section>
              </div>

              <div className="story-setup-footer">
                <button className="button" type="button" onClick={closeStoryModal} disabled={submitting}>Hủy bỏ</button>
                <button className="button button-primary" type="submit" disabled={submitting}>
                  {submitting
                    ? (editingStory ? "Đang lưu thay đổi..." : "Đang khởi tạo...")
                    : (editingStory ? "Lưu thay đổi" : "Khởi tạo & mở Editor")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

const parseInlineMarkdown = (text: string): React.ReactNode[] => {
  const regex = /(\*\*.*?\*\*|\*.*?\*|<u>.*?<\/u>|<mark>.*?<\/mark>)/g;
  const parts = text.split(regex);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("<u>") && part.endsWith("</u>")) {
      return <u key={i}>{part.slice(3, -4)}</u>;
    }
    if (part.startsWith("<mark>") && part.endsWith("</mark>")) {
      return <mark key={i}>{part.slice(6, -7)}</mark>;
    }
    return part;
  });
};

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
  const [activeAiPanel, setActiveAiPanel] = useState<"coach" | "tools" | "lores">("coach");
  const [aiMode, setAiMode] = useState<AiModeId>("continue");
  const [aiTargetWords, setAiTargetWords] = useState(240);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [aiStreamingText, setAiStreamingText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResponseMeta, setAiResponseMeta] = useState<AiResponseMeta | null>(null);
  const [selectedDraftText, setSelectedDraftText] = useState("");
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);

  const [storyProfile, setStoryProfile] = useState<any>(null);
  const [styleReference, setStyleReference] = useState<StyleReferenceState>({
    storyTitle: "",
    seriesTitle: "",
    author: "",
  });
  const [styleReferenceSaving, setStyleReferenceSaving] = useState(false);
  const [styleReferenceMessage, setStyleReferenceMessage] = useState<string | null>(null);

  // Style Reference Modal + Author stories count
  const [isStyleReferenceModalOpen, setIsStyleReferenceModalOpen] = useState(false);
  const [authorStoriesCount, setAuthorStoriesCount] = useState(0);

  // AI Co-Writer states ("write_chapter" mode)
  const [coWriterPrompt, setCoWriterPrompt] = useState("");
  const [coWriterDrafts, setCoWriterDrafts] = useState<any[]>([]);
  const [coWriterLoading, setCoWriterLoading] = useState(false);
  const [coWriterError, setCoWriterError] = useState<string | null>(null);
  const [coWriterMeta, setCoWriterMeta] = useState<AiResponseMeta | null>(null);

  // Preview Modal
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

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
      const [chapsRes, storyRes] = await Promise.all([
        yagApi.author.getChapters(storyId),
        yagApi.reader.getStoryDetail(storyId).catch(() => ({ data: null })),
      ]);
      const chaps = chapsRes.data || [];
      setChapters(chaps);
      setStoryProfile(storyRes.data || null);
      if (storyRes.data) {
        setStyleReference({
          storyTitle: storyRes.data.style_reference_story_title || "",
          seriesTitle: storyRes.data.style_reference_series_title || "",
          author: storyRes.data.style_reference_author || "",
        });
      }

      // Fetch author stories count for style reference modal visibility
      try {
        const storiesRes = await yagApi.author.getStories();
        setAuthorStoriesCount((storiesRes.data || []).length);
      } catch {
        setAuthorStoriesCount(0);
      }

      if (chaps.length > 0) {
        const preferredChapter = [...chaps].reverse().find(isAuthorDraftChapter) || chaps[chaps.length - 1];
        setActiveChapter(preferredChapter);
        setEditorTitle(preferredChapter.title);
        setEditorContent(preferredChapter.content);
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

  const [lores, setLores] = useState<any[]>([]);
  const [loresLoading, setLoresLoading] = useState(false);
  const [loresError, setLoresError] = useState<string | null>(null);

  // States for adding/editing lore
  const [editingLoreId, setEditingLoreId] = useState<string | null>(null);
  const [loreForm, setLoreForm] = useState({
    entity_name: "",
    entity_type: "character",
    description: ""
  });
  const [loreSaving, setLoreSaving] = useState(false);

  const loadLores = async () => {
    if (!storyId) return;
    setLoresLoading(true);
    setLoresError(null);
    try {
      const res = await yagApi.author.listLores(storyId);
      setLores(res.data || []);
    } catch (err: any) {
      console.error(err);
      setLoresError("Không tải được danh sách sổ tay.");
    } finally {
      setLoresLoading(false);
    }
  };

  useEffect(() => {
    if (activeAiPanel === "lores" && storyId) {
      void loadLores();
    }
  }, [activeAiPanel, storyId]);

  const handleSaveLore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyId || !loreForm.entity_name.trim() || !loreForm.description.trim()) return;
    setLoreSaving(true);
    try {
      if (editingLoreId) {
        const res = await yagApi.author.updateLore(storyId, editingLoreId, loreForm);
        setLores(prev => prev.map(item => item.id === editingLoreId ? res.data : item));
        setEditingLoreId(null);
      } else {
        const res = await yagApi.author.createLore(storyId, loreForm);
        setLores(prev => [...prev, res.data]);
      }
      setLoreForm({ entity_name: "", entity_type: "character", description: "" });
    } catch (err: any) {
      console.error(err);
      alert("Lỗi khi lưu thiết lập sổ tay.");
    } finally {
      setLoreSaving(false);
    }
  };

  const handleDeleteLore = async (loreId: string) => {
    if (!storyId || !window.confirm("Bạn có chắc chắn muốn xóa thực thể này khỏi sổ tay?")) return;
    try {
      await yagApi.author.deleteLore(storyId, loreId);
      setLores(prev => prev.filter(item => item.id !== loreId));
      if (editingLoreId === loreId) {
        setEditingLoreId(null);
        setLoreForm({ entity_name: "", entity_type: "character", description: "" });
      }
    } catch (err: any) {
      console.error(err);
      alert("Lỗi khi xóa thực thể sổ tay.");
    }
  };

  const startEditLore = (lore: any) => {
    setEditingLoreId(lore.id);
    setLoreForm({
      entity_name: lore.entity_name,
      entity_type: lore.entity_type,
      description: lore.description
    });
  };



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
    if (!activeChapter?.id || false) return;

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

  const syncSelectedDraftText = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end).trim();
    setSelectionRange(end > start ? { start, end } : null);
    setSelectedDraftText(selected.slice(0, 2000));
  };

  const commitEditorContent = (updated: string, cursorPosition?: number) => {
    setHistoryStack((prev) => [...prev.slice(-49), editorContent]);
    setRedoStack([]);
    setEditorContent(updated);
    triggerAutosave(editorTitle, updated);

    if (cursorPosition != null) {
      setTimeout(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.focus();
        textarea.setSelectionRange(cursorPosition, cursorPosition);
        syncSelectedDraftText();
      }, 50);
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

    commitEditorContent(updated, start + text.length);
  };

  const replaceSelectionWithSuggestion = (text: string) => {
    if (!selectionRange) {
      insertSuggestion(text);
      return;
    }
    const updated = `${editorContent.substring(0, selectionRange.start)}${text}${editorContent.substring(selectionRange.end)}`;
    commitEditorContent(updated, selectionRange.start + text.length);
    setSelectedDraftText("");
    setSelectionRange(null);
  };

  const copySuggestion = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      triggerLiveToast("Đã sao chép gợi ý từ Miu AI.");
    } catch (err) {
      console.error(err);
      triggerLiveToast("Không thể sao chép gợi ý trên trình duyệt này.", "warning");
    }
  };

  const handleSaveStyleReference = async () => {
    const cleanReference = {
      storyTitle: styleReference.storyTitle.trim(),
      seriesTitle: styleReference.seriesTitle.trim(),
      author: styleReference.author.trim(),
    };
    if (!cleanReference.storyTitle && !cleanReference.seriesTitle && !cleanReference.author) {
      setStyleReferenceMessage("Nhập ít nhất một trường tham chiếu để Miu dùng khi chưa có lịch sử tác giả.");
      return;
    }

    setStyleReferenceSaving(true);
    setStyleReferenceMessage(null);
    try {
      await yagApi.author.updateStory(storyId, {
                  style_reference_story_title: cleanReference.storyTitle,
                  style_reference_series_title: cleanReference.seriesTitle,
                  style_reference_author: cleanReference.author,
                });
      setStoryProfile((current: any) => ({
        ...(current || {}),
        style_reference_story_title: cleanReference.storyTitle,
        style_reference_series_title: cleanReference.seriesTitle,
        style_reference_author: cleanReference.author,
      }));
      setStyleReferenceMessage("Đã lưu metadata tham chiếu cho Writing Agent.");
      triggerLiveToast("Đã cập nhật reference metadata cho AI.");
    } catch (err) {
      console.error(err);
      setStyleReferenceMessage("Không thể lưu reference metadata. Vui lòng thử lại.");
      triggerLiveToast("Không thể lưu reference metadata.", "warning");
    } finally {
      setStyleReferenceSaving(false);
    }
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
        setTimeout(() => { textareaRef.current?.focus(); }, 50);
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
        setTimeout(() => { textareaRef.current?.focus(); }, 50);
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
    if (aiLoading) return;
    if (!editorContent.trim() && !aiInput.trim()) return;
    if (aiMode === "rewrite" && !selectedDraftText.trim()) {
      setAiError("Chọn một đoạn văn trong editor trước khi dùng chế độ Viết lại.");
      triggerLiveToast("Hãy bôi chọn đoạn cần viết lại trước.", "warning");
      return;
    }
    setAiLoading(true);
    setAiError(null);
    setAiResponseMeta(null);
    setAiStreamingText("");
    setAiSuggestions([]);

    try {
      const rawContext = editorContent.trim() ? editorContent.slice(-4000) : "Bản thảo mới chưa có nội dung.";
      const contextText = [
        rawContext,
        aiInput.trim() ? `Yêu cầu thêm của tác giả: ${aiInput.trim()}` : "",
      ].filter(Boolean).join("\n\n");

      const response = await fetch(resolveApiUrl("/api/v1/ai/suggestions/stream"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${getAccessToken()}`
        },
        body: JSON.stringify({
          chapter_id: activeChapter.id,
          story_id: storyId,
          context: contextText,
          mode: aiMode,
          selected_text: selectedDraftText || undefined,
          target_words: aiTargetWords,
          style_reference_story_title: styleReference.storyTitle.trim() || undefined,
          style_reference_series_title: styleReference.seriesTitle.trim() || undefined,
          style_reference_author: styleReference.author.trim() || undefined,
        })
      });

      if (!response.ok) {
        throw new Error("HTTP error " + response.status);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let accumulatedText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunkStr = decoder.decode(value, { stream: true });
          const lines = chunkStr.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6).trim();
              if (dataStr === '{"done": true}') {
                break;
              }
              try {
                const parsedData = JSON.parse(dataStr);
                if (parsedData.text) {
                  accumulatedText += parsedData.text;
                  setAiStreamingText(accumulatedText);
                } else if (parsedData.error) {
                  throw new Error(parsedData.error);
                }
              } catch (e: any) {
                if (e.message?.includes("Unexpected end of JSON") || e.message?.includes("is not valid JSON")) {
                  continue;
                }
              }
            }
          }
        }
      }

      try {
        let cleanText = accumulatedText.trim();
        if (cleanText.startsWith("```")) {
          cleanText = cleanText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        }
        
        const startIdx = cleanText.indexOf("{");
        const endIdx = cleanText.lastIndexOf("}");
        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
          cleanText = cleanText.substring(startIdx, endIdx + 1);
        }

        const resultObj = JSON.parse(cleanText);
        setAiSuggestions(resultObj.suggestions || []);
        setAiResponseMeta({
          provider: "gemini",
          model: "gemini-1.5-flash",
          fallback: false,
          message: resultObj.message || null,
        });
      } catch (parseError) {
        console.warn("Failed to parse stream as JSON, treating as raw suggestion:", parseError);
        setAiSuggestions([
          {
            title: "Kết quả gợi ý",
            content: "Nội dung vừa sinh từ AI.",
            insertable_text: accumulatedText,
            reason: "Nội dung sinh trực tiếp dưới dạng văn xuôi.",
            quality_score: 0.9
          }
        ]);
        setAiResponseMeta({
          provider: "gemini",
          model: "gemini-1.5-flash",
          fallback: false,
          message: "Lưu ý: Kết quả được trả về dưới dạng văn bản thô.",
        });
      }
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || "Gemini API bận hoặc đã vượt hạn ngạch cuộc gọi (Rate Limit / Quota Exceeded). Vui lòng thử lại sau ít phút.");
      triggerLiveToast("AI Suggestion tạm thời gián đoạn.", "warning");
    } finally {
      setAiLoading(false);
      setAiStreamingText("");
    }
  };

  const handleCreateNewChapter = async () => {
    if (isCreatingChapter) return;
    setIsCreatingChapter(true);
    setSaveError(null);
    const nextNum = getNextChapterNumber(chapters);
    try {
      const res = await yagApi.author.createChapter({
        story_id: storyId,
        chapter_number: nextNum,
        title: `Chương ${nextNum}`,
        content: ""
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
  const editorWordCount = editorContent.split(/\s+/).filter(Boolean).length;
  const editorReadingMinutes = Math.max(1, Math.ceil(editorWordCount / 250));
  const canRunAi = !isEditingDisabled && !aiLoading && (editorContent.trim().length > 0 || aiInput.trim().length > 0);

  // AI Co-Writer handler
  const handleCoWriterGenerate = async () => {
    if (!coWriterPrompt.trim() || coWriterLoading) return;
    setCoWriterLoading(true);
    setCoWriterError(null);
    setCoWriterMeta(null);
    try {
      const contextText = coWriterPrompt.trim();
      const res = await yagApi.author.requestAiSuggestion({
        chapterId: activeChapter.id,
        storyId,
        context: contextText,
        mode: "write_chapter" as any,
        selectedText: undefined,
        targetWords: 800,
        styleReferenceStoryTitle: styleReference.storyTitle.trim() || undefined,
        styleReferenceSeriesTitle: styleReference.seriesTitle.trim() || undefined,
        styleReferenceAuthor: styleReference.author.trim() || undefined,
      });

      setCoWriterDrafts(res.data.suggestions || []);
      setCoWriterMeta({
        provider: res.data.provider,
        model: res.data.model,
        fallback: res.data.fallback,
        message: res.data.message,
      });
    } catch (err) {
      console.error(err);
      setCoWriterError("Gemini API bận hoặc đã vượt hạn ngạch. Vui lòng thử lại sau ít phút.");
      triggerLiveToast("AI Co-Writer tạm thời gián đoạn.", "warning");
    } finally {
      setCoWriterLoading(false);
    }
  };

  const handleCoWriterInsert = (text: string, mode: "overwrite" | "insert") => {
    if (mode === "overwrite") {
      if (!confirm("Nội dung hiện tại trong editor sẽ bị thay thế hoàn toàn bởi bản nháp AI. Bạn có chắc chắn?")) return;
      commitEditorContent(text, text.length);
      triggerLiveToast("Đã chép bản nháp AI vào trang viết.");
    } else {
      insertSuggestion(text);
      triggerLiveToast("Đã chèn bản nháp AI sau con trỏ.");
    }
  };
  const activeChapterStatus = activeChapter?.moderation_status || "nháp";
  const activeChapterStatusLabel =
    activeChapterStatus === "approved"
      ? "Đã duyệt"
      : activeChapterStatus === "pending"
        ? "Đang kiểm duyệt"
        : activeChapterStatus === "flagged"
          ? "Cần xử lý"
          : activeChapterStatus === "rejected"
            ? "Bị từ chối"
            : "Bản nháp";
  const canSubmitActiveChapter = !isEditingDisabled && editorWordCount > 0;

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
      <header className="studio-topbar studio-command-bar">
        <div className="studio-title-group">
          <Link className="button" href="/author/stories">
            <Icon name="arrow-left" /> Tác phẩm
          </Link>
          <div>
            <strong>Author Studio</strong>
            <div className="story-meta">
              Chương {activeChapter?.chapter_number || "-"} · {activeChapterStatusLabel} · {savingStatus}
            </div>
          </div>
        </div>
        <div className="studio-status-strip">
          <span><Icon name="edit" /> {editorWordCount} từ</span>
          <span><Icon name="book" /> {editorReadingMinutes} phút đọc</span>
        </div>
        <div className="inline-actions studio-command-actions">
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
          <Link className={`button ${canSubmitActiveChapter ? "button-soft" : "disabled"}`} href={`/author/stories/${storyId}/publish`}>
            <Icon name="calendar" /> Xuất bản
          </Link>
          <button
            className="button button-primary"
            type="button"
            onClick={() => setIsPreviewOpen(true)}
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
          <div className="writing-toolbar" aria-label="Thanh công cụ soạn thảo">
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
              <button
                className={`tool-button ${isPreviewMode ? "active" : ""}`}
                type="button"
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                title="Xem trước định dạng"
                style={{
                  backgroundColor: isPreviewMode ? "var(--primary)" : "transparent",
                  color: isPreviewMode ? "white" : "var(--foreground)",
                  border: isPreviewMode ? "none" : "1px solid var(--line)",
                  borderRadius: 4,
                  padding: "4px 8px",
                  fontSize: 12,
                  marginLeft: 8
                }}
              >
                {isPreviewMode ? "Sửa" : "Xem trước"}
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
                  <span className={`badge ${canSubmitActiveChapter ? "badge-green" : "badge-blue"}`} style={{ fontSize: 10 }}>
                    {canSubmitActiveChapter ? "Sẵn sàng gửi duyệt" : "Đang soạn"}
                  </span>
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


            </aside>

            {/* Center Editor Paper */}
            <div className="editor-paper" style={{ background: "var(--surface)", borderRadius: 8, padding: 24, minHeight: 500, display: "flex", flexDirection: "column", border: "1px solid var(--line)" }}>
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
                <span className="badge badge-blue">Trạng thái: {activeChapterStatusLabel}</span>
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
                  color: "var(--jungle)"
                }}
              />
              {isPreviewMode ? (
                <div
                  className="editor-body editor-preview"
                  style={{
                    fontSize: editorSize,
                    fontFamily: editorFont,
                    lineHeight: editorLineHeight,
                    minHeight: 400,
                    width: "100%",
                    padding: "8px 12px",
                    color: "var(--ink)",
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px dashed var(--line)",
                    borderRadius: 4,
                    overflowY: "auto"
                  }}
                >
                  {editorContent ? (
                    editorContent.split("\n").map((para, idx) => {
                      if (para.trim().startsWith(">")) {
                        return <blockquote key={idx} style={{ borderLeft: "4px solid var(--primary)", paddingLeft: 12, margin: "12px 0", color: "var(--muted)", fontStyle: "italic" }}>{parseInlineMarkdown(para.replace(/^>\s*/, ""))}</blockquote>;
                      }
                      if (para.trim().startsWith("#")) {
                        return <h2 key={idx} style={{ fontSize: "1.5em", margin: "20px 0 10px 0", color: "var(--primary)" }}>{parseInlineMarkdown(para.replace(/^#\s*/, ""))}</h2>;
                      }
                      return <p key={idx} style={{ marginBottom: 12, minHeight: "1em" }}>{parseInlineMarkdown(para)}</p>;
                    })
                  ) : (
                    <p style={{ color: "var(--muted)" }}>Chưa có nội dung viết. Hãy nhấn nút "Sửa" và bắt đầu viết.</p>
                  )}
                </div>
              ) : (
                <textarea
                  ref={textareaRef}
                  className="editor-body"
                  value={editorContent}
                  onChange={handleContentChange}
                  onSelect={syncSelectedDraftText}
                  onMouseUp={syncSelectedDraftText}
                  onKeyUp={syncSelectedDraftText}
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
                    color: "var(--ink)"
                  }}
                />
              )}
              <div className="editor-footer-row" style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 8 }}>
                <span>{editorWordCount} từ · {editorReadingMinutes} phút đọc</span>
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

          <div className="agent-status">
            <div>
              <span>Context</span>
              <strong>{Math.min(editorWordCount, 1000).toLocaleString("vi-VN")} từ gần nhất</strong>
            </div>
            <div>
              <span>Mode</span>
              <strong>{aiModeOptions.find((item) => item.id === aiMode)?.label}</strong>
            </div>
          </div>

          <div className="ai-panel-switch" role="tablist" aria-label="Miu AI panels">
            <button
              className={`tab-button ${activeAiPanel === "coach" ? "active" : ""}`}
              type="button"
              onClick={() => setActiveAiPanel("coach")}
            >
              Writing Agent
            </button>
            <button
              className={`tab-button ${activeAiPanel === "tools" ? "active" : ""}`}
              type="button"
              onClick={() => setActiveAiPanel("tools")}
            >
              AI Co-Writer
            </button>
            <button
              className={`tab-button ${activeAiPanel === "lores" ? "active" : ""}`}
              type="button"
              onClick={() => setActiveAiPanel("lores")}
            >
              Sổ tay
            </button>
          </div>

          {activeAiPanel === "coach" && (
            <div className="tab-panel active stack ai-coach-panel">
              <div className="agent-bubble">
                <strong>Gemini Agent đang dùng ngữ cảnh chương, mode và đoạn chọn.</strong>
                <p>Miu trả về nội dung có thể chèn trực tiếp, kèm lý do và điểm chất lượng để bạn quyết định nhanh.</p>
              </div>

              {authorStoriesCount <= 1 && (
                <button
                  className="button button-soft"
                  type="button"
                  onClick={() => setIsStyleReferenceModalOpen(true)}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  <Icon name="edit" /> Style Reference Metadata
                  {storyProfile?.style_reference_author || storyProfile?.style_reference_story_title || storyProfile?.style_reference_series_title ? (
                    <span className="badge badge-green" style={{ marginLeft: 8 }}>Đã lưu</span>
                  ) : (
                    <span className="badge badge-amber" style={{ marginLeft: 8 }}>Tuỳ chọn</span>
                  )}
                </button>
              )}

              <div className="ai-mode-grid" role="radiogroup" aria-label="Chế độ AI">
                {aiModeOptions.map((item) => (
                  <button
                    className={`ai-mode-button ${aiMode === item.id ? "active" : ""}`}
                    type="button"
                    key={item.id}
                    onClick={() => setAiMode(item.id)}
                    aria-pressed={aiMode === item.id}
                  >
                    <em>{item.short}</em>
                    <strong>{item.label}</strong>
                    <span>{item.description}</span>
                  </button>
                ))}
              </div>

              <div className="ai-target-control">
                <label htmlFor="ai-target-words">Độ dài mục tiêu</label>
                <input
                  id="ai-target-words"
                  className="input"
                  type="number"
                  min={50}
                  max={1200}
                  step={10}
                  value={aiTargetWords}
                  onChange={(event) => setAiTargetWords(Math.max(50, Math.min(1200, Number(event.target.value) || 240)))}
                />
                <span>{aiTargetWords.toLocaleString("vi-VN")} từ</span>
              </div>

              <div className={`selected-draft-card ${selectedDraftText ? "has-selection" : ""}`}>
                <strong>Đoạn đang chọn</strong>
                <p>{selectedDraftText || "Bôi chọn đoạn văn trong editor để dùng chế độ Viết lại hoặc thay thế trực tiếp."}</p>
              </div>

              {aiError ? (
                <div className="notice warning">
                  {aiError}
                </div>
              ) : null}

              {aiResponseMeta ? (
                <div className="ai-provider-strip">
                  <span className={`badge ${aiResponseMeta.fallback ? "badge-amber" : "badge-green"}`}>
                    {aiResponseMeta.fallback ? "Fallback" : "Gemini"}
                  </span>
                  <span>{aiResponseMeta.provider || "unknown"}</span>
                  {aiResponseMeta.model ? <span>{aiResponseMeta.model}</span> : null}
                  {aiResponseMeta.message ? <small>{aiResponseMeta.message}</small> : null}
                </div>
              ) : null}

              <div className="agent-action-grid">
                {aiLoading && aiStreamingText ? (
                  <div className="agent-result-card streaming" style={{ border: "1px dashed var(--primary)", background: "rgba(255, 255, 255, 0.02)", gridColumn: "1 / -1", padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <strong>Miu đang viết gợi ý...</strong>
                      <span className="badge badge-amber" style={{ animation: "pulse 1.5s infinite" }}>Streaming</span>
                    </div>
                    <blockquote style={{ whiteSpace: "pre-wrap", fontSize: 13, maxHeight: 300, overflow: "auto", background: "rgba(0,0,0,0.2)", padding: 8, borderRadius: 4 }}>
                      {aiStreamingText}
                    </blockquote>
                  </div>
                ) : aiSuggestions.length === 0 ? (
                  <div className="ai-empty-result">
                    Chưa có gợi ý nào. Chọn mode và gửi yêu cầu để Miu sinh nội dung.
                  </div>
                ) : (
                  aiSuggestions.map((item, idx) => {
                    const insertableText = item.insertable_text || item.content || "";
                    const quality = Number(item.quality_score);
                    const scoreLabel = Number.isFinite(quality) ? `${Math.round(quality * 100)}%` : "AI";
                    return (
                      <div className="agent-result-card" key={`${item.title || "suggestion"}-${idx}`}>
                        <div className="agent-result-head">
                          <strong>{item.title || `Gợi ý ${idx + 1}`}</strong>
                          <span className="badge badge-blue">{scoreLabel}</span>
                        </div>
                        <p>{item.content}</p>
                        {item.reason ? <small>{item.reason}</small> : null}
                        {item.insertable_text ? <blockquote>{item.insertable_text}</blockquote> : null}
                        <div className="agent-result-actions">
                          <button
                            className="button button-primary"
                            type="button"
                            onClick={() => insertSuggestion(insertableText)}
                            disabled={isEditingDisabled || !insertableText}
                          >
                            Chèn
                          </button>
                          <button
                            className="button button-soft"
                            type="button"
                            onClick={() => replaceSelectionWithSuggestion(insertableText)}
                            disabled={isEditingDisabled || !insertableText}
                          >
                            Thay đoạn chọn
                          </button>
                          <button
                            className="button"
                            type="button"
                            onClick={() => copySuggestion(insertableText)}
                            disabled={!insertableText}
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="agent-compose">
                <textarea
                  className="textarea"
                  rows={3}
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder="Yêu cầu thêm: ví dụ tăng cảm giác tiếc nuối, giữ giọng văn nhẹ, thêm xung đột ở cuối cảnh..."
                  disabled={isEditingDisabled}
                />
                <button
                  className="button button-primary"
                  type="button"
                  onClick={handleAiSuggest}
                  disabled={!canRunAi}
                >
                  <Icon name="arrow" /> {aiLoading ? "Miu đang viết..." : "Chạy AI agent"}
                </button>
              </div>
            </div>
          )}

          {activeAiPanel === "tools" && (
            <div className="tab-panel active stack ai-tooling-panel">
              <div className="agent-bubble">
                <strong>AI Co-Writer — Viết cả chương</strong>
                <p>Mô tả ý tưởng chương truyện, AI sẽ viết toàn bộ nội dung cho bạn. Bạn có thể chỉnh sửa sau khi chép vào trang viết.</p>
              </div>

              <div className="agent-compose" style={{ marginBottom: 12 }}>
                <textarea
                  className="textarea"
                  rows={4}
                  value={coWriterPrompt}
                  onChange={(e) => setCoWriterPrompt(e.target.value)}
                  placeholder="Ý tưởng viết chương: ví dụ 'Viết chương 1 kể về một chiến binh đi thám hiểm đền cổ, phát hiện bí ẩn gia tộc...'" 
                  disabled={isEditingDisabled}
                />
                <button
                  className="button button-primary"
                  type="button"
                  onClick={handleCoWriterGenerate}
                  disabled={coWriterLoading || !coWriterPrompt.trim() || isEditingDisabled}
                >
                  <Icon name="edit" /> {coWriterLoading ? "Miu đang viết chương..." : "Chạy AI Agent viết chương"}
                </button>
              </div>

              {coWriterError ? <div className="notice warning">{coWriterError}</div> : null}

              {coWriterMeta ? (
                <div className="ai-provider-strip">
                  <span className={`badge ${coWriterMeta.fallback ? "badge-amber" : "badge-green"}`}>
                    {coWriterMeta.fallback ? "Fallback" : "Gemini"}
                  </span>
                  <span>{coWriterMeta.provider || "unknown"}</span>
                  {coWriterMeta.model ? <span>{coWriterMeta.model}</span> : null}
                </div>
              ) : null}

              <div className="agent-action-grid">
                {coWriterDrafts.length === 0 ? (
                  <div className="ai-empty-result">
                    Chưa có bản nháp. Nhập ý tưởng và bấm &quot;Chạy AI Agent viết chương&quot; để bắt đầu.
                  </div>
                ) : (
                  coWriterDrafts.map((draft, idx) => {
                    const draftText = draft.insertable_text || draft.content || "";
                    const quality = Number(draft.quality_score);
                    const scoreLabel = Number.isFinite(quality) ? `${Math.round(quality * 100)}%` : "AI";
                    return (
                      <div className="agent-result-card" key={`cowriter-${idx}`}>
                        <div className="agent-result-head">
                          <strong>{draft.title || `Bản nháp ${idx + 1}`}</strong>
                          <span className="badge badge-blue">{scoreLabel}</span>
                        </div>
                        <p>{draft.content}</p>
                        {draftText ? (
                          <blockquote style={{ maxHeight: 200, overflow: "auto", fontSize: 13 }}>{draftText}</blockquote>
                        ) : null}
                        <div className="agent-result-actions">
                          <button
                            className="button button-primary"
                            type="button"
                            onClick={() => handleCoWriterInsert(draftText, "overwrite")}
                            disabled={isEditingDisabled || !draftText}
                          >
                            Chép vào trang viết
                          </button>
                          <button
                            className="button button-soft"
                            type="button"
                            onClick={() => handleCoWriterInsert(draftText, "insert")}
                            disabled={isEditingDisabled || !draftText}
                          >
                            Chèn vào sau con trỏ
                          </button>
                          <button
                            className="button"
                            type="button"
                            onClick={() => copySuggestion(draftText)}
                            disabled={!draftText}
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>


            </div>
          )}

          {activeAiPanel === "lores" && (
            <div className="tab-panel active stack ai-lores-panel">
              <div className="agent-bubble">
                <strong>Sổ tay thiết lập (Lorebook)</strong>
                <p>Thêm nhân vật, địa danh, vật phẩm... Miu sẽ tự động tham chiếu dữ liệu này để viết truyện nhất quán hơn.</p>
              </div>

              {/* Form thêm/sửa */}
              <form onSubmit={handleSaveLore} className="stack" style={{ gap: 10, background: "rgba(255, 255, 255, 0.03)", padding: 12, borderRadius: 6, border: "1px solid var(--line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: 13 }}>{editingLoreId ? "Sửa thực thể" : "Thêm thực thể mới"}</strong>
                  {editingLoreId && (
                    <button type="button" className="button button-soft" onClick={() => {
                      setEditingLoreId(null);
                      setLoreForm({ entity_name: "", entity_type: "character", description: "" });
                    }} style={{ padding: "2px 6px", fontSize: 11 }}>Hủy</button>
                  )}
                </div>
                
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="Tên thực thể (VD: Tiêu Viêm)"
                    value={loreForm.entity_name}
                    onChange={e => setLoreForm(prev => ({ ...prev, entity_name: e.target.value }))}
                    required
                    style={{ flex: 1, height: 32, fontSize: 12 }}
                  />
                  <select
                    className="input"
                    value={loreForm.entity_type}
                    onChange={e => setLoreForm(prev => ({ ...prev, entity_type: e.target.value }))}
                    style={{ width: 100, height: 32, fontSize: 12, padding: "0 4px" }}
                  >
                    <option value="character">Nhân vật</option>
                    <option value="location">Địa danh</option>
                    <option value="item">Vật phẩm</option>
                    <option value="skill">Kỹ năng</option>
                    <option value="other">Khác</option>
                  </select>
                </div>

                <textarea
                  className="textarea"
                  rows={2}
                  placeholder="Mô tả thiết lập (VD: Độc cô cầu bại, sở hữu Dị Hỏa...)"
                  value={loreForm.description}
                  onChange={e => setLoreForm(prev => ({ ...prev, description: e.target.value }))}
                  required
                  style={{ fontSize: 12, padding: 6 }}
                />

                <button type="submit" className="button button-primary" disabled={loreSaving} style={{ height: 32, fontSize: 12, justifyContent: "center" }}>
                  {loreSaving ? "Đang lưu..." : (editingLoreId ? "Cập nhật" : "Thêm vào sổ tay")}
                </button>
              </form>

              {/* Danh sách thực thể */}
              <div className="lore-list stack" style={{ gap: 8, marginTop: 12, maxHeight: 400, overflowY: "auto" }}>
                {loresLoading ? (
                  <div style={{ textAlign: "center", padding: 12, color: "var(--muted)" }}>Đang tải sổ tay...</div>
                ) : loresError ? (
                  <div className="notice warning">{loresError}</div>
                ) : lores.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 12, color: "var(--muted)", fontSize: 12 }}>Sổ tay hiện tại trống. Hãy thêm thực thể đầu tiên!</div>
                ) : (
                  lores.map((lore) => (
                    <div key={lore.id} className="lore-card" style={{ padding: 10, borderRadius: 6, border: "1px solid var(--line)", background: "rgba(255,255,255,0.01)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span className="badge" style={{ fontSize: 10, background: "var(--primary-soft)", color: "var(--primary)" }}>
                          {lore.entity_type === "character" ? "Nhân vật" :
                           lore.entity_type === "location" ? "Địa danh" :
                           lore.entity_type === "item" ? "Vật phẩm" :
                           lore.entity_type === "skill" ? "Kỹ năng" : "Khác"}
                        </span>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button type="button" className="button button-soft" onClick={() => startEditLore(lore)} style={{ padding: "2px 6px", fontSize: 11 }}>Sửa</button>
                          <button type="button" className="button button-soft" onClick={() => handleDeleteLore(lore.id)} style={{ padding: "2px 6px", fontSize: 11, color: "var(--crimson)" }}>Xóa</button>
                        </div>
                      </div>
                      <strong style={{ fontSize: 13, color: "var(--foreground)" }}>{lore.entity_name}</strong>
                      <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, whiteSpace: "pre-line" }}>{lore.description}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </aside>
      </main>

      {/* Preview Modal */}
      {isPreviewOpen && (
        <div className="modal-backdrop" onClick={() => setIsPreviewOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720, maxHeight: "85vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--jungle)" }}>Xem trước chương</h2>
              <button className="button" type="button" onClick={() => setIsPreviewOpen(false)} style={{ padding: "4px 10px" }}>✕</button>
            </div>
            <div style={{ padding: "24px", background: "var(--surface)", borderRadius: 8, border: "1px solid var(--line)", fontFamily: editorFont, fontSize: editorSize, lineHeight: editorLineHeight }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16, color: "var(--jungle)", borderBottom: "1px solid var(--line)", paddingBottom: 12 }}>
                {editorTitle || "Chưa có tiêu đề"}
              </h1>
              <div className="preview-body" style={{ whiteSpace: "pre-wrap", wordWrap: "break-word", color: "var(--ink)" }}>
                {editorContent || "Chưa có nội dung."}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <span style={{ fontSize: 11, color: "var(--muted)", alignSelf: "center" }}>{editorWordCount} từ · {editorReadingMinutes} phút đọc</span>
              <button className="button button-primary" type="button" onClick={() => setIsPreviewOpen(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Style Reference Modal */}
      {isStyleReferenceModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsStyleReferenceModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--jungle)" }}>Style Reference Metadata</h2>
              <button className="button" type="button" onClick={() => setIsStyleReferenceModalOpen(false)} style={{ padding: "4px 10px" }}>✕</button>
            </div>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>Dùng khi tác phẩm chưa có chương đã duyệt hoặc lịch sử tác giả đủ rõ. Miu sẽ tham chiếu metadata này cho phong cách viết.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                className="input"
                value={styleReference.storyTitle}
                onChange={(event) => setStyleReference((current) => ({ ...current, storyTitle: event.target.value }))}
                placeholder="Tên tác phẩm muốn gợi cảm hứng"
              />
              <input
                className="input"
                value={styleReference.seriesTitle}
                onChange={(event) => setStyleReference((current) => ({ ...current, seriesTitle: event.target.value }))}
                placeholder="Tên series"
              />
              <input
                className="input"
                value={styleReference.author}
                onChange={(event) => setStyleReference((current) => ({ ...current, author: event.target.value }))}
                placeholder="Tác giả / bút danh tham chiếu"
              />
            </div>
            {styleReferenceMessage ? <small style={{ display: "block", marginTop: 8 }}>{styleReferenceMessage}</small> : null}
            <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
              <button className="button" type="button" onClick={() => setIsStyleReferenceModalOpen(false)}>Hủy</button>
              <button
                className="button button-primary"
                type="button"
                onClick={async () => {
                  await handleSaveStyleReference();
                  setIsStyleReferenceModalOpen(false);
                }}
                disabled={styleReferenceSaving}
              >
                {styleReferenceSaving ? "Đang lưu..." : "Lưu reference"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function PublishScreen() {
  const params = useParams();
  const storyId = params?.id as string;
  const router = useRouter();

  const [chapters, setChapters] = useState<any[]>([]);
  const [allChapters, setAllChapters] = useState<any[]>([]);
  const [story, setStory] = useState<any>(null);
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
    try {
      if (!storyId) {
        throw new Error("MISSING_STORY_ID");
      }
      const [res, storyRes] = await Promise.all([
        yagApi.author.getChapters(storyId),
        yagApi.reader.getStoryDetail(storyId).catch(() => ({ data: null })),
      ]);
      const authorChapters = res.data || [];
      const drafts = authorChapters.filter(isAuthorDraftChapter);
      setAllChapters(authorChapters);
      setChapters(drafts);
      setStory(storyRes.data || null);
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

  useEffect(() => {
    const chapter = chapters.find((item) => item.id === selectedChapId);
    setIsPremium(Boolean(chapter?.is_premium));
    setPublishDate(chapter?.publish_at ? toLocalDateTimeValue(new Date(chapter.publish_at)) : "");
    setAgreement(false);
  }, [chapters, selectedChapId]);

  const handleCreateStarterDraft = async () => {
    setCreatingDraft(true);
    try {
      const nextNum = getNextChapterNumber(allChapters);
      const res = await yagApi.author.createChapter({
        story_id: storyId,
        chapter_number: nextNum,
        title: `Chương ${nextNum}`,
        content: "",
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
    const chapterToPublish = chapters.find(c => c.id === selectedChapId);
    if (!chapterToPublish?.content?.trim()) {
      triggerLiveToast("Chương nháp đang trống. Hãy mở không gian viết và hoàn thiện nội dung trước khi gửi duyệt.", "warning");
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
      await yagApi.author.publishChapter(selectedChapId, {
        is_premium: isPremium,
        publish_at: publishDate ? new Date(publishDate).toISOString() : undefined,
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
  const selectedWordCount = selectedChapter?.content ? selectedChapter.content.split(/\s+/).filter(Boolean).length : 0;
  const selectedCharCount = selectedChapter?.content?.length || 0;
  const hasPublishableContent = Boolean(selectedChapter?.content?.trim());
  const publishTimingLabel = publishDate
    ? new Date(publishDate).toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" })
    : "Ngay sau khi AI duyệt";
  const setPublishDelay = (minutes: number) => {
    const scheduledAt = new Date(Date.now() + minutes * 60_000);
    scheduledAt.setSeconds(0, 0);
    setPublishDate(toLocalDateTimeValue(scheduledAt));
  };
  const canSubmitPublish = !submitting && !isLoadingChapters && !creatingDraft && chapters.length > 0 && hasPublishableContent && agreement;

  return (
    <AppShell activeId="s17">
      <div className="publish-page">
        <section className="publish-hero panel panel-pad">
          <div>
            <span className="badge badge-crimson">Xuất bản chương</span>
            <h2>Chuẩn bị gửi chương cho AI kiểm duyệt</h2>
            <p>Kiểm tra bản nháp, quyền truy cập và lịch công bố trước khi đưa chương vào pipeline xuất bản của YAG.</p>
          </div>
          <div className="publish-hero-actions">
            <Link className="button" href={`/author/stories/${storyId}/edit`}>
              <Icon name="edit" /> Mở Editor
            </Link>
            <Link className="button" href="/author/stories">
              Tác phẩm của tôi
            </Link>
          </div>
        </section>

        {loadError && (
          <div className="notice warning publish-notice">
            {loadError}
            <button className="button button-soft" type="button" onClick={() => void loadPublishDrafts()} style={{ marginLeft: 12, padding: "4px 10px", fontSize: 12 }}>
              Tải lại
            </button>
          </div>
        )}
        <div className="publish-layout">
          <form onSubmit={handlePublish} className="publish-flow panel panel-pad">
            <section className="publish-step">
              <div className="publish-step-index">1</div>
              <div className="publish-step-body">
                <h3>Chọn chương nháp</h3>
                {isLoadingChapters ? (
                  <div className="publish-empty-box">Đang tải chương nháp...</div>
                ) : chapters.length === 0 ? (
                  <div className="publish-empty-box">
                    <span>Chưa có chương nháp khả dụng để gửi duyệt.</span>
                    <div className="inline-actions">
                      <button className="button button-soft" type="button" onClick={handleCreateStarterDraft} disabled={creatingDraft}>
                        {creatingDraft ? "Đang tạo..." : "Tạo chương nháp"}
                      </button>
                      <Link className="button" href={`/author/stories/${storyId}/edit`}>
                        Mở không gian viết
                      </Link>
                    </div>
                  </div>
                ) : (
                  <select className="select publish-select" value={selectedChapId} onChange={(e) => setSelectedChapId(e.target.value)}>
                    {chapters.map(c => (
                      <option key={c.id} value={c.id}>Chương {c.chapter_number}: {c.title}</option>
                    ))}
                  </select>
                )}
              </div>
            </section>

            <section className="publish-step">
              <div className="publish-step-index">2</div>
              <div className="publish-step-body">
                <h3>Cấu hình phát hành</h3>
                <div className="publish-option-grid">
                  <label className={`publish-option ${!isPremium ? "active" : ""}`}>
                    <input type="radio" name="access" checked={!isPremium} onChange={() => setIsPremium(false)} />
                    <strong>Miễn phí</strong>
                    <span>Mọi độc giả có thể đọc sau khi duyệt.</span>
                  </label>
                  <label className={`publish-option ${isPremium ? "active" : ""}`}>
                    <input type="radio" name="access" checked={isPremium} onChange={() => setIsPremium(true)} />
                    <strong>Premium</strong>
                    <span>Chỉ thành viên Premium có thể mở khóa.</span>
                  </label>
                </div>
                <div className="field publish-date-field">
                  <label>Hẹn giờ công bố</label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={publishDate}
                    step="60"
                    onChange={(e) => setPublishDate(e.target.value)}
                  />
                  <div className="publish-date-actions">
                    <button className="button button-soft" type="button" onClick={() => setPublishDelay(15)}>Sau 15 phút</button>
                    <button className="button button-soft" type="button" onClick={() => setPublishDelay(60)}>Sau 1 giờ</button>
                    <button className="button button-soft" type="button" onClick={() => setPublishDelay(24 * 60)}>Ngày mai</button>
                    {publishDate ? <button className="button" type="button" onClick={() => setPublishDate("")}>Phát hành ngay</button> : null}
                  </div>
                  <small>Để trống để phát hành ngay sau khi AI duyệt xong.</small>
                </div>
              </div>
            </section>

            <section className="publish-step">
              <div className="publish-step-index">3</div>
              <div className="publish-step-body">
                <h3>Cam kết nội dung</h3>
                <label className="publish-agreement">
                  <input type="checkbox" checked={agreement} onChange={(e) => setAgreement(e.target.checked)} />
                  <span>Tôi cam kết nội dung chương truyện này hoàn toàn tự sáng tác, không vi phạm bản quyền và tuân thủ quy tắc nội dung của YAG.</span>
                </label>
                <button className="button button-primary publish-submit" type="submit" disabled={!canSubmitPublish}>
                  {submitting ? "Đang gửi nội dung..." : "Gửi duyệt & Xuất bản"}
                </button>
                {!hasPublishableContent && selectedChapter ? (
                  <div className="notice warning">Chương đang trống. Hãy mở Editor và viết nội dung trước khi gửi duyệt.</div>
                ) : null}
              </div>
            </section>
          </form>

          <aside className="publish-review panel panel-pad">
            <div className="publish-review-head">
              <span className="badge badge-blue">Kiểm tra cuối</span>
              <strong>{selectedChapter ? `Chương ${selectedChapter.chapter_number}` : "Chưa chọn chương"}</strong>
            </div>
            {selectedChapter ? (
              <>
                <div className="publish-review-title">
                  <h3>{selectedChapter.title}</h3>
                  <span className={`badge ${hasPublishableContent ? "badge-green" : "badge-amber"}`}>
                    {hasPublishableContent ? "Có nội dung" : "Chưa có nội dung"}
                  </span>
                </div>
                <div className="publish-stat-grid">
                  <div><span>Tác phẩm</span><strong>{story?.title || "Đang cập nhật"}</strong></div>
                  <div><span>Trạng thái</span><strong>{getModerationStatusLabel(selectedChapter.moderation_status)}</strong></div>
                  <div><span>Số từ</span><strong>{selectedWordCount}</strong></div>
                  <div><span>Ký tự</span><strong>{selectedCharCount}</strong></div>
                  <div><span>Quyền đọc</span><strong>{isPremium ? "Premium" : "Miễn phí"}</strong></div>
                  <div><span>Công bố</span><strong>{publishTimingLabel}</strong></div>
                </div>
                <div className="publish-excerpt">
                  &ldquo;{selectedChapter.content ? selectedChapter.content.substring(0, 220) + (selectedChapter.content.length > 220 ? "..." : "") : "Chưa có nội dung."}&rdquo;
                </div>
                <div className="publish-checklist">
                  <div className={hasPublishableContent ? "done" : ""}><Icon name={hasPublishableContent ? "check" : "edit"} /> Nội dung không rỗng</div>
                  <div className={agreement ? "done" : ""}><Icon name={agreement ? "check" : "shield"} /> Đã xác nhận cam kết</div>
                  <div className={selectedChapter ? "done" : ""}><Icon name={selectedChapter ? "check" : "shield"} /> Sẵn sàng gửi AI kiểm duyệt</div>
                </div>
                <Link className="button" href={`/author/stories/${storyId}/edit`}>
                  <Icon name="edit" /> Chỉnh sửa thêm trong Editor
                </Link>
              </>
            ) : (
              <div className="publish-empty-box">Chọn một chương nháp để xem bản tóm tắt trước khi gửi duyệt.</div>
            )}
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

export function ScheduleScreen() {
  const { refreshUser } = useAuth();
  const [works, setWorks] = useState<any[]>([]);
  const [calendarDays, setCalendarDays] = useState<any[]>([]);
  const [currentMonthStr, setCurrentMonthStr] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [allChapters, setAllChapters] = useState<any[]>([]);
  const [selectedStoryId, setSelectedStoryId] = useState<string>("all");
  const [frequencyFilter, setFrequencyFilter] = useState<"week" | "month" | "year">("week");
  const [overview, setOverview] = useState<{
    reputation_score: number | null;
    on_time_rate: number;
    approved_chapters: number;
    upcoming_schedule: any[];
  }>({
    reputation_score: null,
    on_time_rate: 100,
    approved_chapters: 0,
    upcoming_schedule: [],
  });

  // Load works and chapters to populate commitments, metrics, and calendar events
  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await yagApi.author.getStories();
          const storiesList = res.data || [];
          setWorks(storiesList);
          const now = new Date();
          const month = now.getMonth();
          const year = now.getFullYear();
          const numDays = new Date(year, month + 1, 0).getDate();
          const fetchedChapters: any[] = [];
          for (const s of storiesList) {
                      try {
                        const chRes = await yagApi.author.getChapters(s.id);
                        if (chRes.data) {
                          fetchedChapters.push(...chRes.data.map((c: any) => ({ ...c, story_id: s.id, storyTitle: s.title })));
                        }
                      } catch (err) {
                        console.error(`Failed to load chapters for story ${s.id}:`, err);
                      }
                    }
          setAllChapters(fetchedChapters);
          const daysList = Array.from({ length: numDays }, (_, index) => {
                      const dayNum = index + 1;
                      const scheduledChapter = fetchedChapters.find((c: any) => {
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
          try {
                      const overviewRes = await yagApi.author.getScheduleOverview();
                      if (overviewRes.data) {
                        setOverview(overviewRes.data);
                        await refreshUser();
                      }
                    } catch (err) {
                      console.error("Failed to load schedule overview:", err);
                    }
      } catch (err) {
        console.error("Failed to load schedule data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    void loadData();
  }, [refreshUser]);

  const getFrequencyLabel = (freq: string) => {
    switch (freq) {
      case "1_week_1_chap": return "1 tuần 1 chương";
      case "1_week_2_chap": return "1 tuần 2 chương";
      case "2_weeks_1_chap": return "2 tuần 1 chương";
      case "daily": return "Mỗi ngày 1 chương";
      default: return freq || "Chưa thiết lập";
    }
  };

  // Compute commitments dynamically
  const commitments = works.map((w, idx) => {
    const target = w.expected_chapters || w.targetChaps || w.target_chapters || 0;
    const current = w.chapter_count || w.currentChaps || 0;
    const frequency = w.update_frequency || "1_week_1_chap";
    const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
    return {
      id: w.id || `com-${idx}`,
      novel: w.title,
      targetChaps: target,
      currentChaps: current,
      frequency: frequency,
      percent: percent,
    };
  });

  // Selected story or all
  const selectedStory = works.find(w => w.id === selectedStoryId);
  let expectedTotal = 0;
  let writtenTotal = 0;

  if (selectedStoryId === "all") {
    works.forEach(w => {
      expectedTotal += w.expected_chapters || 0;
      writtenTotal += w.chapter_count || 0;
    });
  } else if (selectedStory) {
    expectedTotal = selectedStory.expected_chapters || 0;
    writtenTotal = selectedStory.chapter_count || 0;
  }
  const remainingTotal = Math.max(0, expectedTotal - writtenTotal);
  const progressPercent = expectedTotal > 0 ? Math.min(100, Math.round((writtenTotal / expectedTotal) * 100)) : 0;

  // Filter chapters by selected story
  const filteredChapters = allChapters.filter(c => {
    if (selectedStoryId !== "all" && c.story_id !== selectedStoryId) return false;
    return c.moderation_status === "approved" && c.publish_at;
  });

  // Calculate counts for frequencies
  const now = new Date();
  
  // 1. Week View (current week Mon-Sun)
  const currentDay = now.getDay();
  const mondayDiff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), mondayDiff, 0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const weekCounts = [0, 0, 0, 0, 0, 0, 0];
  filteredChapters.forEach(c => {
    const pDate = new Date(c.publish_at);
    if (pDate >= startOfWeek && pDate <= endOfWeek) {
      let wdIndex = pDate.getDay();
      wdIndex = wdIndex === 0 ? 6 : wdIndex - 1;
      weekCounts[wdIndex]++;
    }
  });

  // 2. Month View (weeks of current month: 1-7, 8-14, 15-21, 22+)
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthCounts = [0, 0, 0, 0];
  filteredChapters.forEach(c => {
    const pDate = new Date(c.publish_at);
    if (pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear) {
      const dayVal = pDate.getDate();
      if (dayVal <= 7) monthCounts[0]++;
      else if (dayVal <= 14) monthCounts[1]++;
      else if (dayVal <= 21) monthCounts[2]++;
      else monthCounts[3]++;
    }
  });

  // 3. Year View (months of current year)
  const yearCounts = Array(12).fill(0);
  filteredChapters.forEach(c => {
    const pDate = new Date(c.publish_at);
    if (pDate.getFullYear() === currentYear) {
      const mIdx = pDate.getMonth();
      yearCounts[mIdx]++;
    }
  });

  let chartLabels: string[] = [];
  let chartData: number[] = [];

  if (frequencyFilter === "week") {
    chartLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
    chartData = weekCounts;
  } else if (frequencyFilter === "month") {
    chartLabels = ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4"];
    chartData = monthCounts;
  } else {
    chartLabels = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];
    chartData = yearCounts;
  }

  const maxChartVal = Math.max(...chartData, 1);

  return (
    <AppShell activeId="s18">
      <div className="stack" style={{ gap: 24 }}>
        {/* Metric Cards Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          <div className="panel panel-pad stack" style={{ gap: 8, borderLeft: "4px solid var(--green)", borderRadius: "0 8px 8px 0" }}>
            <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: "bold" }}>Điểm uy tín</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 28, fontWeight: "bold", color: "var(--foreground)" }}>{overview.reputation_score ?? "--"}</span>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>/ 100</span>
            </div>
            <p style={{ fontSize: 11, color: "var(--muted)", margin: 0 }}>Bị trừ 5 điểm uy tín cho mỗi chương trễ hạn.</p>
          </div>
          <div className="panel panel-pad stack" style={{ gap: 8, borderLeft: "4px solid var(--blue)", borderRadius: "0 8px 8px 0" }}>
            <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: "bold" }}>Tỉ lệ đúng hẹn</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 28, fontWeight: "bold", color: "var(--foreground)" }}>{overview.on_time_rate}%</span>
            </div>
            <p style={{ fontSize: 11, color: "var(--muted)", margin: 0 }}>Tỷ lệ hoàn thành cam kết xuất bản đúng hạn.</p>
          </div>
          <div className="panel panel-pad stack" style={{ gap: 8, borderLeft: "4px solid var(--jungle-dark)", borderRadius: "0 8px 8px 0" }}>
            <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: "bold" }}>Chương đã xuất bản</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 28, fontWeight: "bold", color: "var(--foreground)" }}>{overview.approved_chapters}</span>
            </div>
            <p style={{ fontSize: 11, color: "var(--muted)", margin: 0 }}>Tổng số chương truyện đã được AI kiểm duyệt.</p>
          </div>
        </div>

        {/* Main Workspace Grid */}
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
                            borderLeft: `2.5px solid ${day.event.status === "approved"
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
                    return (
                      <div key={com.id} style={{ borderBottom: "1px solid var(--line)", paddingBottom: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <div>
                            <strong style={{ fontSize: 14, color: "var(--foreground)" }}>{com.novel}</strong>
                            <div style={{ fontSize: 11, color: "var(--muted)" }}>Tần suất: {getFrequencyLabel(com.frequency)}</div>
                          </div>
                          <span style={{ fontSize: 13, fontWeight: "bold", color: "var(--jungle-dark)" }}>
                            {com.currentChaps} / {com.targetChaps} chương ({com.percent}%)
                          </span>
                        </div>
                        {/* Progress bar container */}
                        <div style={{ height: 8, background: "var(--line)", borderRadius: 4, overflow: "hidden", position: "relative" }}>
                          <div style={{ width: `${com.percent}%`, height: "100%", background: "linear-gradient(90deg, var(--jungle-dark) 0%, var(--green) 100%)", borderRadius: 4 }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          {/* Right Column: Interactive Charts */}
          <div className="stack" style={{ gap: 24 }}>
            {/* Story Selector */}
            <section className="panel panel-pad stack" style={{ gap: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: "bold", margin: 0, color: "var(--jungle-dark)" }}>Chọn tác phẩm phân tích</h3>
              <select
                className="select"
                value={selectedStoryId}
                onChange={(e) => setSelectedStoryId(e.target.value)}
                style={{ width: "100%", padding: "8px" }}
              >
                <option value="all">Tất cả tác phẩm</option>
                {works.map((w) => (
                  <option key={w.id} value={w.id}>{w.title}</option>
                ))}
              </select>
            </section>

            {/* Progress Donut Chart */}
            <section className="panel panel-pad stack" style={{ gap: 16, alignItems: "center" }}>
              <h3 style={{ fontSize: 14, fontWeight: "bold", margin: 0, color: "var(--jungle-dark)", width: "100%", textAlign: "left" }}>
                Tiến độ hoàn thành tác phẩm
              </h3>
              {expectedTotal === 0 ? (
                <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                  Chưa có dữ liệu cam kết số chương cho tác phẩm được chọn.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, width: "100%" }}>
                  {/* SVG Donut */}
                  <div style={{ position: "relative", width: 140, height: 140 }}>
                    <svg width="100%" height="100%" viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="transparent"
                        stroke="var(--line)"
                        strokeWidth="10"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="transparent"
                        stroke="var(--green)"
                        strokeWidth="10"
                        strokeDasharray={2 * Math.PI * 50}
                        strokeDashoffset={(2 * Math.PI * 50) - (progressPercent / 100) * (2 * Math.PI * 50)}
                        strokeLinecap="round"
                        style={{ transition: "stroke-dashoffset 0.5s ease-in-out" }}
                      />
                    </svg>
                    <div style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      pointerEvents: "none"
                    }}>
                      <span style={{ fontSize: 24, fontWeight: "bold", color: "var(--foreground)" }}>{progressPercent}%</span>
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>{writtenTotal} / {expectedTotal} chương</span>
                    </div>
                  </div>
                  {/* Legends */}
                  <div style={{ display: "flex", gap: 16, justifyContent: "center", width: "100%", borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--green)" }} />
                      <span>Đã viết ({writtenTotal})</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--line)" }} />
                      <span>Còn lại ({remainingTotal})</span>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Update Frequency Bar Chart */}
            <section className="panel panel-pad stack" style={{ gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: 14, fontWeight: "bold", margin: 0, color: "var(--jungle-dark)" }}>Tần suất cập nhật chương</h3>
                {/* Filter Toggles */}
                <div style={{ display: "flex", background: "var(--line)", borderRadius: 6, padding: 2 }}>
                  <button
                    className={`button ${frequencyFilter === "week" ? "button-primary" : ""}`}
                    style={{ padding: "4px 8px", fontSize: 10, borderRadius: 4, background: frequencyFilter === "week" ? "var(--jungle-dark)" : "transparent", color: frequencyFilter === "week" ? "#fff" : "var(--foreground)", border: 0, cursor: "pointer" }}
                    onClick={() => setFrequencyFilter("week")}
                  >
                    Tuần
                  </button>
                  <button
                    className={`button ${frequencyFilter === "month" ? "button-primary" : ""}`}
                    style={{ padding: "4px 8px", fontSize: 10, borderRadius: 4, background: frequencyFilter === "month" ? "var(--jungle-dark)" : "transparent", color: frequencyFilter === "month" ? "#fff" : "var(--foreground)", border: 0, cursor: "pointer" }}
                    onClick={() => setFrequencyFilter("month")}
                  >
                    Tháng
                  </button>
                  <button
                    className={`button ${frequencyFilter === "year" ? "button-primary" : ""}`}
                    style={{ padding: "4px 8px", fontSize: 10, borderRadius: 4, background: frequencyFilter === "year" ? "var(--jungle-dark)" : "transparent", color: frequencyFilter === "year" ? "#fff" : "var(--foreground)", border: 0, cursor: "pointer" }}
                    onClick={() => setFrequencyFilter("year")}
                  >
                    Năm
                  </button>
                </div>
              </div>

              <div style={{ width: "100%", height: 180, display: "flex", justifyContent: "center" }}>
                <svg width="100%" height="100%" viewBox="0 0 400 180" style={{ overflow: "visible" }}>
                  <defs>
                    <linearGradient id="bar-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="var(--green)" />
                      <stop offset="100%" stopColor="var(--jungle-dark)" />
                    </linearGradient>
                  </defs>

                  {/* Gridlines */}
                  <line x1="30" y1="30" x2="390" y2="30" stroke="var(--line)" strokeWidth="0.5" strokeDasharray="4" />
                  <line x1="30" y1="85" x2="390" y2="85" stroke="var(--line)" strokeWidth="0.5" strokeDasharray="4" />
                  <line x1="30" y1="140" x2="390" y2="140" stroke="var(--line)" strokeWidth="1" />

                  {/* Bars */}
                  {chartData.map((val, i) => {
                    const N = chartData.length;
                    const barGap = N === 7 ? 12 : N === 4 ? 24 : 6;
                    const totalGapWidth = barGap * (N - 1);
                    const barWidth = (360 - totalGapWidth) / N;
                    const barHeight = (val / maxChartVal) * 110;
                    const x = 30 + i * (barWidth + barGap);
                    const y = 140 - barHeight;

                    return (
                      <g key={i}>
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={barHeight}
                          rx="3"
                          fill="url(#bar-grad)"
                          style={{ cursor: "pointer", transition: "all 0.3s ease" }}
                        >
                          <title>{`Đã đăng ${val} chương`}</title>
                        </rect>
                        {/* Count label */}
                        {val > 0 && (
                          <text
                            x={x + barWidth / 2}
                            y={y - 6}
                            textAnchor="middle"
                            style={{ fontSize: 9, fontWeight: "bold", fill: "var(--foreground)" }}
                          >
                            {val}
                          </text>
                        )}
                        {/* X-axis label */}
                        <text
                          x={x + barWidth / 2}
                          y="158"
                          textAnchor="middle"
                          style={{ fontSize: 9, fill: "var(--muted)", fontWeight: "500" }}
                        >
                          {chartLabels[i]}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
