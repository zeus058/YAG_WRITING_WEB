"use client";

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { type IconName, STORY_CATEGORIES } from "@/data/yag";
import { Icon, Cover, ErrorGuide, MetricCard, QuickStories, AIRecommendationStories, RankingItem, ReadingCard, StoryBadge, UpdateStoryRow, getStoryAuthorName } from "@/components/ui";
import { AppShell } from "@/components/layout";
import { yagApi, useAuth, appEnv } from "@/lib";

const settingSections: { id: string; label: string; icon: IconName }[] = [
  { id: "profile", label: "Hồ sơ cá nhân", icon: "user" },
  { id: "security", label: "Mật khẩu & bảo mật", icon: "lock" },
  { id: "notifications", label: "Thông báo", icon: "bell" },
  { id: "membership", label: "Membership & thanh toán", icon: "card" },
];

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

const normalizeChapterTitle = (chapterNumber: number, title?: string) => {
  const rawTitle = (title || "").trim();
  if (!rawTitle) return `Chương ${chapterNumber}`;
  const duplicatedPrefix = new RegExp(`^chương\\s*${chapterNumber}\\s*[:.\\-–]?\\s*`, "i");
  return rawTitle.replace(duplicatedPrefix, "").trim() || rawTitle;
};

const getStoredJsonArray = <T = unknown>(key: string, useMocks: boolean): T[] => {
  if (typeof window === "undefined" || !useMocks) return [];
  const stored = localStorage.getItem(key);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const formatRelativeTime = (dateStr?: string | null) => {
  if (!dateStr) return "Vừa xong";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Vừa xong";
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "Vừa xong";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
  
  return date.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

export function HomeFeedScreen() {
  const [storiesList, setStoriesList] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (appEnv.useMocks) {
      setStoriesList([]);
      setRecommendations([]);
      setIsLoading(false);
      return;
    }

    const loadFeed = async () => {
      try {
        const [recsRes, storiesRes] = await Promise.all([
          yagApi.reader.getRecommendations().catch(() => ({ data: { recommendations: [] } })),
          yagApi.reader.listStories(),
        ]);
        const fullStories = storiesRes.data || [];
        const sortedStories = [...fullStories].sort((a: any, b: any) => (b.view_count || 0) - (a.view_count || 0));
        setStoriesList(sortedStories);

        const rawRecs = recsRes.data.recommendations || [];
        const mappedRecs = rawRecs.map((rec: any) => {
          const fullStory = fullStories.find((s: any) => s.id === rec.story_id);
          return {
            ...(fullStory || {}),
            id: fullStory?.id || rec.story_id,
            title: fullStory?.title || rec.title,
            description: fullStory?.description || rec.plot_summary,
            category: fullStory?.category || rec.category,
            badge: "ai",
            ai_reason: rec.reason,
            ai_match_tags: rec.match_tags || [],
            ai_source: rec.source,
            ai_similarity: rec.similarity,
            reason: rec.reason,
            match_tags: rec.match_tags || [],
            source: rec.source,
            similarity: rec.similarity,
          };
        }).filter((story: any) => story.id || story.title);

        setRecommendations(mappedRecs.length > 0 ? mappedRecs : fullStories.slice(0, 4));
      } catch (err) {
        console.error("Failed to load feed", err);
      } finally {
        setIsLoading(false);
      }
    };
    void loadFeed();
  }, []);

  if (isLoading) {
    return (
      <AppShell activeId="s04">
        <div style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>
          Đang tải dữ liệu trang chủ...
        </div>
      </AppShell>
    );
  }

  const hasStories = storiesList.length > 0;
  const heroStory = hasStories ? storiesList[0] : null;

  const heroHref = heroStory?.id ? `/stories/${heroStory.id}` : "/discover";
  const heroTitle = heroStory ? heroStory.title : "Chào mừng bạn đến với YAG!";
  const heroDescription = heroStory
    ? (heroStory.description.length > 180
      ? heroStory.description.slice(0, 180).trim() + "..."
      : heroStory.description)
    : "Không gian đọc và sáng tác tiểu thuyết mạng tích hợp AI đầu tiên dành cho người Việt. Hãy bắt đầu hành trình sáng tác và đọc truyện của bạn ngay hôm nay.";

  const heroChapters = heroStory ? (heroStory.chapter_count ?? heroStory.chapters ?? 0) : 0;
  const heroRating = heroStory && heroStory.rating_avg !== undefined ? heroStory.rating_avg.toFixed(1) : "0.0";
  const heroViews = heroStory && heroStory.view_count !== undefined
    ? (heroStory.view_count >= 1000000 ? `${(heroStory.view_count / 1000000).toFixed(1)}M` : heroStory.view_count)
    : "0";

  return (
    <AppShell activeId="s04">
      <section className="home-hero">
        <Link className="home-featured" href={heroHref}>
          <div className="home-featured-copy">
            <span className="badge badge-crimson">
              {hasStories ? "Đang được đọc nhiều" : "Chào mừng bạn mới"}
            </span>
            <h2>{heroTitle}</h2>
            <p>{heroDescription}</p>
            {hasStories && (
              <div className="home-featured-stats">
                <span>{heroChapters} chương</span>
                <span>{heroRating} ★</span>
                <span>{heroViews} lượt đọc</span>
              </div>
            )}
            <span className="button button-primary" style={{ width: "fit-content" }}>
              {hasStories ? "Đọc tiếp" : "Khám phá ngay"}
            </span>
          </div>
          <div className="home-featured-cover"><Cover index={0} coverUrl={heroStory?.cover_url} /></div>
        </Link>
        <aside className="panel panel-pad stack home-continue">
          <div className="home-section-head">
            <h2 className="section-title">Đọc tiếp</h2>
            <Link href="/library">Thư viện</Link>
          </div>
          {hasStories ? (
            (storiesList.length > 3 ? storiesList.slice(1, 4) : storiesList).map((story, index) => (
              <ReadingCard story={story} index={index} key={story.id || story.title} />
            ))
          ) : (
            <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 13, textAlign: "center", minHeight: 120, padding: 12 }}>
              Bạn chưa theo dõi truyện nào. Hãy khám phá truyện mới và thêm vào thư viện nhé!
            </div>
          )}
        </aside>
      </section>
      <section className="action-strip" style={{ margin: "24px 0" }}>
        <div>
          <strong>Gợi ý hôm nay</strong>
          <div className="list-meta">Danh sách được lấy từ hệ thống đề xuất và dữ liệu truyện hiện có.</div>
        </div>
        <button className="button" type="button" onClick={() => triggerLiveToast("Đã làm mới danh sách gợi ý theo sở thích đọc của bạn!")}>
          Làm mới gợi ý
        </button>
      </section>
      <section className="home-layout">
        <main className="stack">
          <section className="panel panel-pad stack">
            <div className="home-section-head">
              <h2 className="section-title">AI đề xuất cho bạn</h2>
              <Link href="/discover">Xem thêm</Link>
            </div>
            <AIRecommendationStories count={6} storiesList={recommendations} />
          </section>
          <section className="panel panel-pad stack">
            <div className="home-section-head">
              <h2 className="section-title">Mới cập nhật</h2>
              <Link href="/discover">Tất cả truyện mới</Link>
            </div>
            <div className="update-list">
              {storiesList.slice(0, 6).map((story, index) => (
                <UpdateStoryRow story={story} index={index} key={story.id || story.title} />
              ))}
            </div>
          </section>
        </main>
        <aside className="stack">
          <section className="panel panel-pad stack">
            <div className="home-section-head">
              <h2 className="section-title">BXH hôm nay</h2>
              <Link href="/discover">Chi tiết</Link>
            </div>
            <div className="ranking-list">
              {storiesList.slice(0, 6).map((story, index) => (
                <RankingItem story={story} index={index} key={story.id || story.title} />
              ))}
            </div>
          </section>
          <section className="panel panel-pad stack">
            <h2 className="section-title">Thể loại nổi bật</h2>
            <div className="genre-strip">
              {STORY_CATEGORIES.map((item, index) => (
                <Link className={`pill ${index === 0 ? "active" : ""}`} href={`/discover?genre=${encodeURIComponent(item)}`} key={item}>
                  {item}
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </AppShell>
  );
}

export function DiscoverScreen() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"basic" | "ai">("basic");
  const [storiesList, setStoriesList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [isFallback, setIsFallback] = useState(false);

  const [selectedGenre, setSelectedGenre] = useState("Tất cả");
  const [selectedStatus, setSelectedStatus] = useState("Tất cả");
  const [selectedChapters, setSelectedChapters] = useState("Tất cả");
  const [selectedType, setSelectedType] = useState("Tất cả");
  const [selectedSort, setSelectedSort] = useState("Phù hợp nhất");

  const handleSearch = async () => {
    setIsLoading(true);
    setSearched(true);
    if (appEnv.useMocks) {
      setStoriesList([]);
      setIsLoading(false);
      return;
    }

    try {
      if (searchMode === "ai") {
        const response = await yagApi.reader.searchStories({
          query: query || "truyện ngôn tình trinh thám",
          semantic: true,
        });
        setIsFallback(response.data.fallback || false);
        const results = response.data.results || [];
        const storiesRes = await yagApi.reader.listStories();
        const fullStories = storiesRes.data || [];
        const mapped = results.map((r: any) => fullStories.find((s: any) => s.id === r.story_id)).filter(Boolean);
        setStoriesList(mapped);
      } else {
        const response = await yagApi.reader.listStories({ q: query });
        setStoriesList(response.data || []);
        setIsFallback(false);
      }
    } catch (err) {
      console.error("Failed to perform search", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initStories = async () => {
      setIsLoading(true);
      try {
        if (appEnv.useMocks) {
          setStoriesList([]);
        } else {
          const res = await yagApi.reader.listStories();
          setStoriesList(res.data || []);
        }
      } catch (err) {
        console.error("Failed to load discover stories", err);
      } finally {
        setIsLoading(false);
      }
    };
    void initStories();
  }, []);

  useEffect(() => {
    const genreParam = searchParams.get("genre");
    if (genreParam) {
      setSelectedGenre(genreParam);
    }
  }, [searchParams]);

  const handleResetFilters = () => {
    setSelectedGenre("Tất cả");
    setSelectedStatus("Tất cả");
    setSelectedChapters("Tất cả");
    setSelectedType("Tất cả");
    setSelectedSort("Phù hợp nhất");
    setQuery("");
  };

  // Perform live filtering
  const filteredStories = storiesList.filter((story) => {
    // Filter by genre
    if (selectedGenre !== "Tất cả") {
      const category = story.category || story.genre || "";
      if (!category.toLowerCase().includes(selectedGenre.toLowerCase())) {
        return false;
      }
    }
    // Filter by status
    if (selectedStatus !== "Tất cả") {
      const status = story.status || "";
      if (selectedStatus === "Đang tiến hành" && status !== "ongoing") return false;
      if (selectedStatus === "Hoàn thành" && status !== "completed") return false;
      if (selectedStatus === "Tạm dừng" && status !== "paused") return false;
    }
    // Filter by chapter count
    if (selectedChapters !== "Tất cả") {
      const count = story.chapter_count ?? story.chapters ?? 0;
      if (selectedChapters === "0 - 50 chương" && count > 50) return false;
      if (selectedChapters === "50 - 100 chương" && (count <= 50 || count > 100)) return false;
      if (selectedChapters === "100 - 200 chương" && (count <= 100 || count > 200)) return false;
      if (selectedChapters === "200+ chương" && count <= 200) return false;
    }
    // Filter by chapter type (premium status)
    if (selectedType !== "Tất cả") {
      const hasPremium = Boolean(story.is_premium || (story.chapters && story.chapters.some((c: any) => c.is_premium)));
      if (selectedType === "Miễn phí" && hasPremium) return false;
      if (selectedType === "Có Premium" && !hasPremium) return false;
    }
    return true;
  }).sort((a, b) => {
    if (selectedSort === "Mới cập nhật") {
      const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return dateB - dateA;
    }
    if (selectedSort === "Lượt đọc cao" || selectedSort === "Lượt đọc nhiều") {
      return (b.view_count || 0) - (a.view_count || 0);
    }
    if (selectedSort === "Đánh giá cao") {
      return (b.rating_avg || 0) - (a.rating_avg || 0);
    }
    if (selectedSort === "Nhiều chương") {
      const countA = a.chapter_count ?? a.chapters ?? 0;
      const countB = b.chapter_count ?? b.chapters ?? 0;
      return countB - countA;
    }
    return 0; // Default/Phù hợp nhất
  });

  return (
    <AppShell activeId="s05">
      <section className="panel discover-search-section stack">
        <div className="discover-search-row">
          <div className="field search-field">
            <input
              className="input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Từ khóa hoặc ý tưởng cốt truyện (ví dụ: tình yêu thời chiến tranh)..."
            />
          </div>
          <div className="search-mode-segmented">
            <button
              className={`segmented-button ${searchMode === "basic" ? "active" : ""}`}
              type="button"
              onClick={() => setSearchMode("basic")}
            >
              Từ khóa
            </button>
            <button
              className={`segmented-button ${searchMode === "ai" ? "active" : ""}`}
              type="button"
              onClick={() => setSearchMode("ai")}
            >
              AI
            </button>
          </div>
          <button className="button button-primary search-submit-btn" type="button" onClick={handleSearch} disabled={isLoading}>
            <Icon name="search" />
            {isLoading ? "Đang tìm..." : "Tìm truyện"}
          </button>
        </div>
      </section>

      <section className="layout-filter" style={{ marginTop: 24 }}>
        <aside className="panel panel-pad stack">
          <h2 className="section-title">Bộ lọc</h2>

          <div className="field">
            <label>Thể loại</label>
            <select className="select" value={selectedGenre} onChange={(e) => setSelectedGenre(e.target.value)}>
              <option value="Tất cả">Tất cả thể loại</option>
              {STORY_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Trạng thái</label>
            <select className="select" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
              <option value="Tất cả">Tất cả trạng thái</option>
              <option value="Đang tiến hành">Đang tiến hành</option>
              <option value="Hoàn thành">Hoàn thành</option>
              <option value="Tạm dừng">Tạm dừng</option>
            </select>
          </div>

          <div className="field">
            <label>Số chương</label>
            <select className="select" value={selectedChapters} onChange={(e) => setSelectedChapters(e.target.value)}>
              <option value="Tất cả">Tất cả số lượng</option>
              <option value="0 - 50 chương">0 - 50 chương</option>
              <option value="50 - 100 chương">50 - 100 chương</option>
              <option value="100 - 200 chương">100 - 200 chương</option>
              <option value="200+ chương">200+ chương</option>
            </select>
          </div>

          <div className="field">
            <label>Loại chương</label>
            <select className="select" value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
              <option value="Tất cả">Tất cả</option>
              <option value="Miễn phí">Miễn phí</option>
              <option value="Có Premium">Có Premium</option>
            </select>
          </div>

          <div className="field">
            <label>Sắp xếp</label>
            <select className="select" value={selectedSort} onChange={(e) => setSelectedSort(e.target.value)}>
              <option value="Phù hợp nhất">Phù hợp nhất</option>
              <option value="Mới cập nhật">Mới cập nhật</option>
              <option value="Lượt đọc cao">Lượt đọc cao</option>
              <option value="Đánh giá cao">Đánh giá cao</option>
              <option value="Nhiều chương">Nhiều chương</option>
            </select>
          </div>

          <button className="button" type="button" onClick={handleResetFilters}>Thiết lập lại</button>
        </aside>

        <main className="stack">
          <div className="panel panel-pad">
            <div className="home-section-head">
              <h2 className="section-title">{filteredStories.length} truyện phù hợp</h2>
              {searchMode === "ai" && (
                <span className="badge badge-blue">
                  {isFallback ? "AI Fallback" : "AI Ngữ Nghĩa"}
                </span>
              )}
            </div>
          </div>

          {filteredStories.length === 0 && searched && (
            <ErrorGuide
              title="Không thấy truyện phù hợp?"
              items={[
                "Thử bỏ một tag đang quá hẹp như số chương hoặc trạng thái.",
                "Viết mô tả cảm xúc bằng câu tự nhiên khi chọn chế độ AI ngữ nghĩa.",
                "Nếu vẫn ít kết quả, chuyển sang tìm kiếm từ khóa thông thường.",
              ]}
            />
          )}

          {isLoading ? (
            <>
              <style>{`
                @keyframes shimmer {
                  0% { opacity: 0.4; }
                  50% { opacity: 0.8; }
                  100% { opacity: 0.4; }
                }
                .skeleton-pulse {
                  animation: shimmer 1.5s infinite ease-in-out;
                }
              `}</style>
              <div className="home-story-grid">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    className="home-story-card skeleton-pulse"
                    key={index}
                    style={{
                      pointerEvents: "none",
                    }}
                  >
                    <div className="home-story-cover" style={{ backgroundColor: "rgba(255,255,255,0.06)", minHeight: 180, borderRadius: 4 }} />
                    <div className="home-story-body" style={{ padding: "12px 0 0 0" }}>
                      <div style={{ backgroundColor: "rgba(255,255,255,0.12)", height: 16, width: "75%", marginBottom: 8, borderRadius: 2 }} />
                      <div style={{ backgroundColor: "rgba(255,255,255,0.06)", height: 12, width: "50%", marginBottom: 12, borderRadius: 2 }} />
                      <div style={{ display: "flex", gap: 12 }}>
                        <div style={{ backgroundColor: "rgba(255,255,255,0.06)", height: 12, width: "25%", borderRadius: 2 }} />
                        <div style={{ backgroundColor: "rgba(255,255,255,0.06)", height: 12, width: "20%", borderRadius: 2 }} />
                        <div style={{ backgroundColor: "rgba(255,255,255,0.06)", height: 12, width: "20%", borderRadius: 2 }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <QuickStories storiesList={filteredStories} />
          )}
        </main>
      </section>
    </AppShell>
  );
}

export function StoryDetailScreen() {
  const params = useParams();
  const rawId = params?.id;
  const storyId = typeof rawId === "string" ? rawId : "";

  const [story, setStory] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [commentTab, setCommentTab] = useState<"chapters" | "comments">("chapters");
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewContent, setNewReviewContent] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (appEnv.useMocks) {
      setStory(null);
      setChapters([]);
      setReviews([]);
      setIsLoading(false);
      return;
    }

    const loadStoryData = async () => {
      try {
        const [storyRes, reviewsRes] = await Promise.all([
          yagApi.reader.getStoryDetail(storyId),
          yagApi.reader.getReviews(storyId).catch(() => ({ data: { reviews: [] } })),
        ]);
        setStory(storyRes.data);
        setChapters(storyRes.data.chapters || []);
        setReviews(reviewsRes.data.reviews || []);
        const libRes = await yagApi.reader.getLibrary().catch(() => ({ data: [] }));
        const bookmarked = (libRes.data || []).some((item: any) => item.id === storyId);
        setIsBookmarked(bookmarked);
      } catch (err) {
        console.error("Failed to load story details:", err);
      } finally {
        setIsLoading(false);
      }
    };
    void loadStoryData();
  }, [storyId]);

  const handleToggleBookmark = async () => {
    if (appEnv.useMocks) {
      setIsBookmarked(!isBookmarked);
      return;
    }
    try {
      const res = await yagApi.reader.followStory(storyId);
      setIsBookmarked(res.data.bookmarked);
      triggerLiveToast(res.data.message || "Đã cập nhật thư viện");
    } catch (err) {
      console.error("Bookmark error", err);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      if (appEnv.useMocks) {
        const updatedReviews = [{ rating: newReviewRating, content: newReviewContent, user: { username: "Bạn" } }, ...reviews];
        setReviews(updatedReviews);
        if (story) {
          const newAvg = updatedReviews.reduce((sum, r) => sum + r.rating, 0) / updatedReviews.length;
          setStory({
            ...story,
            rating_avg: newAvg,
            rating_count: updatedReviews.length
          });
        }
        setNewReviewContent("");
        setSubmittingReview(false);
        return;
      }
      await yagApi.apiFetch(`/api/v1/stories/${storyId}/reviews`, {
        method: "POST",
        body: { rating: newReviewRating, content: newReviewContent }
      });
      const [storyRes, reviewsRes] = await Promise.all([
        yagApi.reader.getStoryDetail(storyId),
        yagApi.reader.getReviews(storyId).catch(() => ({ data: { reviews: [] } })),
      ]);
      setStory(storyRes.data);
      setReviews(reviewsRes.data.reviews || []);
      setNewReviewContent("");
      triggerLiveToast("Đánh giá thành công!");
    } catch (err) {
      console.error("Review submit failed", err);
      triggerLiveToast("Đánh giá thất bại", "error");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (isLoading) {
    return (
      <AppShell activeId="s06">
        <div style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>
          Đang tải chi tiết bộ truyện...
        </div>
      </AppShell>
    );
  }

  if (!story) {
    return (
      <AppShell activeId="s06">
        <div style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>
          Không tìm thấy truyện hoặc truyện đã bị gỡ bỏ.
        </div>
      </AppShell>
    );
  }

  const authorName = getStoryAuthorName(story);
  const viewCount = Number(story.view_count) || 0;
  const views = viewCount >= 1000 ? `${(viewCount / 1000).toFixed(0)}K` : String(viewCount);
  const rating = Number(story.rating_avg);
  const ratingText = Number.isFinite(rating) ? rating.toFixed(1) : "0.0";

  return (
    <AppShell activeId="s06">
      <section className="layout-2">
        <aside className="panel panel-pad stack">
          <Cover index={1} coverUrl={story.cover_url} />
          {story.badge ? <StoryBadge badge={story.badge} /> : null}
          <div className="compact-stack">
            <strong>{authorName}</strong>
            <span className="story-meta">{chapters.length} chương · {views} lượt đọc · {ratingText} ★</span>
          </div>
          <button className="button" onClick={handleToggleBookmark}>
            <Icon name="book" />
            {isBookmarked ? "Đã lưu thư viện" : "Lưu thư viện"}
          </button>
        </aside>
        <main className="stack">
          <div className="panel panel-pad stack">
            <div>
              <h2 className="page-title" style={{ fontSize: 32 }}>{story.title}</h2>
              <p>{story.description}</p>
            </div>
            <div className="metric-grid">
              <MetricCard label="Lượt đọc" value={String(views)} />
              <MetricCard label="Đánh giá" value={ratingText} />
              <MetricCard label="Số chương" value={String(chapters.length)} />
              <MetricCard label="Trạng thái" value={story.status === "ongoing" ? "Đang cập nhật" : "Hoàn thành"} />
            </div>
            <div className="inline-actions">
              {chapters.length > 0 ? (
                <>
                  <Link className="button button-primary" href={`/stories/${storyId}/chapters/${chapters[0].chapter_number}`}>
                    <Icon name="book" /> Đọc từ đầu
                  </Link>
                  <Link className="button" href={`/stories/${storyId}/chapters/${chapters[chapters.length - 1].chapter_number}`}>
                    Đọc chương mới nhất
                  </Link>
                </>
              ) : (
                <span className="notice warning">Truyện hiện chưa có chương nào được xuất bản.</span>
              )}
            </div>
          </div>
          <div className="panel panel-pad">
            <div className="tabs">
              <button className={`tab-button ${commentTab === "chapters" ? "active" : ""}`} onClick={() => setCommentTab("chapters")}>
                Danh sách chương
              </button>
              <button className={`tab-button ${commentTab === "comments" ? "active" : ""}`} onClick={() => setCommentTab("comments")}>
                Đánh giá ({reviews.length})
              </button>
            </div>

            {commentTab === "chapters" ? (
              <div className="tab-panel active" style={{ marginTop: 16 }}>
                <div className="list">
                  {chapters.map((chap) => {
                    const readHref = `/stories/${storyId}/chapters/${chap.chapter_number}`;
                    return (
                      <div className="list-item" key={chap.id}>
                        <div>
                          <h3 className="list-title">Chương {chap.chapter_number}: {chap.title}</h3>
                          <div className="list-meta">{chap.is_premium ? "Premium" : "Miễn phí"}</div>
                        </div>
                        <Link className={`button ${chap.is_premium ? "button-soft" : ""}`} href={readHref}>
                          {chap.is_premium ? <><Icon name="lock" /> Đọc (Premium)</> : "Đọc"}
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="tab-panel active" style={{ marginTop: 16 }}>
                <div className="list">
                  {reviews.map((rev, index) => (
                    <div className="list-item" key={rev.id || index}>
                      <div>
                        <h3 className="list-title">{rev.user?.username || "Độc giả ẩn danh"} <span style={{ color: "var(--amber)", fontSize: 13 }}>{"★".repeat(rev.rating)}</span></h3>
                        <div className="list-meta">{rev.content || "Chỉ đánh giá sao."}</div>
                      </div>
                    </div>
                  ))}
                  <form onSubmit={handleSubmitReview} className="stack" style={{ gap: 12, marginTop: 24 }}>
                    <div className="field">
                      <label>Số sao đánh giá (1-5)</label>
                      <select className="select" value={newReviewRating} onChange={(e) => setNewReviewRating(Number(e.target.value))}>
                        <option value="5">5 sao - Tuyệt vời</option>
                        <option value="4">4 sao - Hay</option>
                        <option value="3">3 sao - Bình thường</option>
                        <option value="2">2 sao - Tạm được</option>
                        <option value="1">1 sao - Cần cải thiện</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>Viết đánh giá của bạn</label>
                      <textarea className="textarea" value={newReviewContent} onChange={(e) => setNewReviewContent(e.target.value)} required placeholder="Chia sẻ cảm xúc của bạn về bộ truyện..." />
                    </div>
                    <button className="button button-primary" type="submit" disabled={submittingReview}>
                      Gửi đánh giá
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </main>
      </section>
    </AppShell>
  );
}

export function ReaderScreen() {
  const params = useParams();
  const storyId = params?.id as string;
  const chapterNum = Number(params?.num || 1);

  const [story, setStory] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [chapter, setChapter] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [paywall, setPaywall] = useState(false);
  const [paywallMsg, setPaywallMsg] = useState("");

  const [fontSize, setFontSize] = useState(18);
  const [isDark, setIsDark] = useState(false);
  const [isWide, setIsWide] = useState(true);

  useEffect(() => {
    const syncSettings = () => {
      setFontSize(Number(localStorage.getItem("yag.reader.fontSize") || 18));
      setIsDark(localStorage.getItem("yag.reader.isDark") === "true");
      setIsWide(localStorage.getItem("yag.reader.isWide") !== "false");
    };
    if (typeof window !== "undefined") {
      syncSettings();
      window.addEventListener("yag:reader-settings-changed", syncSettings);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("yag:reader-settings-changed", syncSettings);
      }
    };
  }, []);

  const saveFontSize = (val: number) => {
    setFontSize(val);
    localStorage.setItem("yag.reader.fontSize", String(val));
    window.dispatchEvent(new Event("yag:reader-settings-changed"));
  };

  const toggleTheme = () => {
    const val = !isDark;
    setIsDark(val);
    localStorage.setItem("yag.reader.isDark", String(val));
    window.dispatchEvent(new Event("yag:reader-settings-changed"));
  };


  useEffect(() => {
    if (!storyId) return;

    if (appEnv.useMocks) {
      setStory(null);
      setChapter(null);
      setChapters([]);
      setComments([]);
      setIsLoading(false);
      return;
    }

    const loadChapterData = async () => {
      setIsLoading(true);
      setLoadError(null);
      setCommentError(null);
      setPaywall(false);
      setPaywallMsg("");
      setChapter(null);
      setComments([]);
      try {
        const storyRes = await yagApi.reader.getStoryDetail(storyId);
        setStory(storyRes.data);

        // Load all public chapters
        const chapsRes = await yagApi.reader.getChapters(storyId);
        const publicChapters = chapsRes.data || [];
        setChapters(publicChapters);

        const targetChap = publicChapters.find((c: any) => c.chapter_number === chapterNum);
        if (!targetChap) {
          setLoadError("Chương này chưa được xuất bản hoặc không tồn tại trong danh sách chương hiện có.");
          return;
        }

        try {
          const chapRes = await yagApi.chapters.getChapter(targetChap.id);
          setChapter(chapRes.data);
          const commRes = await yagApi.chapters.getComments(targetChap.id);
          setComments(commRes.data.comments || []);
        } catch (err: any) {
          if (err.status === 403 || (err.details && String(err.details).includes("Premium"))) {
            setPaywall(true);
            setPaywallMsg(err.message || "Chương này dành cho thành viên Premium.");
            setChapter(targetChap);
          } else {
            console.error("Error reading chapter:", err);
            setLoadError("Không thể tải nội dung chương. Vui lòng thử lại sau ít phút.");
          }
        }
      } catch (err) {
        console.error("Failed to load reader screen details:", err);
        setLoadError("Không thể tải dữ liệu truyện. Vui lòng kiểm tra kết nối hoặc thử lại.");
      } finally {
        setIsLoading(false);
      }
    };
    void loadChapterData();
  }, [storyId, chapterNum]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = newComment.trim();
    if (!content) {
      setCommentError("Vui lòng nhập nội dung bình luận.");
      return;
    }
    if (!chapter || paywall || isPostingComment) return;
    setIsPostingComment(true);
    setCommentError(null);
    try {
      if (appEnv.useMocks) {
        setComments([...comments, { id: String(Math.random()), user: { username: "Bạn" }, content }]);
        setNewComment("");
        return;
      }
      await yagApi.reader.postComment(chapter.id, { content });
      const commRes = await yagApi.chapters.getComments(chapter.id);
      setComments(commRes.data.comments || []);
      setNewComment("");
    } catch (err) {
      console.error("Post comment error", err);
      setCommentError("Không thể gửi bình luận lúc này. Vui lòng thử lại.");
    } finally {
      setIsPostingComment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="reader-page reader-immersive reader-state-page">
        <div className="reader-state-card">
          <span className="badge badge-blue">Reader Mode</span>
          <h1>Đang tải nội dung chương...</h1>
          <p>YAG đang chuẩn bị nội dung, mục lục và bình luận cho phiên đọc của bạn.</p>
        </div>
      </div>
    );
  }

  if (loadError || !chapter) {
    return (
      <div className="reader-page reader-immersive reader-state-page">
        <div className="reader-state-card">
          <span className="badge badge-red">Không thể mở chương</span>
          <h1>Chương truyện chưa sẵn sàng</h1>
          <p>{loadError || "Chương truyện không tồn tại hoặc chưa được xuất bản."}</p>
          <div className="inline-actions" style={{ justifyContent: "center" }}>
            <Link className="button button-primary" href={storyId ? `/stories/${storyId}` : "/home"}>
              Về trang truyện
            </Link>
            <Link className="button" href="/discover">
              Khám phá truyện khác
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentIndex = chapters.findIndex((c) => Number(c.chapter_number) === chapterNum);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  const prevChapter = safeIndex > 0 ? chapters[safeIndex - 1] : null;
  const nextChapter = safeIndex < chapters.length - 1 ? chapters[safeIndex + 1] : null;
  const totalChapters = Math.max(chapters.length, 1);
  const readingProgress = Math.min(100, Math.max(0, Math.round(((safeIndex + 1) / totalChapters) * 100)));
  const wordCount = paywall ? 0 : (chapter.content || "").split(/\s+/).filter(Boolean).length;
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 250));
  const displayChapterTitle = normalizeChapterTitle(chapterNum, chapter.title);
  const publishedAtLabel = chapter.publish_at
    ? new Date(chapter.publish_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "Chưa có lịch";
  const currentChapterHref = `/stories/${storyId}/chapters/${chapterNum}`;
  const prevChapterHref = prevChapter ? `/stories/${storyId}/chapters/${prevChapter.chapter_number}` : "";
  const nextChapterHref = nextChapter ? `/stories/${storyId}/chapters/${nextChapter.chapter_number}` : "";

  return (
    <>
      <div className={`reader-page reader-immersive ${isDark ? "reader-dark" : ""} ${isWide ? "reader-wide" : ""}`}>
        <div className="reader-progressbar" aria-hidden="true">
          <span style={{ width: `${readingProgress}%` }} />
        </div>
        <header className="reader-topbar">
          <div className="inline-actions">
            <Link className="button" href={storyId ? `/stories/${storyId}` : "/story-detail"}>
              <Icon name="arrow-left" />
              <span className="hide-mobile">Trang truyện</span>
            </Link>
            <div>
              <strong>{story?.title}</strong>
              <div className="story-meta">Chương {safeIndex + 1}/{totalChapters} · Chương {chapterNum}: {displayChapterTitle}</div>
            </div>
          </div>
          <div className="reader-topbar-center" aria-label="Tiến độ đọc">
            <span>{readingProgress}%</span>
            <div className="progress">
              <span style={{ width: `${readingProgress}%` }} />
            </div>
          </div>
          <div className="inline-actions">
            {chapter.is_premium && (
              <span className="badge badge-amber" style={{ marginRight: 8 }}><Icon name="lock" /> Premium</span>
            )}
            <Link className="button" href="#reader-comments">
              <Icon name="book" />
              <span className="hide-mobile">Bình luận</span>
            </Link>
            {nextChapter ? (
              <Link className="button button-primary" href={nextChapterHref}>
                Sau
                <Icon name="arrow" />
              </Link>
            ) : null}
          </div>
        </header>

        <main className="reader-layout">
          <aside className="reader-side-panel reader-chapter-panel" aria-label="Mục lục chương">
            <div className="reader-panel-head">
              <span className="badge badge-crimson">Đang đọc</span>
              <strong>Mục lục</strong>
            </div>
            <div className="reader-chapter-list">
              {chapters.map((c) => (
                <Link
                  className={`reader-chapter-link ${c.chapter_number === chapterNum ? "active" : ""}`}
                  href={`/stories/${storyId}/chapters/${c.chapter_number}`}
                  key={c.id || c.chapter_number}
                >
                  <span>{String(c.chapter_number).padStart(2, "0")}</span>
                  <strong>{normalizeChapterTitle(Number(c.chapter_number), c.title)}</strong>
                  {c.is_premium ? <Icon name="lock" /> : null}
                </Link>
              ))}
            </div>
          </aside>

          <article className="reader-content reader-paper" style={{ "--reader-font-size": `${fontSize}px` } as any}>
            <div className="reader-chapter-kicker">{story?.title}</div>
            <h1>Chương {chapterNum}: {displayChapterTitle}</h1>
            <div className="reader-meta-strip">
              <span><Icon name="book" />{wordCount} từ</span>
              <span><Icon name="calendar" />{readingMinutes} phút đọc</span>
              <span><Icon name="shield" />Chống sao chép bật</span>
            </div>

            {paywall ? (
              <div className="reader-unlock-panel" style={{ marginTop: 24 }}>
                <div>
                  <span className="badge badge-amber"><Icon name="lock" /> Premium</span>
                  <h2>{paywallMsg}</h2>
                  <p>Hãy đăng ký thành viên gói hội viên Premium của YAG để mở khóa toàn bộ chương truyện đặc sắc, lưu lịch sử đọc tự động và không có quảng cáo.</p>
                </div>
                <Link className="button button-primary" href="/membership"><Icon name="lock" /> Mở khóa ngay</Link>
              </div>
            ) : (
              <div className="reader-text-body">
                {chapter.content?.split("\n").map((para: string, idx: number) => {
                  if (para.trim().startsWith(">")) {
                    return <blockquote key={idx}>{para.replace(/^>\s*/, "")}</blockquote>;
                  }
                  return <p key={idx} style={{ fontSize: `${fontSize}px` }}>{para}</p>;
                })}
              </div>
            )}
          </article>

          <aside className="reader-side-panel reader-tools-panel" aria-label="Công cụ đọc">
            <div className="reader-panel-head">
              <span className="badge badge-blue">Phiên đọc</span>
              <strong>{readingProgress}%</strong>
            </div>
            <div className="reader-session-card">
              <div>
                <span>Thời lượng</span>
                <strong>{readingMinutes} phút</strong>
              </div>
              <div>
                <span>Từ trong chương</span>
                <strong>{wordCount}</strong>
              </div>
              <div>
                <span>Bình luận</span>
                <strong>{comments.length}</strong>
              </div>
              <div>
                <span>Công bố</span>
                <strong>{publishedAtLabel}</strong>
              </div>
            </div>
            <div className="reader-control-card">
              <div className="reader-control-head">
                <strong>Hiển thị</strong>
                <span>{fontSize}px</span>
              </div>
              <input
                className="range"
                type="range"
                min="16"
                max="24"
                value={fontSize}
                onChange={(e) => saveFontSize(Number(e.target.value))}
                aria-label="Cỡ chữ"
              />
              <div className="stack" style={{ gap: 8 }}>
                <button className={`button ${isDark ? "button-primary" : ""}`} type="button" onClick={toggleTheme} style={{ width: "100%" }}>
                  {isDark ? "Chuyển sang Nền sáng" : "Chuyển sang Nền tối"}
                </button>
              </div>
            </div>
            <div className="reader-control-card">
              <div className="reader-control-head">
                <strong>Chuyển chương</strong>
                <span>{safeIndex + 1}/{totalChapters}</span>
              </div>
              <div className="reader-mini-nav">
                {prevChapter ? (
                  <Link className="button" href={prevChapterHref}>Trước</Link>
                ) : (
                  <button className="button" type="button" disabled>Đầu truyện</button>
                )}
                <Link className="button button-soft" href={currentChapterHref}>Hiện tại</Link>
                {nextChapter ? (
                  <Link className="button button-primary" href={nextChapterHref}>Sau</Link>
                ) : (
                  <button className="button" type="button" disabled>Hết truyện</button>
                )}
              </div>
            </div>
          </aside>
        </main>



        <section id="reader-comments" className="reader-comments-section">
          <div className="reader-comments-head">
            <div>
              <span className="badge badge-crimson">Cộng đồng</span>
              <h2 className="section-title">Bình luận chương ({comments.length})</h2>
            </div>
            <Link className="button" href={currentChapterHref}>Lên đầu chương</Link>
          </div>
          <div className="list reader-comments-list">
            {comments.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}>
                <h3 className="section-title" style={{ fontSize: 18 }}>Chưa có bình luận</h3>
                <p className="section-subtitle">Hãy là người đầu tiên chia sẻ cảm nhận về chương này.</p>
              </div>
            ) : (
              comments.map((comm, index) => (
                <div className="list-item" key={comm.id || index}>
                  <div>
                    <h3 className="list-title">{comm.user?.username || comm.user?.display_name || "Độc giả ẩn danh"}</h3>
                    <div className="list-meta">{comm.content}</div>
                    <div className="list-meta" style={{ marginTop: 4 }}>
                      <span style={{ color: "var(--muted)", fontSize: 12 }}>
                        {formatRelativeTime(comm.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
            <form onSubmit={handlePostComment} className="stack" style={{ gap: 12, marginTop: 24 }}>
              <div className="field">
                <label>Bình luận của bạn</label>
                <textarea
                  className="textarea"
                  value={newComment}
                  onChange={(e) => {
                    setNewComment(e.target.value);
                    if (commentError) setCommentError(null);
                  }}
                  disabled={paywall || isPostingComment}
                  required
                  placeholder={paywall ? "Mở khóa chương để tham gia bình luận." : "Cảm nhận của bạn về chương này..."}
                  aria-invalid={commentError ? "true" : "false"}
                />
              </div>
              {commentError ? <div className="notice warning">{commentError}</div> : null}
              <button className="button button-primary" type="submit" disabled={paywall || isPostingComment}>
                {isPostingComment ? "Đang gửi..." : "Gửi bình luận"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </>
  );
}

function VerifiedBadge() {
  return (
    <svg viewBox="0 0 24 24" aria-label="Đã xác minh" className="verified-badge" style={{ width: 14, height: 14, fill: "#1d9bf0", flexShrink: 0, marginLeft: 4 }}>
      <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.99-3.818-3.99-.48 0-.94.1-1.348.27C14.825 2.515 13.512 1.5 12 1.5s-2.825 1.015-3.422 2.28c-.406-.17-.867-.27-1.348-.27-2.108 0-3.818 1.78-3.818 3.99 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.99 3.818 3.99.48 0 .94-.1 1.348-.27.597 1.265 1.91 2.28 3.422 2.28s2.825-1.015 3.422-2.28c.406.17.867.27 1.348.27 2.108 0 3.818-1.78 3.818-3.99 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6zm-12.5 4L6 12.5l1.5-1.5 2.5 2.5 6.5-6.5 1.5 1.5-8 8z" />
    </svg>
  );
}

export function ForumScreen() {
  const [posts, setPosts] = useState<any[]>([]);
  const [newPostContent, setNewPostContent] = useState("");
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [activeMoreMenu, setActiveMoreMenu] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"for-you" | "following">("for-you");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedPosts = getStoredJsonArray("yag.forum.posts", true);
      const filteredPosts = appEnv.useMocks
        ? storedPosts
        : storedPosts.filter((p: any) => p.id !== "p1" && p.id !== "p2" && p.id !== "p3");

      if (filteredPosts.length > 0) {
        setPosts(filteredPosts);
      } else {
        if (appEnv.useMocks) {
          const initialMock = [
            {
              id: "p1",
              authorName: "Hương Trà",
              authorAvatar: "HT",
              isVerified: true,
              time: "10 phút trước",
              createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
              content: "Mọi người nghĩ sao về chi tiết mở nút ở chương mới nhất? Mình đang tò mò hướng phát triển tiếp theo.",
              likes: 24,
              liked: false,
              replies: [
                { id: "r1_1", author: "Gia Hiển", authorAvatar: "GH", content: "Mình cũng thấy chi tiết đó có thể là gợi ý cho tuyến nhân vật phụ.", isVerified: true },
                { id: "r1_2", author: "Độc giả 03", authorAvatar: "D3", content: "Có thể tác giả đang chuẩn bị đảo chiều ở chương sau.", isVerified: false }
              ],
              showReplyBox: false,
            },
            {
              id: "p2",
              authorName: "Phú Thọ",
              authorAvatar: "PT",
              isVerified: true,
              time: "1 giờ trước",
              createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
              content: "Vừa đọc xong chương mới nhất. Nhịp kể chắc tay, đoạn kết chương khiến mình muốn đọc tiếp ngay.",
              likes: 12,
              liked: true,
              replies: [],
              showReplyBox: false,
            },
            {
              id: "p3",
              authorName: "Duy Trường",
              authorAvatar: "DT",
              isVerified: true,
              time: "2 giờ trước",
              createdAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
              content: "Có ai đề xuất thêm truyện cùng thể loại không ạ? Mình muốn tìm thêm vài bộ để đọc cuối tuần.",
              likes: 8,
              liked: false,
              replies: [
                { id: "r3_1", author: "Yến Nhi", authorAvatar: "YN", content: "Bạn có thể thử tìm kiếm bằng AI ngữ nghĩa trên trang Khám phá nhé!", isVerified: true }
              ],
              showReplyBox: false,
            }
          ];
          setPosts(initialMock);
          localStorage.setItem("yag.forum.posts", JSON.stringify(initialMock));
        } else {
          setPosts([]);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "yag.forum.posts" && e.newValue) {
        try {
          setPosts(JSON.parse(e.newValue));
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    if (!activeMoreMenu) return;
    const handleClose = () => setActiveMoreMenu(null);
    const timer = setTimeout(() => {
      document.addEventListener("click", handleClose);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleClose);
    };
  }, [activeMoreMenu]);

  const handleShare = (postId: string) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(`${window.location.origin}/forum#post-${postId}`).then(() => {
        triggerLiveToast("Đã sao chép liên kết bài viết vào bộ nhớ tạm!");
      }).catch(() => {
        triggerLiveToast("Không thể tự động sao chép liên kết.", "warning");
      });
    }
  };

  const handleHide = (postId: string) => {
    const updated = posts.filter(p => p.id !== postId);
    setPosts(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("yag.forum.posts", JSON.stringify(updated));
    }
    triggerLiveToast("Đã ẩn bài viết này khỏi bảng tin.");
  };

  const handleReport = (postId: string) => {
    console.log("Reported post:", postId);
    triggerLiveToast("Cảm ơn phản hồi. Bài viết đã được gửi cho ban quản trị để hậu kiểm.");
  };

  const handleLikePost = (postId: string) => {
    const updated = posts.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          liked: !p.liked,
          likes: p.liked ? p.likes - 1 : p.likes + 1
        };
      }
      return p;
    });
    setPosts(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("yag.forum.posts", JSON.stringify(updated));
    }
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;
    const newPost = {
      id: `p_${Date.now()}`,
      authorName: "Bạn",
      authorAvatar: "B",
      isVerified: false,
      time: "Vừa xong",
      createdAt: new Date().toISOString(),
      content: newPostContent,
      likes: 0,
      liked: false,
      replies: [],
      showReplyBox: false,
    };
    const updated = [newPost, ...posts];
    setPosts(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("yag.forum.posts", JSON.stringify(updated));
    }
    setNewPostContent("");
    triggerLiveToast("Đăng bài viết thành công!");
  };

  const toggleReplyBox = (postId: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return { ...p, showReplyBox: !p.showReplyBox };
      }
      return p;
    }));
  };

  const handleAddReplySubmit = (postId: string) => {
    const text = replyInputs[postId] || "";
    if (!text.trim()) return;
    const updated = posts.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          replies: [...p.replies, { id: `r_${Date.now()}`, author: "Bạn", authorAvatar: "B", content: text, isVerified: false }],
          showReplyBox: false
        };
      }
      return p;
    });
    setPosts(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("yag.forum.posts", JSON.stringify(updated));
    }
    setReplyInputs(prev => ({ ...prev, [postId]: "" }));
    triggerLiveToast("Đã gửi phản hồi.");
  };

  const displayedPosts = activeTab === "for-you"
    ? posts
    : posts.filter(p => p.isVerified || p.authorName === "Bạn");

  return (
    <AppShell activeId="s08">
      <div className="forum-shell">
        <main className="forum-feed">
          {/* Tabs Bar */}
          <div className="threads-tabs">
            <button
              type="button"
              className={`threads-tab ${activeTab === "for-you" ? "active" : ""}`}
              onClick={() => setActiveTab("for-you")}
            >
              Dành cho bạn
            </button>
            <button
              type="button"
              className={`threads-tab ${activeTab === "following" ? "active" : ""}`}
              onClick={() => setActiveTab("following")}
            >
              Đang theo dõi
            </button>
          </div>

          {/* Post Composer */}
          <form onSubmit={handleCreatePost} className="forum-composer">
            <div className="forum-composer-left">
              <div className="avatar" style={{ background: "var(--crimson)", color: "white" }}>
                B
              </div>
            </div>
            <div className="forum-composer-input-wrap">
              <textarea
                className="forum-composer-textarea"
                rows={2}
                placeholder="Bạn đang nghĩ gì?..."
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
              />
              <div className="forum-composer-actions">
                <button className="button button-primary" type="submit" disabled={!newPostContent.trim()}>
                  Đăng
                </button>
              </div>
            </div>
          </form>

          {/* Social Thread Feed */}
          {displayedPosts.length === 0 ? (
            <div className="panel panel-pad" style={{ textAlign: "center", color: "var(--muted)", padding: 48, borderRadius: 12 }}>
              Chưa có bài viết nào trong mục này.
            </div>
          ) : (
            displayedPosts.map((post) => (
              <div className="thread-item-wrapper" key={post.id}>
                {/* Parent Post */}
                <div className="thread-post">
                  <div className="thread-left-col">
                    <div className="avatar" style={{ background: post.authorName === "Bạn" ? "var(--crimson)" : "var(--jungle)" }}>
                      {post.authorAvatar || post.authorName.substring(0, 2).toUpperCase()}
                    </div>
                    {post.replies.length > 0 && <div className="thread-line"></div>}
                  </div>

                  <div className="thread-right-col">
                    <div className="thread-author-row">
                      <div className="thread-author-info">
                        <span className="thread-author-name">{post.authorName}</span>
                        {post.isVerified && <VerifiedBadge />}
                        <span className="thread-time">{post.createdAt ? formatRelativeTime(post.createdAt) : post.time}</span>
                      </div>

                      <div style={{ position: "relative" }}>
                        <button
                          className="button icon-button forum-more-btn"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMoreMenu(activeMoreMenu === post.id ? null : post.id);
                          }}
                          style={{ padding: 4, height: 28, width: 28, minWidth: 28, background: "transparent", border: 0, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                          aria-label="Tùy chọn bài viết"
                        >
                          <Icon name="settings" />
                        </button>
                        {activeMoreMenu === post.id && (
                          <div className="menu dropdown-menu" style={{ right: 0, top: 32, position: "absolute", zIndex: 10, minWidth: 120 }}>
                            <button className="menu-item" type="button" onClick={() => handleShare(post.id)}>Chia sẻ</button>
                            <button className="menu-item" type="button" onClick={() => handleHide(post.id)}>Ẩn bài viết</button>
                            <button className="menu-item" type="button" onClick={() => handleReport(post.id)} style={{ color: "var(--crimson)" }}>Báo cáo</button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="thread-content">{post.content}</div>

                    <div className="thread-actions">
                      <button
                        type="button"
                        className={`thread-action-btn ${post.liked ? "active" : ""}`}
                        onClick={() => handleLikePost(post.id)}
                        title="Thích"
                      >
                        <Icon name="heart" />
                      </button>
                      <button
                        type="button"
                        className="thread-action-btn"
                        onClick={() => toggleReplyBox(post.id)}
                        title="Bình luận"
                      >
                        <Icon name="message" />
                      </button>
                      <button
                        type="button"
                        className="thread-action-btn"
                        onClick={() => {
                          handleLikePost(post.id);
                          triggerLiveToast("Đã chia sẻ lại chủ đề này!");
                        }}
                        title="Repost"
                      >
                        <Icon name="repost" />
                      </button>
                      <button
                        type="button"
                        className="thread-action-btn"
                        onClick={() => handleShare(post.id)}
                        title="Gửi"
                      >
                        <Icon name="send" />
                      </button>
                    </div>

                    {(post.likes > 0 || post.replies.length > 0) && (
                      <div className="thread-stats">
                        {post.likes > 0 && `${post.likes} lượt thích`}
                        {post.likes > 0 && post.replies.length > 0 && " • "}
                        {post.replies.length > 0 && `${post.replies.length} phản hồi`}
                      </div>
                    )}
                  </div>
                </div>

                {/* Inline Reply box */}
                {post.showReplyBox && (
                  <div className="thread-post" style={{ marginTop: 12 }}>
                    <div className="thread-left-col">
                      <div className="avatar mini" style={{ background: "var(--crimson)" }}>
                        B
                      </div>
                    </div>
                    <div className="thread-right-col">
                      <div className="forum-reply-box">
                        <input
                          type="text"
                          placeholder="Trả lời..."
                          value={replyInputs[post.id] || ""}
                          onChange={(e) => setReplyInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddReplySubmit(post.id);
                          }}
                        />
                        <button className="button button-primary" type="button" onClick={() => handleAddReplySubmit(post.id)}>
                          Gửi
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Replies list */}
                {post.replies.length > 0 && (
                  <div className="thread-replies-list">
                    {post.replies.map((reply: any) => (
                      <div className="thread-reply" key={reply.id}>
                        <div className="thread-left-col">
                          <div className="avatar mini" style={{ background: reply.author === "Bạn" ? "var(--crimson)" : "var(--jungle)" }}>
                            {reply.authorAvatar || reply.author.substring(0, 2).toUpperCase()}
                          </div>
                        </div>
                        <div className="thread-right-col">
                          <div className="thread-reply-header">
                            <div className="thread-author-info">
                              <span className="thread-author-name">{reply.author}</span>
                              {reply.isVerified && <VerifiedBadge />}
                            </div>
                            <span className="thread-time">Vừa xong</span>
                          </div>
                          <div className="thread-content" style={{ fontSize: 14 }}>{reply.content}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </main>
      </div>
    </AppShell>
  );
}

const formatPrice = (price: number) => {
  return price >= 1000 ? `${price / 1000}Kđ` : `${price}đ`;
};

export function MembershipScreen() {
  const { user } = useAuth();
  const defaultPlans = [
    { name: "Tháng", id: "MONTHLY", price: 39000, duration_days: 30, description: "Linh hoạt cho độc giả mới" },
    { name: "Năm", id: "YEARLY", price: 199000, duration_days: 365, description: "Dành cho người đọc thường xuyên" }
  ];
  const [plans, setPlans] = useState<any[]>(appEnv.useMocks ? defaultPlans : []);
  const [isLoadingPlans, setIsLoadingPlans] = useState(!appEnv.useMocks);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const [isPremium, setIsPremium] = useState(false);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [membershipExpiry, setMembershipExpiry] = useState<string | null>(null);

  useEffect(() => {
    if (user?.premium_until) {
      const active = new Date(user.premium_until) > new Date();
      setIsPremium(active);
      setMembershipExpiry(active ? user.premium_until : null);
    } else if (appEnv.useMocks && typeof window !== "undefined") {
      const cached = localStorage.getItem("yag.mockMembership");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.is_active && parsed.premium_until) {
            const active = new Date(parsed.premium_until) > new Date();
            setIsPremium(active);
            setMembershipExpiry(active ? parsed.premium_until : null);
          } else {
            setIsPremium(false);
            setMembershipExpiry(null);
          }
        } catch {
          setIsPremium(false);
          setMembershipExpiry(null);
        }
      } else {
        setIsPremium(false);
        setMembershipExpiry(null);
      }
    } else {
      setIsPremium(false);
      setMembershipExpiry(null);
    }
  }, [user]);

  useEffect(() => {
    if (!isPremium) {
      setActivePlanId(null);
      return;
    }

    if (appEnv.useMocks) {
      const cached = localStorage.getItem("yag.mockMembership");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.is_active && parsed.plan_name) {
            const name = parsed.plan_name.toLowerCase();
            if (name.includes("năm") || name.includes("yearly")) {
              setActivePlanId("YEARLY");
            } else {
              setActivePlanId("MONTHLY");
            }
          } else {
            setActivePlanId("MONTHLY");
          }
        } catch {
          setActivePlanId("MONTHLY");
        }
      } else {
        setActivePlanId("MONTHLY");
      }
    } else {
      yagApi.billing.getTransactionHistory()
        .then((res) => {
          const successTxs = (res.data || []).filter((tx: any) => tx.status === "success");
          if (successTxs.length > 0) {
            const latest = successTxs[0];
            setActivePlanId(latest.plan_id || (latest.plan_name?.toLowerCase().includes("năm") ? "YEARLY" : "MONTHLY"));
          } else {
            setActivePlanId("MONTHLY");
          }
        })
        .catch(() => {
          setActivePlanId("MONTHLY");
        });
    }
  }, [isPremium, user]);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("vi-VN", { year: "numeric", month: "long", day: "numeric" });
    } catch {
      return dateStr;
    }
  };

  useEffect(() => {
    if (appEnv.useMocks) return;
    const fetchPlans = async () => {
      setIsLoadingPlans(true);
      try {
        const res = await yagApi.apiFetch<any[]>("/api/v1/membership/plans");
        setPlans(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Failed to load plans:", err);
        setPlans([]);
      } finally {
        setIsLoadingPlans(false);
      }
    };
    void fetchPlans();
  }, []);

  const handlePlanCheckout = async (planId: string) => {
    setLoadingPlan(planId);
    if (appEnv.useMocks) {
      // eslint-disable-next-line react-hooks/purity
      const mockTxn = `MOCK_${planId}_${Date.now()}`;
      if (typeof window !== "undefined") {
        window.location.assign(`/payment/result?status=success&plan=${planId}&orderCode=${mockTxn}`);
      }
      return;
    }
    try {
      const returnUrl = `${window.location.origin}/payment/result`;
      const res = await yagApi.billing.createPayosCheckout({ planCode: planId, returnUrl });
      if (res.data?.paymentUrl) {
        if (typeof window !== "undefined") {
          window.location.assign(res.data.paymentUrl);
        }
      } else {
        triggerLiveToast("Không lấy được đường dẫn thanh toán từ máy chủ.", "warning");
      }
    } catch (err: any) {
      console.error("PayOS Checkout error", err);
      triggerLiveToast(err.message || "Lỗi tạo phiên thanh toán PayOS.", "warning");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <AppShell activeId="s09">
      <div className="notice success" style={{ marginBottom: 24 }}>
        <Icon name="check" />
        {isPremium ? (
          <>Gói hiện tại: <strong>Premium</strong> (Hạn sử dụng đến ngày {membershipExpiry ? formatDate(membershipExpiry) : ""}) · Bạn đang sở hữu đặc quyền mở khóa toàn bộ chương truyện đặc sắc.</>
        ) : (
          <>Gói hiện tại: <strong>Miễn phí</strong> · Đăng ký gói Premium để xem các chương Premium của tác giả.</>
        )}
      </div>
      <div className="action-strip" style={{ marginBottom: 24 }}>
        <div>
          <strong>Thanh toán an toàn qua cổng PayOS (QR Code)</strong>
          <div className="list-meta">YAG không lưu thông tin thẻ hoặc tài khoản ngân hàng của người dùng.</div>
        </div>
      </div>
      {isLoadingPlans ? (
        <section className="panel panel-pad" style={{ textAlign: "center", color: "var(--muted)" }}>
          Đang tải danh sách gói Membership...
        </section>
      ) : plans.length === 0 ? (
        <section className="notice warning">
          <Icon name="bell" />
          Chưa có gói Membership khả dụng từ hệ thống thanh toán.
        </section>
      ) : (
        <section className="grid grid-3">
          {plans.map((plan, index) => {
            const isActive = isPremium && plan.id === activePlanId;
            const isOtherPlan = isPremium && plan.id !== activePlanId;

            return (
              <article
                className="panel panel-pad stack"
                key={plan.id}
                style={{
                  border: isActive ? "2px solid var(--crimson)" : "1px solid var(--line)",
                  position: "relative"
                }}
              >
                {isActive && (
                  <span className="badge badge-green" style={{ position: "absolute", top: 12, right: 12 }}>
                    Gói hiện tại
                  </span>
                )}
                <span className={`badge ${index === 0 ? "badge-crimson" : "badge-blue"}`}>
                  {index === 0 ? "Phổ biến nhất" : (plan.name === "Tháng" ? "Gói Tháng" : "Gói Năm")}
                </span>
                <h2 className="page-title" style={{ fontSize: 24 }}>{plan.name}</h2>
                <div className="metric-value">{formatPrice(Number(plan.price))}</div>
                <p className="section-subtitle">{plan.description || `Hiệu lực trong ${plan.duration_days} ngày.`}</p>
                <div className="list">
                  {["Mở khóa chương premium", "Không quảng cáo khi đọc", "Tìm kiếm AI ngữ nghĩa nâng cao", "Lưu tiến độ đọc tự động"].map((item) => (
                    <div className="list-item" key={item}>
                      <span>{item}</span>
                      <Icon name="check" />
                    </div>
                  ))}
                </div>
                <button
                  className={`button ${isActive ? "button-soft" : (index === 0 ? "button-primary" : "")}`}
                  onClick={() => handlePlanCheckout(plan.id)}
                  style={{ width: "100%" }}
                  disabled={loadingPlan !== null || isActive}
                >
                  {loadingPlan === plan.id
                    ? "Đang xử lý..."
                    : isActive
                      ? "Đang sử dụng"
                      : isOtherPlan
                        ? (plan.id === "YEARLY" ? "Nâng cấp gói" : "Gia hạn gói")
                        : "Đăng ký ngay"}
                </button>
              </article>
            );
          })}
        </section>
      )}

      {process.env.NODE_ENV !== "production" && (
        <section className="panel panel-pad stack" style={{ marginTop: 32, borderColor: "var(--amber)", background: "rgba(245, 158, 11, 0.04)" }}>
          <h3 style={{ margin: 0, color: "var(--amber)", fontSize: 16 }}><Icon name="settings" /> [Chế độ Dev] Mô phỏng kết quả thanh toán PayOS</h3>
          <p style={{ margin: "4px 0 16px", fontSize: 13, color: "var(--muted)" }}>Bypass cổng PayOS thực để trực tiếp cập nhật Premium tài khoản.</p>
          <div className="inline-actions">
            <button
              className="button button-success"
              onClick={() => {
                const mockTxn = `MOCK_MONTHLY_${Date.now()}`;
                window.location.href = `/payment/result?status=success&orderCode=${mockTxn}&plan=MONTHLY`;
              }}
            >
              Mô phỏng Thành công (Premium)
            </button>
            <button
              className="button button-danger"
              onClick={() => {
                const mockTxn = `MOCK_MONTHLY_${Date.now()}`;
                window.location.href = `/payment/result?status=cancel&orderCode=${mockTxn}&plan=MONTHLY`;
              }}
            >
              Mô phỏng Thất bại
            </button>
          </div>
        </section>
      )}
    </AppShell>
  );
}

export function PaymentScreen() {
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();

  const [verificationResult, setVerificationResult] = useState<{
    loading: boolean;
    success: boolean;
    message: string;
    details?: any;
  }>({
    loading: true,
    success: false,
    message: "Đang tiến hành xác thực giao dịch...",
  });

  const responseCode = searchParams.get("status") || searchParams.get("vnp_ResponseCode");
  const planId = searchParams.get("plan") || "MONTHLY";
  const txnRef = searchParams.get("orderCode") || searchParams.get("vnp_TxnRef") || searchParams.get("transactionId") || searchParams.get("txnRef");

  useEffect(() => {
    let active = true;

    const verifyPayment = async () => {
      // Build queryParams object from searchParams
      const queryParams: Record<string, string> = {};
      searchParams.forEach((value, key) => {
        queryParams[key] = value;
      });

      if (!txnRef) {
        if (active) {
          setVerificationResult({
            loading: false,
            success: false,
            message: "Không tìm thấy thông tin mã giao dịch đối soát.",
          });
        }
        return;
      }

      const processPaymentData = (data: {
        success: boolean;
        transaction_id?: string;
        plan_name?: string;
        amount?: number;
        premium_until?: string;
        message: string;
        vnp_transaction_no?: string;
      }) => {
        if (!data || !data.success) {
          if (active) {
            setVerificationResult({
              loading: false,
              success: false,
              message: data?.message || "Giao dịch không thành công.",
              details: data,
            });
          }
          return;
        }

        if (!appEnv.useMocks) {
          if (active) {
            setVerificationResult({
              loading: false,
              success: true,
              message: data.message || "Giao dịch đã được xác thực thành công!",
              details: data,
            });
          }
          return;
        }

        let expiry = data.premium_until;
        const cached = localStorage.getItem("yag.mockMembership");
        let cachedExpiry: Date | null = null;
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed.is_active && parsed.premium_until) {
              cachedExpiry = new Date(parsed.premium_until);
            }
          } catch { }
        }

        const rawAmt = data.amount || (planId === "YEARLY" ? 199000 : 39000);
        const amountVal = rawAmt >= 1000000 ? rawAmt / 100 : rawAmt;
        const durationDays = amountVal > 100000 ? 365 : 30;

        const now = new Date();
        if (cachedExpiry && cachedExpiry > now) {
          const extendedDate = new Date(cachedExpiry);
          extendedDate.setDate(extendedDate.getDate() + durationDays);
          if (!expiry || new Date(expiry) < extendedDate) {
            expiry = extendedDate.toISOString();
          }
        }

        if (!expiry) {
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + durationDays);
          expiry = expiryDate.toISOString();
        }

        localStorage.setItem("yag.mockMembership", JSON.stringify({
          is_active: true,
          plan_name: data.plan_name || (planId === "YEARLY" ? "Gói Năm Premium" : "Gói Tháng Premium"),
          premium_until: expiry
        }));

        const uniqueId = data.transaction_id &&
          data.transaction_id !== "00000000-0000-0000-0000-000000000000" &&
          data.transaction_id !== "MOCK_TRANSACTION_ID"
          ? data.transaction_id
          : "MOCK_TXN_" + Date.now() + "_" + Math.floor(Math.random() * 1000);

        const mockTx = {
          id: uniqueId,
          plan_name: data.plan_name || (planId === "YEARLY" ? "Gói Năm Premium" : "Gói Tháng Premium"),
          amount: amountVal,
          status: "success",
          created_at: new Date().toISOString(),
          vnp_transaction_no: data.vnp_transaction_no || "MOCK_PAYOS_" + Date.now() + "_" + Math.floor(Math.random() * 100)
        };

        const historyList = JSON.parse(localStorage.getItem("yag.mockHistory") || "[]");
        const exists = historyList.some((item: any) => item.id === mockTx.id);
        if (!exists) {
          historyList.unshift(mockTx);
          localStorage.setItem("yag.mockHistory", JSON.stringify(historyList));
        }

        if (active) {
          setVerificationResult({
            loading: false,
            success: true,
            message: data.message || "Giao dịch đã được xác thực thành công!",
            details: {
              ...data,
              plan_name: mockTx.plan_name,
              amount: mockTx.amount,
              vnp_transaction_no: mockTx.vnp_transaction_no,
              premium_until: expiry
            },
          });
        }
      };

      if (appEnv.useMocks) {
        const isMockSuccess = responseCode === "00" || responseCode === "success";
        const rawAmount = planId === "YEARLY" ? 199000 : 39000;
        const durationDays = planId === "YEARLY" ? 365 : 30;

        let baseDate = new Date();
        const cached = localStorage.getItem("yag.mockMembership");
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed.is_active && parsed.premium_until) {
              const currentExpiry = new Date(parsed.premium_until);
              if (currentExpiry > baseDate) {
                baseDate = currentExpiry;
              }
            }
          } catch { }
        }

        const expiryDate = new Date(baseDate);
        expiryDate.setDate(expiryDate.getDate() + durationDays);

        const mockData = {
          success: isMockSuccess,
          transaction_id: txnRef || `MOCK_TXN_${Date.now()}`,
          plan_name: planId === "YEARLY" ? "Gói Năm Premium" : "Gói Tháng Premium",
          amount: rawAmount,
          premium_until: expiryDate.toISOString(),
          message: isMockSuccess ? "Mô phỏng thanh toán thành công!" : "Mô phỏng thanh toán thất bại."
        };

        processPaymentData(mockData);
        return;
      }

      try {
        const res = await yagApi.billing.verifyPayos(queryParams);
        if (active) {
          if (res.data.success) {
            processPaymentData(res.data);
            await refreshUser();
          } else {
            setVerificationResult({
              loading: false,
              success: false,
              message: res.data.message || "Giao dịch không hợp lệ hoặc chữ ký đối soát sai.",
              details: res.data,
            });
          }
        }
      } catch (err: any) {
        console.warn("Verify API failed:", err);
        if (active) {
          setVerificationResult({
            loading: false,
            success: false,
            message: err?.message || "Không thể xác thực giao dịch với máy chủ.",
            details: { error: err?.message },
          });
        }
      }
    };

    void verifyPayment();
    return () => {
      active = false;
    };
  }, [searchParams, txnRef, planId, responseCode]);

  const isPending = verificationResult.loading;
  const isSuccess = verificationResult.success;
  const details = verificationResult.details;

  return (
    <AppShell activeId="s10">
      {isSuccess && (
        <div className="confetti-container" aria-hidden="true" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1000, overflow: "hidden" }}>
          {/* Custom SVG fireworks micro-animation */}
          <svg width="100%" height="100%">
            <circle cx="20%" cy="30%" r="5" fill="#EF4444" opacity="0.8">
              <animate attributeName="r" values="0;25" dur="1.8s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="1;0" dur="1.8s" repeatCount="indefinite" />
            </circle>
            <circle cx="80%" cy="20%" r="5" fill="#3B82F6" opacity="0.8">
              <animate attributeName="r" values="0;30" dur="2.2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="1;0" dur="2.2s" repeatCount="indefinite" />
            </circle>
            <circle cx="50%" cy="40%" r="5" fill="#10B981" opacity="0.8">
              <animate attributeName="r" values="0;40" dur="2.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="1;0" dur="2.5s" repeatCount="indefinite" />
            </circle>
          </svg>
        </div>
      )}
      <section className="layout-right">
        <main className="panel panel-pad stack">
          {isPending ? (
            <div className="empty-state" style={{ borderStyle: "solid" }}>
              <span className="badge badge-blue"><Icon name="card" />Đang xác nhận</span>
              <h2 className="page-title" style={{ fontSize: 24 }}>{verificationResult.message}</h2>
              <p>YAG đang đối soát giao dịch với PayOS. Xin vui lòng không đóng trình duyệt lúc này...</p>
            </div>
          ) : isSuccess ? (
            <div className="empty-state" style={{ borderStyle: "solid" }}>
              <span className="badge badge-green"><Icon name="check" />Thanh toán thành công</span>
              <h2 className="page-title" style={{ fontSize: 24 }}>Gói hội viên đã được kích hoạt</h2>
              <p>
                Cảm ơn bạn đã đăng ký {details?.plan_name || (planId === "YEARLY" ? "Gói Năm Premium" : "Gói Tháng Premium")} của YAG để ủng hộ tác giả và trải nghiệm không quảng cáo.
                {details?.premium_until && (
                  <> Hạn sử dụng đến ngày {new Date(details.premium_until).toLocaleDateString("vi-VN")}.</>
                )}
              </p>
              <div className="inline-actions">
                <Link className="button button-primary" href="/home">Bắt đầu đọc</Link>
                <Link className="button" href="/library">Về thư viện</Link>
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{ borderStyle: "solid" }}>
              <span className="badge badge-red"><Icon name="close" />Thanh toán thất bại</span>
              <h2 className="page-title" style={{ fontSize: 24 }}>Giao dịch không thành công</h2>
              <p>{verificationResult.message}</p>
              <ErrorGuide title="Cách xử lý" items={["Kiểm tra số dư và hạn mức thanh toán online của thẻ.", "Thử lại sau ít phút hoặc liên hệ ngân hàng phát hành.", "Nếu tài khoản đã bị trừ tiền, gửi mã giao dịch cho hỗ trợ YAG để đối soát."]} />
              <div className="inline-actions">
                <Link className="button button-primary" href="/membership">Thử lại</Link>
                <Link className="button" href="/home">Về trang chủ</Link>
              </div>
            </div>
          )}
        </main>
        <aside className="panel panel-pad stack">
          <h2 className="section-title">Thông tin giao dịch</h2>
          <div className="list">
            <div className="list-item"><span>Phương thức</span><strong>PayOS Cổng thanh toán</strong></div>
            <div className="list-item"><span>Gói đăng ký</span><strong>{details?.plan_name || (planId === "YEARLY" ? "Gói Năm Premium" : "Gói Tháng Premium")}</strong></div>

            {txnRef ? (
              <div className="list-item" style={{ flexDirection: "column", alignItems: "stretch", gap: 4 }}>
                <span style={{ fontSize: "13px", color: "var(--muted)" }}>Mã tham chiếu</span>
                <code style={{ fontSize: "12px", background: "rgba(0, 0, 0, 0.04)", padding: "4px 8px", borderRadius: "4px", overflowWrap: "anywhere" }}>{txnRef}</code>
              </div>
            ) : null}

            {details?.vnp_transaction_no ? (
              <div className="list-item" style={{ flexDirection: "column", alignItems: "stretch", gap: 4 }}>
                <span style={{ fontSize: "13px", color: "var(--muted)" }}>Mã GD PayOS</span>
                <code style={{ fontSize: "12px", background: "rgba(0, 0, 0, 0.04)", padding: "4px 8px", borderRadius: "4px", overflowWrap: "anywhere" }}>{details.vnp_transaction_no}</code>
              </div>
            ) : null}

            {details?.amount ? <div className="list-item"><span>Số tiền</span><strong>{details.amount.toLocaleString()}đ</strong></div> : null}

            <div className="list-item"><span>Trạng thái</span>
              <span className={`badge ${isPending ? "badge-blue" : isSuccess ? "badge-green" : "badge-red"}`}>
                {isPending ? "Đang xác nhận" : isSuccess ? "Đã thanh toán" : "Thất bại"}
              </span>
            </div>
          </div>
          <div className="notice warning">
            <Icon name="bell" />
            Nếu tài khoản đã bị trừ tiền nhưng dịch vụ chưa cập nhật, hãy gửi mã giao dịch cho quản trị viên.
          </div>
        </aside>
      </section>
    </AppShell>
  );
}

export function LibraryScreen() {
  const [storiesList, setStoriesList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"following" | "history" | "completed" | "premium">("following");

  const loadLibrary = async () => {
    try {
      if (appEnv.useMocks) {
        setStoriesList([]);
      } else {
        const res = await yagApi.reader.getLibrary();
        setStoriesList(res.data || []);
      }
    } catch (err) {
      console.error("Failed to load library", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadLibrary();
  }, []);

  const displayedStories = storiesList.filter(story => {
    if (activeTab === "following") return true;
    if (activeTab === "history") {
      return (story.chapters_read ?? 0) > 0;
    }
    if (activeTab === "completed") {
      return story.status === "completed";
    }
    if (activeTab === "premium") {
      return story.is_premium || (story.chapters && story.chapters.some((c: any) => c.is_premium));
    }
    return true;
  });

  return (
    <AppShell activeId="s11">
      <section className="panel panel-pad stack">
        <div className="inline-actions" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div className="tabs" style={{ flexWrap: "wrap", gap: 4 }}>
            <button
              className={`tab-button ${activeTab === "following" ? "active" : ""}`}
              onClick={() => setActiveTab("following")}
            >
              Đang theo dõi ({storiesList.length})
            </button>
            <button
              className={`tab-button ${activeTab === "history" ? "active" : ""}`}
              onClick={() => setActiveTab("history")}
            >
              Đọc tiếp
            </button>
            <button
              className={`tab-button ${activeTab === "completed" ? "active" : ""}`}
              onClick={() => setActiveTab("completed")}
            >
              Đã hoàn thành
            </button>
            <button
              className={`tab-button ${activeTab === "premium" ? "active" : ""}`}
              onClick={() => setActiveTab("premium")}
            >
              Premium
            </button>
          </div>
          <button
            className="button"
            onClick={() => {
              setIsLoading(true);
              void loadLibrary();
            }}
          >
            Làm mới
          </button>
        </div>

        {isLoading ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>
            Đang tải thư viện truyện...
          </div>
        ) : displayedStories.length === 0 ? (
          <div className="empty-state" style={{ padding: "64px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 40, color: "var(--muted)" }}>📚</div>
            {activeTab === "following" && (
              <>
                <h3 style={{ fontSize: 18, fontWeight: "bold", margin: 0, color: "var(--jungle-dark)" }}>Danh sách theo dõi trống</h3>
                <p style={{ margin: 0, color: "var(--muted)", maxWidth: 400 }}>Hãy lưu những tác phẩm bạn yêu thích từ trang chi tiết để theo dõi chương mới nhất.</p>
                <Link className="button button-primary" href="/discover" style={{ marginTop: 8 }}>Khám phá truyện mới</Link>
              </>
            )}
            {activeTab === "history" && (
              <>
                <h3 style={{ fontSize: 18, fontWeight: "bold", margin: 0, color: "var(--jungle-dark)" }}>Không có lịch sử đọc</h3>
                <p style={{ margin: 0, color: "var(--muted)", maxWidth: 400 }}>Bắt đầu đọc chương đầu tiên của các tác phẩm thú vị ngay hôm nay!</p>
                <Link className="button button-primary" href="/home" style={{ marginTop: 8 }}>Xem trang chủ đọc</Link>
              </>
            )}
            {activeTab === "completed" && (
              <>
                <h3 style={{ fontSize: 18, fontWeight: "bold", margin: 0, color: "var(--jungle-dark)" }}>Chưa có truyện hoàn thành</h3>
                <p style={{ margin: 0, color: "var(--muted)", maxWidth: 400 }}>Danh sách truyện đã hoàn thiện trong thư viện của bạn sẽ xuất hiện ở đây.</p>
                <Link className="button button-primary" href="/discover?status=completed" style={{ marginTop: 8 }}>Tìm truyện đã hoàn thiện</Link>
              </>
            )}
            {activeTab === "premium" && (
              <>
                <h3 style={{ fontSize: 18, fontWeight: "bold", margin: 0, color: "var(--jungle-dark)" }}>Không có truyện Premium</h3>
                <p style={{ margin: 0, color: "var(--muted)", maxWidth: 400 }}>Các truyện chứa chương Premium bạn đang theo dõi sẽ xuất hiện tại đây.</p>
                <Link className="button button-primary" href="/discover" style={{ marginTop: 8 }}>Tìm truyện có Premium</Link>
              </>
            )}
          </div>
        ) : (
          <QuickStories storiesList={displayedStories} />
        )}
      </section>
    </AppShell>
  );
}

export function ProfileScreen({ modeOverride }: { modeOverride?: "reader" | "author" | "admin" }) {
  const { user } = useAuth();
  const [activeProfileTab, setActiveProfileTab] = useState("stats");
  const [announcementText, setAnnouncementText] = useState("");
  const [announcements, setAnnouncements] = useState<any[]>([]);

  const name = user?.profile?.display_name || user?.username || "Người dùng";
  const bio = user?.profile?.bio || (modeOverride === "author" ? "Tác giả trên YAG" : "Thành viên YAG");
  const score = user?.profile?.reputation_score;
  const avatarText = name.slice(0, 2).toUpperCase();

  // Load announcements from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("yag.author.announcements");
      if (stored) {
        setAnnouncements(getStoredJsonArray("yag.author.announcements", appEnv.useMocks));
      } else {
        setAnnouncements([]);
      }
    }
  }, []);

  const handlePostAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementText.trim()) return;

    const lines = announcementText.split("\n");
    const title = lines[0].substring(0, 80) || "Thông báo từ tác giả";
    const content = lines.slice(1).join("\n") || "Chi tiết thông báo...";

    const newAnn = {
      id: `ann-${Date.now()}`,
      title,
      content,
      date: new Date().toLocaleDateString("vi-VN")
    };

    const updated = [newAnn, ...announcements];
    setAnnouncements(updated);
    localStorage.setItem("yag.author.announcements", JSON.stringify(updated));
    setAnnouncementText("");
    triggerLiveToast("Đã đăng thông báo mới lên trang cá nhân.");
  };

  const handleDeleteAnnouncement = (id: string) => {
    const updated = announcements.filter(a => a.id !== id);
    setAnnouncements(updated);
    localStorage.setItem("yag.author.announcements", JSON.stringify(updated));
    triggerLiveToast("Đã xóa thông báo.");
  };

  return (
    <AppShell activeId="s12" modeOverride={modeOverride}>
      {modeOverride === "author" ? (
        <div className="stack" style={{ gap: 24 }}>
          {/* Author Hero banner */}
          <div className="author-hero-banner" style={{ padding: "40px 32px", borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <span className="user-avatar" style={{ background: "var(--crimson)", color: "#fff", width: 64, height: 64, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: 24 }}>
                {user?.profile?.avatar_url ? (
                  <img src={user.profile.avatar_url} alt="avatar" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  avatarText
                )}
              </span>
              <div>
                <h2 style={{ fontSize: 24, fontWeight: "bold", margin: 0, color: "#fff" }}>{name}</h2>
                <p style={{ margin: "6px 0 0 0", opacity: 0.8, fontSize: 13, color: "#fff" }}>{bio}</p>
              </div>
            </div>
            <Link className="button" href="/author/settings" style={{ background: "rgba(255,255,255,0.15)", border: 0, color: "#fff" }}>Chỉnh sửa hồ sơ</Link>
          </div>

          <div className="tabs" style={{ borderBottom: "1px solid var(--line)", marginBottom: 0 }}>
            <button className={`tab-button ${activeProfileTab === "stats" ? "active" : ""}`} onClick={() => setActiveProfileTab("stats")} style={{ cursor: "pointer" }}>
              Chỉ số sáng tác
            </button>
            <button className={`tab-button ${activeProfileTab === "announcements" ? "active" : ""}`} onClick={() => setActiveProfileTab("announcements")} style={{ cursor: "pointer" }}>
              Bản tin & Thông báo tác giả
            </button>
          </div>

          {activeProfileTab === "stats" && (
            <div className="stack" style={{ gap: 24 }}>
              <div className="metric-grid">
                <MetricCard label="Tác phẩm xuất bản" value="Chưa có" />
                <MetricCard label="Lượt xem tích lũy" value="Chưa có" />
                <MetricCard label="Điểm uy tín sáng tác" value={score != null ? `${score}/100` : "Đang tải"} />
                <MetricCard label="Người theo dõi" value="Chưa có" />
              </div>
            </div>
          )}

          {activeProfileTab === "announcements" && (
            <div className="grid grid-2" style={{ gap: 24, alignItems: "start" }}>
              {/* Creator Announcements Composer */}
              <section className="panel panel-pad stack">
                <h3 className="section-title" style={{ fontSize: 15, margin: "0 0 12px 0" }}>Soạn thông báo mới</h3>
                <form onSubmit={handlePostAnnouncement} className="stack" style={{ gap: 12 }}>
                  <div className="field">
                    <label style={{ fontSize: 12, fontWeight: "bold" }}>Nội dung bản tin</label>
                    <textarea
                      className="textarea"
                      value={announcementText}
                      onChange={(e) => setAnnouncementText(e.target.value)}
                      placeholder="Dòng đầu tiên sẽ là Tiêu đề thông báo.&#10;Các dòng tiếp theo nhập nội dung chi tiết..."
                      style={{ height: 120 }}
                      required
                    />
                  </div>
                  <button className="button button-primary" type="submit">Đăng thông báo</button>
                </form>
              </section>

              {/* Feed of Announcements */}
              <section className="panel panel-pad stack">
                <h3 className="section-title" style={{ fontSize: 15, margin: "0 0 12px 0" }}>Bản tin đã đăng</h3>
                {announcements.length === 0 ? (
                  <p style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", margin: 0 }}>Chưa đăng thông báo nào.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {announcements.map((ann) => (
                      <div key={ann.id} style={{ borderBottom: "1px solid var(--line)", paddingBottom: 12, position: "relative" }}>
                        <h4 style={{ fontSize: 14, fontWeight: "bold", margin: "0 0 4px 0", color: "var(--jungle-dark)" }}>{ann.title}</h4>
                        <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 8 }}>Đăng ngày: {ann.date}</div>
                        <p style={{ fontSize: 13, margin: 0, color: "var(--muted)", whiteSpace: "pre-line", lineHeight: 1.5 }}>{ann.content}</p>
                        <button
                          className="button icon-button"
                          onClick={() => handleDeleteAnnouncement(ann.id)}
                          style={{ position: "absolute", top: 0, right: 0, color: "var(--crimson)", padding: 4, background: "transparent", border: 0, cursor: "pointer" }}
                          title="Xóa thông báo"
                        >
                          <Icon name="close" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      ) : (
        <section className="panel panel-pad stack">
          <div className="page-header" style={{ marginBottom: 0 }}>
            <div className="inline-actions">
              <span className="user-avatar" style={{ background: "var(--crimson)", color: "#fff", width: 48, height: 48, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
                {user?.profile?.avatar_url ? (
                  <img src={user.profile.avatar_url} alt="avatar" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  avatarText
                )}
              </span>
              <div>
                <h2 className="page-title" style={{ fontSize: 24, fontWeight: 700 }}>{name}</h2>
                <p className="section-subtitle" style={{ margin: "4px 0 0" }}>{bio}</p>
              </div>
            </div>
            <Link className="button button-primary" href="/settings">Chỉnh sửa hồ sơ</Link>
          </div>
          <div className="metric-grid" style={{ marginTop: 24 }}>
            <MetricCard label="Uy tín tác giả" value={score != null ? `${score}%` : "Đang tải"} />
            <MetricCard label="Vai trò" value={user?.role === "admin" ? "Admin" : user?.role === "author" ? "Tác giả" : "Độc giả"} />
          </div>
        </section>
      )}
    </AppShell>
  );
}

export function SettingsScreen({ modeOverride }: { modeOverride?: "reader" | "author" | "admin" }) {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

  // Profile Form States
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Security Form States
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securitySubmitting, setSecuritySubmitting] = useState(false);

  // Notification Preferences States
  const [notifyChapter, setNotifyChapter] = useState(true);
  const [notifyComment, setNotifyComment] = useState(true);
  const [notifySystem, setNotifySystem] = useState(true);

  // Author Creator Preferences States
  const [defaultVisibility, setDefaultVisibility] = useState("private");
  const [autoPublish, setAutoPublish] = useState(false);
  const [defaultCategory, setDefaultCategory] = useState("Ngôn tình");

  // Author Reminders States
  const [reminderTime, setReminderTime] = useState("1");
  const [emailAlert, setEmailAlert] = useState(true);
  const [soundAlert, setSoundAlert] = useState(true);

  useEffect(() => {
    if (user?.profile) {
      setDisplayName(user.profile.display_name || "");
      setBio(user.profile.bio || "");
    }
  }, [user]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setNotifyChapter(localStorage.getItem("yag.settings.notifyChapter") !== "false");
      setNotifyComment(localStorage.getItem("yag.settings.notifyComment") !== "false");
      setNotifySystem(localStorage.getItem("yag.settings.notifySystem") !== "false");

      setDefaultVisibility(localStorage.getItem("yag.settings.writing.visibility") || "private");
      setAutoPublish(localStorage.getItem("yag.settings.writing.autoPublish") === "true");
      setDefaultCategory(localStorage.getItem("yag.settings.writing.category") || "Ngôn tình");
      setReminderTime(localStorage.getItem("yag.settings.reminders.time") || "1");
      setEmailAlert(localStorage.getItem("yag.settings.reminders.emailAlert") !== "false");
      setSoundAlert(localStorage.getItem("yag.settings.reminders.soundAlert") !== "false");
    }
  }, []);

  // Membership & Billing States
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [isPremium, setIsPremium] = useState(false);
  const [membershipExpiry, setMembershipExpiry] = useState<string | null>(null);

  useEffect(() => {
    if (user?.premium_until) {
      setIsPremium(new Date(user.premium_until) > new Date());
      setMembershipExpiry(user.premium_until);
    } else if (appEnv.useMocks && typeof window !== "undefined") {
      const cached = localStorage.getItem("yag.mockMembership");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.is_active && parsed.premium_until) {
            const isActive = new Date(parsed.premium_until) > new Date();
            setIsPremium(isActive);
            if (isActive) {
              setMembershipExpiry(parsed.premium_until);
            } else {
              setMembershipExpiry(null);
            }
          } else {
            setIsPremium(false);
            setMembershipExpiry(null);
          }
        } catch {
          setIsPremium(false);
          setMembershipExpiry(null);
        }
      } else {
        setIsPremium(false);
        setMembershipExpiry(null);
      }
    } else {
      setIsPremium(false);
      setMembershipExpiry(null);
    }
  }, [user]);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("vi-VN", { year: "numeric", month: "long", day: "numeric" });
    } catch {
      return dateStr;
    }
  };

  useEffect(() => {
    if (activeTab === "membership") {
      setLoadingHistory(true);
      if (appEnv.useMocks) {
        const cached = localStorage.getItem("yag.mockHistory");
        if (cached) {
          try {
            setTransactions(JSON.parse(cached));
          } catch {
            setTransactions([]);
          }
        } else {
          setTransactions([
            { id: "tx_1", plan_name: "Gói Tháng Premium", amount: 39000, status: "success", created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(), vnp_transaction_no: "VNP12345678" },
            { id: "tx_2", plan_name: "Gói Tháng Premium", amount: 39000, status: "failed", created_at: new Date(Date.now() - 35 * 24 * 3600 * 1000).toISOString(), vnp_transaction_no: "VNP87654321" },
          ]);
        }
        setLoadingHistory(false);
      } else {
        yagApi.billing.getTransactionHistory()
          .then((res) => {
            setTransactions(res.data || []);
          })
          .catch((err) => {
            console.error("Failed to load transaction history", err);
          })
          .finally(() => {
            setLoadingHistory(false);
          });
      }
    }
  }, [activeTab]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (appEnv.useMocks) {
        triggerLiveToast("Đã lưu hồ sơ cá nhân (Mock).");
        setSubmitting(false);
        return;
      }
      await yagApi.apiFetch("/api/v1/auth/profiles/me", {
        method: "PUT",
        body: { display_name: displayName, bio },
      });
      await refreshUser();
      triggerLiveToast("Đã lưu hồ sơ cá nhân thành công.");
    } catch (err) {
      console.error(err);
      triggerLiveToast("Không thể lưu hồ sơ.", "warning");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      triggerLiveToast("Xác nhận mật khẩu mới không khớp.", "warning");
      return;
    }
    setSecuritySubmitting(true);
    try {
      if (appEnv.useMocks) {
        triggerLiveToast("Đổi mật khẩu thành công (Mock).");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setSecuritySubmitting(false);
        return;
      }
      await yagApi.apiFetch("/api/v1/auth/password/change", {
        method: "POST",
        body: { old_password: oldPassword, new_password: newPassword }
      });
      triggerLiveToast("Đổi mật khẩu thành công.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error(err);
      triggerLiveToast(err.message || "Không thể đổi mật khẩu.", "warning");
    } finally {
      setSecuritySubmitting(false);
    }
  };


  const handleSaveNotifications = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("yag.settings.notifyChapter", String(notifyChapter));
    localStorage.setItem("yag.settings.notifyComment", String(notifyComment));
    localStorage.setItem("yag.settings.notifySystem", String(notifySystem));
    triggerLiveToast("Cài đặt thông báo đã được lưu.");
  };

  const handleSaveWritingPrefs = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("yag.settings.writing.visibility", defaultVisibility);
    localStorage.setItem("yag.settings.writing.autoPublish", String(autoPublish));
    localStorage.setItem("yag.settings.writing.category", defaultCategory);
    triggerLiveToast("Thiết lập sáng tác đã được lưu.");
  };

  const handleSaveRemindersPrefs = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("yag.settings.reminders.time", reminderTime);
    localStorage.setItem("yag.settings.reminders.emailAlert", String(emailAlert));
    localStorage.setItem("yag.settings.reminders.soundAlert", String(soundAlert));
    triggerLiveToast("Thiết lập nhắc nhở đã được lưu.");
  };

  const authorSettingSections = [
    { id: "profile", label: "Hồ sơ tác giả", icon: "user" as IconName },
    { id: "security", label: "Mật khẩu & bảo mật", icon: "lock" as IconName },
    { id: "writing", label: "Thiết lập sáng tác", icon: "edit" as IconName },
    { id: "reminders", label: "Nhắc nhở lịch đăng", icon: "bell" as IconName },
  ];

  const activeSections = modeOverride === "author" ? authorSettingSections : settingSections;

  return (
    <AppShell activeId="s13" modeOverride={modeOverride}>
      <section className="layout-filter">
        <aside className="panel panel-pad settings-nav-panel">
          <div className="sidebar-section">
            <div className="sidebar-label">Cài đặt</div>
            {activeSections.map((item) => (
              <button
                className={`sidebar-link ${activeTab === item.id ? "active" : ""}`}
                type="button"
                onClick={() => setActiveTab(item.id)}
                key={item.id}
                style={{ background: "transparent", border: 0, width: "100%", textAlign: "left", cursor: "pointer" }}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </aside>

        <main className="stack">
          {activeTab === "profile" && (
            <section className="panel panel-pad stack" id="setting-profile">
              <div>
                <h2 className="section-title">{modeOverride === "author" ? "Hồ sơ tác giả" : "Hồ sơ cá nhân"}</h2>
                <p className="section-subtitle">Các thông tin hiển thị công khai và dùng cho liên hệ tài khoản.</p>
              </div>
              <form onSubmit={handleSaveProfile} className="stack" style={{ gap: 16 }}>
                <div className="grid grid-2">
                  <div className="field">
                    <label>Tên hiển thị / Bút danh</label>
                    <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
                  </div>
                  <div className="field">
                    <label>Email tài khoản</label>
                    <input className="input" type="email" value={user?.email || ""} disabled style={{ cursor: "not-allowed" }} />
                  </div>
                </div>
                <div className="field">
                  <label>Giới thiệu bản thân (Bio)</label>
                  <textarea className="textarea" value={bio} onChange={(e) => setBio(e.target.value)} />
                </div>
                <button className="button button-primary" type="submit" disabled={submitting}>
                  Lưu hồ sơ
                </button>
              </form>
            </section>
          )}

          {activeTab === "security" && (
            <section className="panel panel-pad stack" id="setting-security">
              <div>
                <h2 className="section-title">Mật khẩu & bảo mật</h2>
                <p className="section-subtitle">Cập nhật mật khẩu mới để bảo vệ an toàn cho tài khoản của bạn.</p>
              </div>
              <form onSubmit={handleUpdatePassword} className="stack" style={{ gap: 16 }}>
                <div className="field">
                  <label>Mật khẩu hiện tại</label>
                  <input className="input" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required placeholder="••••••••" />
                </div>
                <div className="grid grid-2">
                  <div className="field">
                    <label>Mật khẩu mới</label>
                    <input className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required placeholder="Tối thiểu 8 ký tự" />
                  </div>
                  <div className="field">
                    <label>Xác nhận mật khẩu mới</label>
                    <input className="input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="Nhập lại mật khẩu mới" />
                  </div>
                </div>
                <button className="button button-primary" type="submit" disabled={securitySubmitting}>
                  Cập nhật mật khẩu
                </button>
              </form>
            </section>
          )}

          {activeTab === "writing" && modeOverride === "author" && (
            <section className="panel panel-pad stack" id="setting-writing">
              <div>
                <h2 className="section-title">Thiết lập sáng tác</h2>
                <p className="section-subtitle">Tự động cấu hình môi trường viết và chế độ đăng chương truyện.</p>
              </div>
              <form onSubmit={handleSaveWritingPrefs} className="stack" style={{ gap: 16 }}>
                <div className="grid grid-2" style={{ gap: 16 }}>
                  <div className="field">
                    <label>Quyền riêng tư mặc định của bản nháp mới</label>
                    <select className="select" value={defaultVisibility} onChange={(e) => setDefaultVisibility(e.target.value)}>
                      <option value="private">Riêng tư (Chỉ mình tôi)</option>
                      <option value="public">Công khai (Nháp hiển thị với Reader theo dõi)</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Thể loại mặc định</label>
                    <select className="select" value={defaultCategory} onChange={(e) => setDefaultCategory(e.target.value)}>
                      {STORY_CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="settings-toggle-row">
                  <label htmlFor="auto-publish-pref" style={{ fontWeight: "bold" }}>Tự động phát hành sau khi AI duyệt xong</label>
                  <input
                    id="auto-publish-pref"
                    type="checkbox"
                    checked={autoPublish}
                    onChange={(e) => setAutoPublish(e.target.checked)}
                    style={{ width: 20, height: 20, cursor: "pointer" }}
                  />
                </div>
                <small style={{ color: "var(--muted)", display: "block", marginTop: -6 }}>Nếu kích hoạt, chương được duyệt sẽ tự động công khai ngay lập tức mà không cần hẹn giờ đăng thủ công.</small>

                <button className="button button-primary" type="submit" style={{ marginTop: 12 }}>
                  Lưu thiết lập sáng tác
                </button>
              </form>
            </section>
          )}

          {activeTab === "reminders" && modeOverride === "author" && (
            <section className="panel panel-pad stack" id="setting-reminders">
              <div>
                <h2 className="section-title">Nhắc nhở lịch đăng</h2>
                <p className="section-subtitle">Hệ thống thông báo nhắc nhở chuẩn bị chương trước giờ hẹn giờ.</p>
              </div>
              <form onSubmit={handleSaveRemindersPrefs} className="stack" style={{ gap: 16 }}>
                <div className="field">
                  <label>Gửi nhắc nhở trước giờ đăng</label>
                  <select className="select" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)}>
                    <option value="1">Trước 1 tiếng</option>
                    <option value="6">Trước 6 tiếng</option>
                    <option value="24">Trước 24 tiếng (Khuyên dùng)</option>
                  </select>
                </div>

                <div className="stack" style={{ gap: 12 }}>
                  <div className="settings-toggle-row">
                    <label htmlFor="email-alert-pref">Gửi cảnh báo qua Email tài khoản</label>
                    <input
                      id="email-alert-pref"
                      type="checkbox"
                      checked={emailAlert}
                      onChange={(e) => setEmailAlert(e.target.checked)}
                      style={{ width: 20, height: 20, cursor: "pointer" }}
                    />
                  </div>
                  <div className="settings-toggle-row">
                    <label htmlFor="sound-alert-pref">Bật âm thanh cảnh báo khi có kết quả duyệt AI tại Studio</label>
                    <input
                      id="sound-alert-pref"
                      type="checkbox"
                      checked={soundAlert}
                      onChange={(e) => setSoundAlert(e.target.checked)}
                      style={{ width: 20, height: 20, cursor: "pointer" }}
                    />
                  </div>
                </div>

                <button className="button button-primary" type="submit" style={{ marginTop: 12 }}>
                  Lưu thiết lập nhắc nhở
                </button>
              </form>
            </section>
          )}
          {activeTab === "notifications" && modeOverride !== "author" && (
            <section className="panel panel-pad stack" id="setting-notifications">
              <div>
                <h2 className="section-title">Nhận thông báo</h2>
                <p className="section-subtitle">Chọn loại tin tức và cập nhật bạn muốn nhận từ YAG.</p>
              </div>
              <form onSubmit={handleSaveNotifications} className="stack" style={{ gap: 16 }}>
                <div className="stack" style={{ gap: 12 }}>
                  <div className="settings-toggle-row">
                    <label htmlFor="notify-chapter">Thông báo khi tác phẩm theo dõi ra chương mới</label>
                    <input
                      id="notify-chapter"
                      type="checkbox"
                      checked={notifyChapter}
                      onChange={(e) => setNotifyChapter(e.target.checked)}
                      style={{ width: 20, height: 20, cursor: "pointer" }}
                    />
                  </div>
                  <div className="settings-toggle-row">
                    <label htmlFor="notify-comment">Thông báo khi có phản hồi bình luận của bạn</label>
                    <input
                      id="notify-comment"
                      type="checkbox"
                      checked={notifyComment}
                      onChange={(e) => setNotifyComment(e.target.checked)}
                      style={{ width: 20, height: 20, cursor: "pointer" }}
                    />
                  </div>
                  <div className="settings-toggle-row">
                    <label htmlFor="notify-system">Thông báo hệ thống và giao dịch thanh toán</label>
                    <input
                      id="notify-system"
                      type="checkbox"
                      checked={notifySystem}
                      onChange={(e) => setNotifySystem(e.target.checked)}
                      style={{ width: 20, height: 20, cursor: "pointer" }}
                    />
                  </div>
                </div>
                <button className="button button-primary" type="submit">
                  Lưu thiết lập thông báo
                </button>
              </form>
            </section>
          )}

          {activeTab === "membership" && modeOverride !== "author" && (
            <section className="panel panel-pad stack" id="setting-membership">
              <div>
                <h2 className="section-title">Membership</h2>
                <p className="section-subtitle">Quản lý gói hội viên và xem lịch sử giao dịch của bạn.</p>
              </div>

              <div className="notice success" style={{ marginBottom: 24 }}>
                <Icon name="check" />
                {isPremium ? (
                  <>Gói hiện tại: <strong>Premium</strong> (Hạn sử dụng đến ngày {membershipExpiry ? formatDate(membershipExpiry) : ""}) · Bạn đang sở hữu đặc quyền mở khóa toàn bộ chương truyện đặc sắc.</>
                ) : (
                  <>Gói hiện tại: <strong>Miễn phí</strong> · Đăng ký gói Premium để xem các chương Premium của tác giả.</>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottom: "1px solid var(--line)" }}>
                <div>
                  <strong>{isPremium ? "Nâng cấp / Gia hạn gói" : "Đăng ký Premium"}</strong>
                  <div className="list-meta">Mở khóa tất cả quyền lợi cao cấp nhất của YAG.</div>
                </div>
                <Link className="button button-primary" href="/membership">
                  {isPremium ? "Gia hạn hội viên" : "Đăng ký ngay"}
                </Link>
              </div>

              <div style={{ marginTop: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: "bold", marginBottom: 12 }}>Lịch sử giao dịch</h3>
                {loadingHistory ? (
                  <div style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>
                    Đang tải lịch sử giao dịch...
                  </div>
                ) : transactions.length === 0 ? (
                  <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", border: "1px dashed var(--line)", borderRadius: 8 }}>
                    Bạn chưa thực hiện giao dịch thanh toán nào.
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid var(--line)", textAlign: "left" }}>
                          <th style={{ padding: "8px 12px", color: "var(--muted)" }}>Gói dịch vụ</th>
                          <th style={{ padding: "8px 12px", color: "var(--muted)" }}>Số tiền</th>
                          <th style={{ padding: "8px 12px", color: "var(--muted)" }}>Mã giao dịch</th>
                          <th style={{ padding: "8px 12px", color: "var(--muted)" }}>Thời gian</th>
                          <th style={{ padding: "8px 12px", color: "var(--muted)" }}>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((tx) => (
                          <tr key={tx.id} style={{ borderBottom: "1px solid var(--line)" }}>
                            <td style={{ padding: "12px" }}><strong>{tx.plan_name || "Gói Premium"}</strong></td>
                            <td style={{ padding: "12px" }}>{formatPrice(tx.amount)}</td>
                            <td style={{ padding: "12px" }}><code style={{ fontSize: 12 }}>{tx.vnp_transaction_no || tx.id.slice(0, 8)}</code></td>
                            <td style={{ padding: "12px" }}>{formatDate(tx.created_at)}</td>
                            <td style={{ padding: "12px" }}>
                              <span className={`badge ${tx.status === "success" ? "badge-green" : tx.status === "pending" ? "badge-blue" : "badge-red"}`}>
                                {tx.status === "success" ? "Thành công" : tx.status === "pending" ? "Đang chờ" : "Thất bại"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}
        </main>
      </section>
    </AppShell>
  );
}

export function NotificationsScreen({ modeOverride }: { modeOverride?: "reader" | "author" | "admin" }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      if (appEnv.useMocks) {
        if (modeOverride === "author") {
          setNotifications([
            { id: "a1", title: "Kiểm duyệt AI hoàn tất", message: "Một chương minh họa đã được duyệt thành công.", read_at: null },
            { id: "a2", title: "Cảnh báo lịch đăng chương", message: "Một tác phẩm minh họa sắp đến hạn đăng chương mới trong 24 giờ tới.", read_at: null },
            { id: "a3", title: "Đánh giá tác phẩm mới", message: "Một độc giả minh họa vừa gửi đánh giá cho tác phẩm của bạn.", read_at: "2026-06-04" },
          ]);
        } else {
          setNotifications([
            { id: "1", title: "Cập nhật chương mới", message: "Một tác phẩm minh họa vừa cập nhật chương mới.", read_at: null }
          ]);
        }
      } else {
        const res = await yagApi.notifications.list();
        setNotifications(res.data.notifications || []);
      }
    } catch (err) {
      console.error("Failed to load notifications", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadNotifications();

    const handleNewNotification = (e: Event) => {
      const customEvent = e as CustomEvent;
      const message = customEvent.detail;
      if (message) {
        setNotifications((prev) => [
          {
            id: message.id || String(Date.now()),
            title: message.title || "Thông báo mới",
            message: message.message || "",
            read_at: null,
            created_at: message.created_at || new Date().toISOString(),
          },
          ...prev,
        ]);
      }
    };
    window.addEventListener("yag.notifications.new", handleNewNotification);
    return () => {
      window.removeEventListener("yag.notifications.new", handleNewNotification);
    };
  }, []);

  const handleMarkAllRead = async () => {
    if (appEnv.useMocks) {
      setNotifications(notifications.map(n => ({ ...n, read_at: "now" })));
      return;
    }
    try {
      await yagApi.notifications.markAllAsRead();
      void loadNotifications();
      triggerLiveToast("Đã đánh dấu đọc tất cả thông báo.");
      window.dispatchEvent(new CustomEvent("yag.notifications.refresh"));
    } catch (err) {
      console.error(err);
    }
  };

  const handleRead = async (id: string) => {
    if (appEnv.useMocks) return;
    try {
      await yagApi.notifications.markAsRead(id);
      void loadNotifications();
      window.dispatchEvent(new CustomEvent("yag.notifications.refresh"));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AppShell activeId="s14" modeOverride={modeOverride}>
      <section className="panel panel-pad stack">
        <div className="inline-actions" style={{ justifyContent: "space-between" }}>
          <div className="tabs">
            <button className="tab-button active">Tất cả thông báo</button>
          </div>
          <button className="button" onClick={handleMarkAllRead}>Đánh dấu đã đọc tất cả</button>
        </div>
        {isLoading ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>
            Đang tải thông báo...
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>
            Bạn không có thông báo nào.
          </div>
        ) : (
          <div className="list">
            {notifications.map((item) => (
              <div
                className="list-item"
                key={item.id}
                style={{ opacity: item.read_at ? 0.6 : 1, cursor: "pointer" }}
                onClick={() => handleRead(item.id)}
              >
                <div>
                  <h3 className="list-title">{item.title}</h3>
                  <div className="list-meta">{item.message}</div>
                </div>
                <span className={`badge ${!item.read_at ? "badge-crimson" : "badge-blue"}`}>
                  {!item.read_at ? "Mới" : "Đã đọc"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
