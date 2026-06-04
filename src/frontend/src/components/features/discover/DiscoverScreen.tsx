"use client";

import React, { useEffect, useMemo, useState } from "react";
import { stories } from "@/data/yag";
import { AppShell } from "@/components/layout";
import { ErrorGuide, Icon } from "@/components/ui";

type DiscoverMode = "keyword" | "semantic";

type DiscoverFilters = {
  genre: string;
  status: string;
  chapters: string;
  sort: string;
};

const discoverGenres = [
  "Tất cả",
  "Ngôn tình",
  "Trinh thám",
  "Huyền huyễn",
  "Kỳ ảo",
  "Hiện đại",
  "Phiêu lưu",
  "Cổ trang",
];

const discoverStatuses = ["Tất cả", "ongoing", "completed", "paused"];

const discoverChapterFilters = ["Tất cả", "Dưới 40 chương", "40-70 chương", "Trên 70 chương"];

const discoverSortOptions = ["Độ phù hợp", "Nhiều chương nhất", "Đang hot", "Đánh giá cao"];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getStoryStatus(badge: (typeof stories)[number]["badge"]) {
  if (badge === "done") return "completed";
  if (badge === "ai") return "paused";
  return "ongoing";
}

function getChapterLabel(chapters: number) {
  if (chapters < 40) return "Dưới 40 chương";
  if (chapters <= 70) return "40-70 chương";
  return "Trên 70 chương";
}

function getScore(story: (typeof stories)[number], query: string, mode: DiscoverMode) {
  const normalizedQuery = normalizeText(query.trim());
  if (!normalizedQuery) return mode === "semantic" ? 0.72 : 0.54;

  const title = normalizeText(story.title);
  const author = normalizeText(story.author);
  const genre = normalizeText(story.genre);
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);

  let score = mode === "semantic" ? 0.58 : 0.44;
  if (title.includes(normalizedQuery)) score += 0.24;
  if (author.includes(normalizedQuery)) score += 0.14;
  if (genre.includes(normalizedQuery)) score += 0.18;

  tokens.forEach((token) => {
    if (title.includes(token)) score += 0.06;
    if (genre.includes(token)) score += 0.05;
    if (author.includes(token)) score += 0.03;
  });

  if (mode === "semantic") {
    score += 0.08;
    if (tokens.some((token) => ["bi an", "day du", "hoai niem", "met moi", "u toi"].some((phrase) => token === phrase || normalizedQuery.includes(phrase)))) {
      score += 0.07;
    }
  }

  if (story.badge === "hot") score += 0.02;
  if (story.chapters > 60) score += 0.03;

  return Math.min(0.98, Number(score.toFixed(2)));
}

function matchStory(story: (typeof stories)[number], filters: DiscoverFilters) {
  const genreMatch =
    filters.genre === "Tất cả" || normalizeText(story.genre).includes(normalizeText(filters.genre));
  const statusMatch = filters.status === "Tất cả" || getStoryStatus(story.badge) === filters.status;
  const chapterMatch =
    filters.chapters === "Tất cả" ||
    (filters.chapters === "Dưới 40 chương" && story.chapters < 40) ||
    (filters.chapters === "40-70 chương" && story.chapters >= 40 && story.chapters <= 70) ||
    (filters.chapters === "Trên 70 chương" && story.chapters > 70);

  return genreMatch && statusMatch && chapterMatch;
}

export function DiscoverScreen() {
  const [mode, setMode] = useState<DiscoverMode>("semantic");
  const [query, setQuery] = useState("nam chính là hacker, câu chuyện có nhịp chậm và bí ẩn");
  const [filters, setFilters] = useState<DiscoverFilters>({
    genre: "Tất cả",
    status: "Tất cả",
    chapters: "Tất cả",
    sort: "Độ phù hợp",
  });
  const [loading, setLoading] = useState(false);
  const [searchStamp, setSearchStamp] = useState(0);

  useEffect(() => {
    if (!searchStamp) return undefined;

    setLoading(true);
    const timeout = window.setTimeout(() => {
      setLoading(false);
    }, 780);

    return () => window.clearTimeout(timeout);
  }, [searchStamp]);

  const results = useMemo(() => {
    const scored = stories
      .filter((story) => matchStory(story, filters))
      .map((story) => ({
        story,
        score: getScore(story, query, mode),
        status: getStoryStatus(story.badge),
        chapterLabel: getChapterLabel(story.chapters),
      }));

    const sorted = [...scored];
    if (filters.sort === "Nhiều chương nhất") {
      sorted.sort((a, b) => b.story.chapters - a.story.chapters);
    } else if (filters.sort === "Đang hot") {
      sorted.sort((a, b) => Number(b.story.badge === "hot") - Number(a.story.badge === "hot"));
    } else if (filters.sort === "Đánh giá cao") {
      sorted.sort((a, b) => Number(b.story.badge === "done") - Number(a.story.badge === "done"));
    } else {
      sorted.sort((a, b) => b.score - a.score);
    }

    return sorted.slice(0, 8);
  }, [filters, mode, query]);

  const searchSummary =
    mode === "semantic"
      ? "AI vector search khớp ngữ cảnh, tone và ý định câu chuyện."
      : "Full-text search ưu tiên khớp tiêu đề, mô tả và thể loại.";
  const activeGenre = filters.genre === "Tất cả" ? "Tất cả thể loại" : filters.genre;

  const runSearch = () => setSearchStamp((value) => value + 1);

  return (
    <AppShell activeId="s05">
      <section className="discover-shell">
        <div className="discover-hero panel panel-pad stack">
          <div className="discover-hero-copy">
            <span className="badge badge-crimson">S05 - Discover & Search</span>
            <h1 className="page-title" style={{ fontSize: 36 }}>
              Tìm truyện bằng <em>ý nghĩa</em>, không chỉ bằng từ khóa.
            </h1>
            <p className="page-description" style={{ maxWidth: 720 }}>
              Chuyển giữa tìm kiếm cơ bản và AI semantic search, tinh chỉnh bộ lọc ngay bên cạnh và xem
              skeleton loading trong lúc kết quả vector đang được truy vấn.
            </p>
          </div>

          <div className="discover-search-panel">
            <div className="discover-search-row">
              <div className="field discover-query">
                <label>Nhập mô tả truyện</label>
                <textarea
                  className="textarea discover-query-input"
                  rows={4}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Ví dụ: nữ chính là hacker, không khí u tối, có bí ẩn và cảm xúc chậm"
                />
              </div>
              <div className="discover-mode-panel">
                <label>Chế độ tìm kiếm</label>
                <div className="tabs discover-mode-toggle">
                  <button
                    className={`tab-button ${mode === "keyword" ? "active" : ""}`}
                    type="button"
                    onClick={() => setMode("keyword")}
                  >
                    Từ khóa cơ bản
                  </button>
                  <button
                    className={`tab-button ${mode === "semantic" ? "active" : ""}`}
                    type="button"
                    onClick={() => setMode("semantic")}
                  >
                    AI ngữ nghĩa
                  </button>
                </div>
                <div className="discover-mode-note">{searchSummary}</div>
              </div>
            </div>

            <div className="pill-list discover-chips">
              {discoverGenres.map((filter) => (
                <button
                  className={`pill ${filters.genre === filter ? "active" : ""}`}
                  type="button"
                  key={filter}
                  onClick={() => setFilters((prev) => ({ ...prev, genre: filter }))}
                >
                  {filter}
                </button>
              ))}
            </div>

            <div className="discover-actions">
              <div className="discover-action-summary">
                <strong>{mode === "semantic" ? "Semantic vector search" : "Full-text search"}</strong>
                <span>
                  {mode === "semantic"
                    ? "Kết quả ưu tiên độ khớp ngữ cảnh, cảm xúc và nhịp truyện."
                    : "Kết quả ưu tiên khớp tiêu đề, mô tả và thể loại đã nhập."}
                </span>
              </div>
              <button className="button button-primary" type="button" onClick={runSearch}>
                <Icon name="search" />
                Tìm truyện
              </button>
            </div>
          </div>
        </div>

        <section className="layout-filter discover-layout" style={{ marginTop: 24 }}>
          <aside className="panel panel-pad stack discover-filter-panel">
            <div className="discover-filter-head">
              <h2 className="section-title">Bộ lọc nâng cao</h2>
              <span className="badge badge-blue">{activeGenre}</span>
            </div>

            <div className="field">
              <label>Thể loại</label>
              <select
                className="select"
                value={filters.genre}
                onChange={(event) => setFilters((prev) => ({ ...prev, genre: event.target.value }))}
              >
                {discoverGenres.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Trạng thái</label>
              <select
                className="select"
                value={filters.status}
                onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
              >
                {discoverStatuses.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Số chương</label>
              <select
                className="select"
                value={filters.chapters}
                onChange={(event) => setFilters((prev) => ({ ...prev, chapters: event.target.value }))}
              >
                {discoverChapterFilters.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Sắp xếp</label>
              <select
                className="select"
                value={filters.sort}
                onChange={(event) => setFilters((prev) => ({ ...prev, sort: event.target.value }))}
              >
                {discoverSortOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="discover-filter-note">
              <Icon name="eye" />
              <span>AI semantic search sẽ hiển thị skeleton trong lúc chờ vector response.</span>
            </div>

            <button className="button button-primary" type="button" onClick={runSearch}>
              Áp dụng bộ lọc
            </button>
            <button
              className="button button-soft"
              type="button"
              onClick={() =>
                setFilters({
                  genre: "Tất cả",
                  status: "Tất cả",
                  chapters: "Tất cả",
                  sort: "Độ phù hợp",
                })
              }
            >
              Đặt lại
            </button>
          </aside>

          <main className="stack discover-results">
            <div className="panel panel-pad discover-results-header">
              <div className="home-section-head">
                <h2 className="section-title">{results.length} truyện phù hợp</h2>
                <span className={`badge ${mode === "semantic" ? "badge-blue" : "badge-crimson"}`}>
                  {mode === "semantic" ? "AI semantic" : "Từ khóa"}
                </span>
              </div>
              <div className="discover-result-stats">
                <div>
                  <span>Chế độ</span>
                  <strong>{mode === "semantic" ? "AI ngữ nghĩa" : "Từ khóa cơ bản"}</strong>
                </div>
                <div>
                  <span>Từ khóa</span>
                  <strong>{query.trim().slice(0, 42) || "Không có"}</strong>
                </div>
                <div>
                  <span>Bộ lọc</span>
                  <strong>
                    {filters.genre} · {filters.status}
                  </strong>
                </div>
              </div>
            </div>

            <ErrorGuide
              title="Không thấy truyện phù hợp?"
              items={[
                "Thử đổi sang mô tả cảm xúc hoặc bối cảnh thay vì chỉ nhập tên thể loại.",
                "Nới bộ lọc số chương hoặc trạng thái để AI semantic có nhiều không gian xếp hạng hơn.",
                "Chuyển sang Từ khóa cơ bản nếu bạn muốn khớp tên truyện chính xác hơn.",
              ]}
            />

            {loading ? (
              <section className="discover-skeleton-grid" aria-label="Đang tải kết quả">
                {Array.from({ length: 8 }).map((_, index) => (
                  <article className="panel panel-pad discover-card" key={index}>
                    <div className="discover-card-cover skeleton" />
                    <div className="compact-stack">
                      <div className="skeleton" style={{ width: "42%", height: 14 }} />
                      <div className="skeleton" style={{ width: "82%", height: 22 }} />
                      <div className="skeleton" style={{ width: "60%", height: 14 }} />
                      <div className="discover-result-meta">
                        <div className="skeleton" style={{ width: "30%", height: 18 }} />
                        <div className="skeleton" style={{ width: "38%", height: 18 }} />
                      </div>
                    </div>
                  </article>
                ))}
              </section>
            ) : (
              <section className="discover-results-grid" aria-label="Danh sách kết quả">
                {results.map(({ story, score, chapterLabel, status }) => (
                  <article className="panel panel-pad discover-card" key={story.title}>
                    <div className="discover-card-cover">
                      <span className={`discover-badge ${story.badge}`}>{story.badge}</span>
                      <div className="discover-cover-mark">{story.title.slice(0, 1)}</div>
                    </div>
                    <div className="compact-stack">
                      <div className="discover-card-topline">
                        <span className="badge badge-blue">#{Math.round(score * 100)}</span>
                        <span
                          className={`badge ${
                            status === "completed"
                              ? "badge-green"
                              : status === "paused"
                                ? "badge-amber"
                                : "badge-crimson"
                          }`}
                        >
                          {status === "completed" ? "Hoàn thành" : status === "paused" ? "Tạm ngưng" : "Đang ra"}
                        </span>
                      </div>
                      <h3 className="story-title">{story.title}</h3>
                      <div className="story-meta">
                        {story.author} · {story.genre}
                      </div>
                      <div className="discover-card-copy">
                        {chapterLabel} · AI semantic match với truy vấn hiện tại.
                      </div>
                      <div className="discover-result-meta">
                        <span>
                          <Icon name="book" />
                          {story.chapters} chương
                        </span>
                        <span>
                          <Icon name="eye" />
                          {Math.round(score * 100)}% khớp
                        </span>
                      </div>
                      <div className="inline-actions">
                        <a className="button button-primary" href="/story-detail">
                          <Icon name="book" />
                          Xem truyện
                        </a>
                        <button
                          className="button"
                          type="button"
                          data-toast={`Đã đánh dấu ${story.title} vào danh sách theo dõi.`}
                        >
                          Theo dõi
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </section>
            )}

            <button className="button" type="button" onClick={runSearch}>
              Tải lại 8 truyện
            </button>
          </main>
        </section>
      </section>
    </AppShell>
  );
}
