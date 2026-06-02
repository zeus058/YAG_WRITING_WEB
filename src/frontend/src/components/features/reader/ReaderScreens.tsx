"use client";

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { stories, type IconName } from "@/data/yag";
import { Icon, Cover, ErrorGuide, MetricCard, QuickStories, RankingItem, ReadingCard, UpdateStoryRow, getStoryAuthorName } from "@/components/ui";
import { AppShell } from "@/components/layout";
import { yagApi, appEnv, useAuth } from "@/lib";

const settingSections: { id: string; label: string; icon: IconName }[] = [
  { id: "profile", label: "Hồ sơ cá nhân", icon: "user" },
  { id: "security", label: "Mật khẩu & bảo mật", icon: "lock" },
  { id: "reader", label: "Tùy chọn đọc", icon: "book" },
  { id: "notifications", label: "Thông báo", icon: "bell" },
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

export function HomeFeedScreen() {
  const [storiesList, setStoriesList] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (appEnv.useMocks) {
      setStoriesList(stories);
      setRecommendations(stories.slice(0, 4));
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
        setStoriesList(fullStories);

        const rawRecs = recsRes.data.recommendations || [];
        const mappedRecs = rawRecs.map((rec: any) => {
          return fullStories.find((s: any) => s.id === rec.story_id);
        }).filter(Boolean);

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

  const heroStory = storiesList[0] || {
    title: "Mưa Trên Thành Cũ",
    description: "Một bí mật bị giấu trong những bức thư cũ kéo hai con người trở lại thành phố sau chiến tranh.",
    chapters: 72,
    rating_avg: 4.9,
    view_count: 1200000,
  };

  const heroHref = heroStory.id ? `/stories/${heroStory.id}` : "/story-detail";
  const heroChapters = heroStory.chapter_count ?? heroStory.chapters ?? 0;
  const heroRating = heroStory.rating_avg !== undefined ? heroStory.rating_avg.toFixed(1) : "4.9";
  const heroViews = heroStory.view_count !== undefined ? (heroStory.view_count >= 1000000 ? `${(heroStory.view_count / 1000000).toFixed(1)}M` : heroStory.view_count) : "1.2M";

  return (
    <AppShell activeId="s04">
      <section className="home-hero">
        <a className="home-featured" href={heroHref}>
          <div className="home-featured-copy">
            <span className="badge badge-crimson">Đang được đọc nhiều</span>
            <h2>{heroStory.title}</h2>
            <p>{heroStory.description}</p>
            <div className="home-featured-stats">
              <span>{heroChapters} chương</span>
              <span>{heroRating} ★</span>
              <span>{heroViews} lượt đọc</span>
            </div>
            <span className="button button-primary" style={{ width: "fit-content" }}>Đọc tiếp</span>
          </div>
          <div className="home-featured-cover"><Cover index={0} coverUrl={heroStory.cover_url} /></div>
        </a>
        <aside className="panel panel-pad stack home-continue">
          <div className="home-section-head"><h2 className="section-title">Đọc tiếp</h2><a href="/library">Thư viện</a></div>
          {(storiesList.length > 3 ? storiesList.slice(1, 4) : storiesList).map((story, index) => (
            <ReadingCard story={story} index={index} key={story.id || story.title} />
          ))}
        </aside>
      </section>
      <section className="action-strip" style={{ margin: "24px 0" }}>
        <div><strong>Gu đọc hôm nay</strong><div className="list-meta">YAG ưu tiên truyện lịch sử, trinh thám nhẹ và tác giả đăng đều trong tuần này.</div></div>
        <button className="button" type="button" data-toast="Đã làm mới gợi ý. Nếu truyện chưa đúng gu, hãy đọc hoặc ẩn vài truyện để YAG học lại sở thích.">Làm mới gợi ý</button>
      </section>
      <section className="home-layout">
        <main className="stack">
          <section className="panel panel-pad stack">
            <div className="home-section-head"><h2 className="section-title">Dành cho bạn</h2><a href="/discover">Xem thêm</a></div>
            <QuickStories count={12} storiesList={recommendations} />
          </section>
          <section className="panel panel-pad stack">
            <div className="home-section-head"><h2 className="section-title">Mới cập nhật</h2><a href="/discover">Tất cả truyện mới</a></div>
            <div className="update-list">
              {storiesList.slice(0, 6).map((story, index) => (
                <UpdateStoryRow story={story} index={index} key={story.id || story.title} />
              ))}
            </div>
          </section>
        </main>
        <aside className="stack">
          <section className="panel panel-pad stack">
            <div className="home-section-head"><h2 className="section-title">BXH hôm nay</h2><a href="/discover">Chi tiết</a></div>
            <div className="ranking-list">
              {storiesList.slice(0, 6).map((story, index) => (
                <RankingItem story={story} index={index} key={story.id || story.title} />
              ))}
            </div>
          </section>
          <section className="panel panel-pad stack">
            <h2 className="section-title">Thể loại nổi bật</h2>
            <div className="genre-strip">
              {["Ngôn tình", "Trinh thám", "Khoa học viễn tưởng", "Huyền huyễn", "Chữa lành", "Cổ trang", "Phiêu lưu", "Kỳ ảo"].map((item, index) => (
                <a className={`pill ${index === 0 ? "active" : ""}`} href="/discover" key={item}>{item}</a>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </AppShell>
  );
}

export function DiscoverScreen() {
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"basic" | "ai">("basic");
  const [storiesList, setStoriesList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [isFallback, setIsFallback] = useState(false);

  const handleSearch = async () => {
    setIsLoading(true);
    setSearched(true);
    if (appEnv.useMocks) {
      setStoriesList(stories.slice(0, 6));
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
          setStoriesList(stories);
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

  return (
    <AppShell activeId="s05">
      <section className="panel panel-pad stack">
        <div className="grid grid-2">
          <div className="field">
            <label>Từ khóa / Ý tưởng cốt truyện</label>
            <input
              className="input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ví dụ: truyện tình yêu thời chiến tranh có kết thúc buồn"
            />
          </div>
          <div className="field">
            <label>Kiểu tìm kiếm</label>
            <div className="tabs">
              <button
                className={`tab-button ${searchMode === "basic" ? "active" : ""}`}
                onClick={() => setSearchMode("basic")}
              >
                Từ khóa
              </button>
              <button
                className={`tab-button ${searchMode === "ai" ? "active" : ""}`}
                onClick={() => setSearchMode("ai")}
              >
                AI ngữ nghĩa (pgvector)
              </button>
            </div>
          </div>
        </div>
        <div className="action-strip">
          <div>
            <strong>Tìm kiếm thông minh</strong>
            <div className="list-meta">Kết hợp từ khóa, thể loại, trạng thái và lịch sử đọc gần đây.</div>
          </div>
          <button className="button button-primary" type="button" onClick={handleSearch} disabled={isLoading}>
            <Icon name="search" />
            {isLoading ? "Đang tìm..." : "Tìm truyện"}
          </button>
        </div>
      </section>
      <section className="layout-filter" style={{ marginTop: 24 }}>
        <aside className="panel panel-pad stack">
          <h2 className="section-title">Bộ lọc</h2>
          {["Thể loại", "Trạng thái", "Số chương", "Sắp xếp"].map((label) => (
            <div className="field" key={label}>
              <label>{label}</label>
              <select className="select">
                <option>Tất cả</option>
                <option>Phù hợp nhất</option>
                <option>Mới cập nhật</option>
              </select>
            </div>
          ))}
          <button className="button" type="button">Áp dụng bộ lọc</button>
        </aside>
        <main className="stack">
          <div className="panel panel-pad">
            <div className="home-section-head">
              <h2 className="section-title">{storiesList.length} truyện phù hợp</h2>
              {searchMode === "ai" && (
                <span className="badge badge-blue">
                  {isFallback ? "AI Fallback" : "AI Ngữ Nghĩa"}
                </span>
              )}
            </div>
          </div>
          {storiesList.length === 0 && searched && (
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
            <QuickStories storiesList={storiesList} />
          )}
        </main>
      </section>
    </AppShell>
  );
}

export function StoryDetailScreen() {
  const params = useParams();
  const rawId = params?.id;
  const storyId = typeof rawId === "string" ? rawId : "d6a2f7c0-2f9b-449e-ba23-9502e6c7d5bd";

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
      setStory({
        id: "d6a2f7c0-2f9b-449e-ba23-9502e6c7d5bd",
        title: "Mưa Trên Thành Cũ",
        description: "Giữa thành phố cũ sau chiến tranh, một người viết thư thuê và một nữ phóng viên cùng lần theo bí mật của những bức thư không người nhận.",
        category: "Ngôn tình lịch sử",
        status: "ongoing",
        view_count: 1200000,
        rating_avg: 4.9,
        rating_count: 128,
        author: { username: "Linh An", profile: { display_name: "Linh An" } }
      });
      setChapters([
        { id: "c1", chapter_number: 1, title: "Khởi đầu dưới mưa", is_premium: false },
        { id: "c2", chapter_number: 2, title: "Lời hẹn cũ", is_premium: false },
        { id: "c3", chapter_number: 3, title: "Bức thư bị giấu", is_premium: false },
      ]);
      setReviews([
        { id: "r1", rating: 5, content: "Truyện viết rất hay, văn phong mượt mà.", user: { username: "Minh Nguyệt" } }
      ]);
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
        setReviews([{ rating: newReviewRating, content: newReviewContent, user: { username: "Bạn" } }, ...reviews]);
        setNewReviewContent("");
        setSubmittingReview(false);
        return;
      }
      await yagApi.apiFetch(`/api/v1/stories/${storyId}/reviews`, {
        method: "POST",
        body: { rating: newReviewRating, content: newReviewContent }
      });
      const reviewsRes = await yagApi.reader.getReviews(storyId);
      setReviews(reviewsRes.data.reviews || []);
      setNewReviewContent("");
      triggerLiveToast("Đánh giá thành công!");
    } catch (err) {
      console.error("Review submit failed", err);
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
  const views = story.view_count >= 1000 ? `${(story.view_count / 1000).toFixed(0)}K` : String(story.view_count);
  const rating = Number(story.rating_avg);
  const ratingText = Number.isFinite(rating) ? rating.toFixed(1) : "5.0";

  return (
    <AppShell activeId="s06">
      <section className="layout-2">
        <aside className="panel panel-pad stack">
          <Cover index={1} coverUrl={story.cover_url} />
          <span className="badge badge-crimson">Đang hot</span>
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
  const [paywall, setPaywall] = useState(false);
  const [paywallMsg, setPaywallMsg] = useState("");

  const [fontSize, setFontSize] = useState(18);
  const [isDark, setIsDark] = useState(false);
  const [isWide, setIsWide] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setFontSize(Number(localStorage.getItem("yag.reader.fontSize") || 18));
      setIsDark(localStorage.getItem("yag.reader.isDark") === "true");
      setIsWide(localStorage.getItem("yag.reader.isWide") === "true");
    }
  }, []);

  const saveFontSize = (val: number) => {
    setFontSize(val);
    localStorage.setItem("yag.reader.fontSize", String(val));
  };

  const toggleTheme = () => {
    const val = !isDark;
    setIsDark(val);
    localStorage.setItem("yag.reader.isDark", String(val));
  };

  const toggleWidth = () => {
    const val = !isWide;
    setIsWide(val);
    localStorage.setItem("yag.reader.isWide", String(val));
  };

  useEffect(() => {
    if (!storyId) return;

    if (appEnv.useMocks) {
      setStory({ title: "Mưa Trên Thành Cũ" });
      setChapter({
        title: "Lời hẹn dưới mái ga",
        chapter_number: 12,
        content: "Mưa rơi trên mái tôn thành những nhịp gõ đều...\n\nKhông ai đến đúng hẹn...",
        is_premium: false,
      });
      setChapters([
        { chapter_number: 11, title: "Bản nhạc cũ" },
        { chapter_number: 12, title: "Lời hẹn dưới mái ga" },
        { chapter_number: 13, title: "Tiếng còi cuối mùa" },
      ]);
      setComments([
        { id: "cm1", user: { username: "Minh Nguyệt" }, content: "Cảm xúc chương này rất tốt." }
      ]);
      setIsLoading(false);
      return;
    }

    const loadChapterData = async () => {
      setIsLoading(true);
      setPaywall(false);
      try {
        const storyRes = await yagApi.reader.getStoryDetail(storyId);
        setStory(storyRes.data);
        
        // Load all public chapters
        const chapsRes = await yagApi.reader.getChapters(storyId);
        const publicChapters = chapsRes.data || [];
        setChapters(publicChapters);

        const targetChap = publicChapters.find((c: any) => c.chapter_number === chapterNum);
        if (!targetChap) {
          setIsLoading(false);
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
          }
        }
      } catch (err) {
        console.error("Failed to load reader screen details:", err);
      } finally {
        setIsLoading(false);
      }
    };
    void loadChapterData();
  }, [storyId, chapterNum]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !chapter) return;
    try {
      if (appEnv.useMocks) {
        setComments([...comments, { id: String(Math.random()), user: { username: "Bạn" }, content: newComment }]);
        setNewComment("");
        return;
      }
      await yagApi.reader.postComment(chapter.id, { content: newComment });
      const commRes = await yagApi.chapters.getComments(chapter.id);
      setComments(commRes.data.comments || []);
      setNewComment("");
    } catch (err) {
      console.error("Post comment error", err);
    }
  };

  if (isLoading) {
    return (
      <div className="reader-page reader-immersive" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--muted)" }}>
        Đang tải nội dung chương...
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="reader-page reader-immersive" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--muted)" }}>
        Chương truyện không tồn tại hoặc chưa được xuất bản.
      </div>
    );
  }

  const prevChapter = chapters.find((c) => c.chapter_number === chapterNum - 1);
  const nextChapter = chapters.find((c) => c.chapter_number === chapterNum + 1);

  return (
    <>
      <div className={`reader-page reader-immersive ${isDark ? "reader-dark" : ""} ${isWide ? "reader-wide" : ""}`}>
        <div className="reader-progressbar" aria-hidden="true">
          <span style={{ width: `${(chapterNum / Math.max(chapters.length, 1)) * 100}%` }} />
        </div>
        <header className="reader-topbar">
          <div className="inline-actions">
            <Link className="button" href={storyId ? `/stories/${storyId}` : "/story-detail"}>
              <Icon name="arrow" />
              <span className="hide-mobile">Trang truyện</span>
            </Link>
            <div>
              <strong>{story?.title}</strong>
              <div className="story-meta">Chương {chapterNum}/{chapters.length} · {chapter.title}</div>
            </div>
          </div>
          <div className="reader-topbar-center" aria-label="Tiến độ đọc">
            <span>{Math.round((chapterNum / Math.max(chapters.length, 1)) * 100)}%</span>
            <div className="progress">
              <span style={{ width: `${(chapterNum / Math.max(chapters.length, 1)) * 100}%` }} />
            </div>
          </div>
          <div className="inline-actions">
            {chapter.is_premium && (
              <span className="badge badge-amber" style={{ marginRight: 8 }}><Icon name="lock" /> Premium</span>
            )}
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
                  <strong>{c.title}</strong>
                  {c.is_premium ? <Icon name="lock" /> : null}
                </Link>
              ))}
            </div>
          </aside>

          <article className="reader-content reader-paper" style={{ "--reader-font-size": `${fontSize}px` } as any}>
            <div className="reader-chapter-kicker">{story?.title}</div>
            <h1>Chương {chapterNum}: {chapter.title}</h1>
            <div className="reader-meta-strip">
              <span><Icon name="book" />{chapter.content?.split(/\s+/).length || 0} từ</span>
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
            <div className="tabs">
              <button className="tab-button active" type="button">Hiển thị</button>
            </div>
            <div className="tab-panel active stack">
              <div className="field">
                <label>Cỡ chữ ({fontSize}px)</label>
                <input
                  className="range"
                  type="range"
                  min="16"
                  max="24"
                  value={fontSize}
                  onChange={(e) => saveFontSize(Number(e.target.value))}
                  aria-label="Cỡ chữ"
                />
              </div>
              <div className="grid grid-2 reader-compact-grid">
                <button className={`button ${isDark ? "button-primary" : ""}`} onClick={toggleTheme}>Nền tối</button>
                <button className={`button ${isWide ? "button-primary" : ""}`} onClick={toggleWidth}>Mở rộng</button>
              </div>
            </div>
          </aside>
        </main>

        <div role="navigation" className="reader-toolbar" aria-label="Thanh chuyển chương">
          {prevChapter ? (
            <Link className="button" href={`/stories/${storyId}/chapters/${prevChapter.chapter_number}`}>Trước</Link>
          ) : (
            <button className="button" disabled>Đầu truyện</button>
          )}
          <span className="reader-toolbar-status">Chương {chapterNum}</span>
          {nextChapter ? (
            <Link className="button button-primary" href={`/stories/${storyId}/chapters/${nextChapter.chapter_number}`}>Sau</Link>
          ) : (
            <button className="button" disabled>Hết truyện</button>
          )}
        </div>

        <section className="panel panel-pad" style={{ maxWidth: 800, margin: "40px auto 120px", width: "100%" }}>
          <h2 className="section-title">Bình luận chương ({comments.length})</h2>
          <div className="list" style={{ marginTop: 16 }}>
            {comments.map((comm, index) => (
              <div className="list-item" key={comm.id || index}>
                <div>
                  <h3 className="list-title">{comm.user?.username || "Độc giả ẩn danh"}</h3>
                  <div className="list-meta">{comm.content}</div>
                </div>
              </div>
            ))}
            <form onSubmit={handlePostComment} className="stack" style={{ gap: 12, marginTop: 24 }}>
              <div className="field">
                <label>Bình luận của bạn</label>
                <textarea className="textarea" value={newComment} onChange={(e) => setNewComment(e.target.value)} required placeholder="Cảm nhận của bạn về chương này..." />
              </div>
              <button className="button button-primary" type="submit">Gửi bình luận</button>
            </form>
          </div>
        </section>
      </div>
    </>
  );
}

export function ForumScreen() {
  return (
    <AppShell activeId="s08">
      <section className="layout-right">
        <main className="stack">
          <div className="panel panel-pad">
            <div className="inline-actions" style={{ justifyContent: "space-between" }}>
              <div className="tabs">
                <button className="tab-button active">Tất cả</button>
                <button className="tab-button">Theo truyện</button>
                <button className="tab-button">Cộng đồng</button>
              </div>
              <button className="button button-primary" type="button">Tạo chủ đề</button>
            </div>
          </div>
          <div className="list">
            {["Dự đoán thân phận người gửi thư ở chương 12", "Góc tìm truyện có bối cảnh chiến tranh nhẹ nhàng", "Bạn thích lịch cập nhật truyện như thế nào?", "Mưa Trên Thành Cũ vừa có chương mới"].map((title, index) => (
              <a className="list-item" href="#thread" key={title}>
                <div>
                  <h3 className="list-title">{title}</h3>
                  <div className="list-meta">bởi {["Minh Nguyệt", "Phương Linh", "Hải Đăng", "YAG"][index]} · {24 - index * 3} trả lời · cập nhật {index + 1} phút trước</div>
                </div>
                <span className={`badge ${index === 3 ? "badge-blue" : "badge-crimson"}`}>{index === 3 ? "Mới" : "Sôi nổi"}</span>
              </a>
            ))}
          </div>
        </main>
        <aside className="panel panel-pad stack" id="thread">
          <h2 className="section-title">Thảo luận nổi bật</h2>
          <div className="notice"><Icon name="bell" />12 người đang tham gia cuộc thảo luận này.</div>
          <div className="field">
            <label>Trả lời</label>
            <textarea className="textarea" defaultValue="Mình có một giả thuyết khác..." />
          </div>
          <div className="inline-actions">
            <button className="button">B</button>
            <button className="button">Trích dẫn</button>
            <button className="button button-primary">Gửi</button>
          </div>
        </aside>
      </section>
    </AppShell>
  );
}

export function MembershipScreen() {
  const [plans, setPlans] = useState<any[]>([
    { name: "Tháng", id: "MONTHLY", price: 39000, duration_days: 30, description: "Linh hoạt cho độc giả mới" },
    { name: "Năm", id: "YEARLY", price: 199000, duration_days: 365, description: "Dành cho người đọc thường xuyên" }
  ]);

  useEffect(() => {
    if (appEnv.useMocks) return;
    const fetchPlans = async () => {
      try {
        const res = await yagApi.apiFetch<any[]>("/api/v1/membership/plans");
        setPlans(res.data);
      } catch (err) {
        console.error("Failed to load plans:", err);
      }
    };
    void fetchPlans();
  }, []);

  const formatPrice = (price: number) => {
    return price >= 1000 ? `${price / 1000}Kđ` : `${price}đ`;
  };

  return (
    <AppShell activeId="s09">
      <div className="notice success" style={{ marginBottom: 24 }}>
        <Icon name="check" />Gói hiện tại: Miễn phí · Bạn vẫn có thể đọc toàn bộ chương miễn phí và lưu truyện vào thư viện.
      </div>
      <div className="action-strip" style={{ marginBottom: 24 }}>
        <div>
          <strong>Thanh toán an toàn qua cổng trung gian VNPAY</strong>
          <div className="list-meta">YAG không lưu số thẻ hoặc tài khoản ngân hàng của người dùng.</div>
        </div>
      </div>
      <section className="grid grid-3">
        {plans.map((plan, index) => (
          <article className="panel panel-pad stack" key={plan.id}>
            <span className={`badge ${index === 0 ? "badge-crimson" : "badge-blue"}`}>
              {index === 0 ? "Phổ biến nhất" : plan.name}
            </span>
            <h2 className="page-title" style={{ fontSize: 24 }}>{plan.name}</h2>
            <div className="metric-value">{formatPrice(Number(plan.price))}</div>
            <p className="section-subtitle">{plan.description || `Hiệu lực trong ${plan.duration_days} ngày.`}</p>
            <div className="list">
              {["Mở khóa chương premium", "Không quảng cáo khi đọc", "Tìm kiếm AI nâng cao", "Lưu tiến độ đọc"].map((item) => (
                <div className="list-item" key={item}>
                  <span>{item}</span>
                  <Icon name="check" />
                </div>
              ))}
            </div>
            <a className={`button ${index === 0 ? "button-primary" : ""}`} href={`/payment/result?plan=${plan.id}`} data-billing-plan={plan.id}>
              Đăng ký ngay
            </a>
          </article>
        ))}
      </section>
    </AppShell>
  );
}

export function PaymentScreen() {
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("vnp_ResponseCode") || searchParams.get("status") || "00";
  const planId = searchParams.get("plan") || "MONTHLY";
  const txnRef = searchParams.get("vnp_TxnRef") || searchParams.get("transactionId") || searchParams.get("txnRef");
  const [transaction, setTransaction] = useState<any | null>(null);
  const [isCheckingTransaction, setIsCheckingTransaction] = useState(Boolean(txnRef) && !appEnv.useMocks);

  useEffect(() => {
    if (!txnRef || appEnv.useMocks) return;

    let isMounted = true;
    const loadTransaction = async () => {
      try {
        const response = await yagApi.billing.getTransaction(txnRef);
        if (isMounted) setTransaction(response.data);
      } catch (error) {
        console.error("Failed to load payment transaction", error);
      } finally {
        if (isMounted) setIsCheckingTransaction(false);
      }
    };

    void loadTransaction();
    const interval = window.setInterval(() => {
      if (!transaction || transaction.status === "pending") void loadTransaction();
    }, 5000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [txnRef, transaction, transaction?.status]);

  const backendStatus = transaction?.status as string | undefined;
  const redirectLooksSuccessful = statusParam === "00" || statusParam === "success";
  const isPending = Boolean(txnRef) && !appEnv.useMocks && (isCheckingTransaction || backendStatus === "pending" || !backendStatus);
  const isSuccess = backendStatus ? backendStatus === "success" : appEnv.useMocks && redirectLooksSuccessful;

  return (
    <AppShell activeId="s10">
      <section className="layout-right">
        <main className="panel panel-pad stack">
          {isPending ? (
            <div className="empty-state" style={{ borderStyle: "solid" }}>
              <span className="badge badge-blue"><Icon name="card" />Đang xác nhận</span>
              <h2 className="page-title" style={{ fontSize: 24 }}>Đang chờ IPN từ VNPAY</h2>
              <p>YAG đang đối soát giao dịch với backend. Trang này sẽ tự cập nhật khi membership được kích hoạt.</p>
              <div className="inline-actions">
                <button className="button button-primary" onClick={() => txnRef && yagApi.billing.getTransaction(txnRef).then((res) => setTransaction(res.data))}>
                  Kiểm tra lại
                </button>
                <Link className="button" href="/membership">Về gói hội viên</Link>
              </div>
            </div>
          ) : isSuccess ? (
            <div className="empty-state" style={{ borderStyle: "solid" }}>
              <span className="badge badge-green"><Icon name="check" />Thanh toán thành công</span>
              <h2 className="page-title" style={{ fontSize: 24 }}>Gói hội viên đã được kích hoạt</h2>
              <p>Mã giao dịch {transaction?.vnp_transaction_no || searchParams.get("vnp_TransactionNo") || txnRef || "VNPAY"} · Cảm ơn bạn đã ủng hộ YAG.</p>
              <div className="inline-actions">
                <Link className="button button-primary" href="/home">Bắt đầu đọc</Link>
                <Link className="button" href="/library">Về thư viện</Link>
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{ borderStyle: "solid" }}>
              <span className="badge badge-red"><Icon name="close" />Thanh toán thất bại</span>
              <h2 className="page-title" style={{ fontSize: 24 }}>Giao dịch không thành công</h2>
              <ErrorGuide title="Cách xử lý" items={["Kiểm tra số dư và hạn mức thanh toán online của thẻ.", "Thử lại sau 2 phút hoặc chọn phương thức thanh toán khác.", "Nếu tài khoản đã bị trừ tiền, gửi mã giao dịch cho hỗ trợ để đối soát."]} />
            </div>
          )}
        </main>
        <aside className="panel panel-pad stack">
          <h2 className="section-title">Thông tin giao dịch</h2>
          <div className="list">
            <div className="list-item"><span>Phương thức</span><strong>VNPAY Cổng thanh toán</strong></div>
            <div className="list-item"><span>Gói đăng ký</span><strong>{transaction?.plan_name || transaction?.plan_id || planId}</strong></div>
            {txnRef ? <div className="list-item"><span>Mã tham chiếu</span><strong>{txnRef}</strong></div> : null}
            <div className="list-item"><span>Trạng thái</span>
              <span className={`badge ${isPending ? "badge-blue" : isSuccess ? "badge-green" : "badge-red"}`}>
                {isPending ? "Đang xác nhận" : isSuccess ? "Đã thanh toán" : "Thất bại"}
              </span>
            </div>
          </div>
        </aside>
      </section>
    </AppShell>
  );
}

export function LibraryScreen() {
  const [storiesList, setStoriesList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (appEnv.useMocks) {
      setStoriesList(stories.slice(0, 4));
      setIsLoading(false);
      return;
    }
    const loadLibrary = async () => {
      try {
        const res = await yagApi.reader.getLibrary();
        setStoriesList(res.data || []);
      } catch (err) {
        console.error("Failed to load library", err);
      } finally {
        setIsLoading(false);
      }
    };
    void loadLibrary();
  }, []);

  return (
    <AppShell activeId="s11">
      <section className="panel panel-pad stack">
        <div className="inline-actions" style={{ justifyContent: "space-between" }}>
          <div className="tabs">
            <button className="tab-button active">Đang theo dõi ({storiesList.length})</button>
          </div>
          <button className="button" onClick={() => {
            if (!appEnv.useMocks) {
              setIsLoading(true);
              yagApi.reader.getLibrary().then(res => {
                setStoriesList(res.data || []);
                setIsLoading(false);
              });
            }
          }}>Làm mới</button>
        </div>
        {isLoading ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>
            Đang tải thư viện truyện...
          </div>
        ) : storiesList.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>
            Thư viện trống. Hãy lưu tác phẩm từ Trang chi tiết truyện.
          </div>
        ) : (
          <QuickStories storiesList={storiesList} />
        )}
      </section>
    </AppShell>
  );
}

export function ProfileScreen() {
  const { user } = useAuth();

  const name = user?.profile?.display_name || user?.username || "Minh Nguyệt";
  const bio = user?.profile?.bio || "Độc giả · Thích truyện trinh thám nhẹ và lịch sử";
  const score = user?.profile?.reputation_score ?? 100;
  const avatarText = name.slice(0, 2).toUpperCase();

  return (
    <AppShell activeId="s12">
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
          <MetricCard label="Uy tín tác giả" value={String(score)} />
          <MetricCard label="Vai trò" value={user?.role === "admin" ? "Admin" : user?.role === "author" ? "Tác giả" : "Độc giả"} />
        </div>
      </section>
    </AppShell>
  );
}

export function SettingsScreen() {
  const { user, refreshUser } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.profile) {
      setDisplayName(user.profile.display_name || "");
      setBio(user.profile.bio || "");
    }
  }, [user]);

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

  return (
    <AppShell activeId="s13">
      <section className="layout-filter">
        <aside className="panel panel-pad settings-nav-panel">
          <div className="sidebar-section">
            <div className="sidebar-label">Cài đặt</div>
            {settingSections.map((item, index) => (
              <a className={`sidebar-link ${index === 0 ? "active" : ""}`} href={`#setting-${item.id}`} key={item.id}>
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </a>
            ))}
          </div>
        </aside>
        <main className="stack">
          <section className="panel panel-pad stack" id="setting-profile">
            <div>
              <h2 className="section-title">Hồ sơ cá nhân</h2>
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
                  <input className="input" type="email" value={user?.email || ""} disabled />
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
        </main>
      </section>
    </AppShell>
  );
}

export function NotificationsScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      if (appEnv.useMocks) {
        setNotifications([
          { id: "1", title: "Cập nhật chương mới", message: "Mưa Trên Thành Cũ vừa cập nhật chương 12.", read_at: null }
        ]);
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
    } catch (err) {
      console.error(err);
    }
  };

  const handleRead = async (id: string) => {
    if (appEnv.useMocks) return;
    try {
      await yagApi.notifications.markAsRead(id);
      void loadNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AppShell activeId="s14">
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
