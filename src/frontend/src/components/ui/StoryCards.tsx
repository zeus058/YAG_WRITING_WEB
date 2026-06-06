import Link from "next/link";
import type { Story } from "@/data/yag";
import { Cover } from "./Cover";

export function getStoryAuthorName(story: any) {
  const author = story?.author;
  if (typeof author === "string") return author;
  return (
    author?.display_name ||
    author?.profile?.display_name ||
    author?.username ||
    story?.author_name ||
    "Tác giả chưa rõ"
  );
}

function formatRating(value: unknown, fallback: string) {
  const rating = Number(value);
  return Number.isFinite(rating) ? rating.toFixed(1) : fallback;
}

export function StoryBadge({ badge, short = false }: { badge: Story["badge"]; short?: boolean }) {
  const className = badge === "done" ? "badge-green" : badge === "ai" ? "badge-blue" : "badge-crimson";
  const text = badge === "done" ? "Hoàn thành" : badge === "ai" ? (short ? "Hợp gu" : "AI đề xuất") : short ? "Nổi bật" : "Đang hot";

  return <span className={`badge ${className} story-status-badge story-status-${badge}`}>{text}</span>;
}

export function HomeStoryCard({ story, index }: { story: any; index: number }) {
  const reads = story.view_count !== undefined ? String(story.view_count >= 1000 ? `${(story.view_count / 1000).toFixed(0)}K` : story.view_count) : "0";
  const rating = formatRating(story.rating_avg, "0.0");
  const href = story.id ? `/stories/${story.id}` : "/story-detail";

  const authorName = getStoryAuthorName(story);
  const genre = story.category || story.genre || "Truyện";
  const chapterCount = story.chapter_count ?? story.chapters ?? 0;
  const badgeVal = story.badge as Story["badge"] | undefined;

  return (
    <Link className="home-story-card" href={href}>
      <div className="home-story-cover">
        <Cover index={index} coverUrl={story.cover_url} />
        {badgeVal ? <StoryBadge badge={badgeVal} short /> : null}
      </div>
      <div className="home-story-body">
        <h3 className="story-title">{story.title}</h3>
        <div className="story-meta">{authorName} · {genre}</div>
        <div className="home-meta-row">
          <span>{chapterCount} chương</span>
          <span>{rating} ★</span>
          <span>{reads} đọc</span>
        </div>
      </div>
    </Link>
  );
}

export function AIRecommendationCard({ story, index }: { story: any; index: number }) {
  const storyId = story.id || story.story_id;
  const href = storyId ? `/stories/${storyId}` : "/discover";
  const genre = story.category || story.genre || "Truyện";
  const reason = story.ai_reason || story.reason || "Phù hợp với gu đọc và tín hiệu truyện gần đây.";
  const tags = story.match_tags || story.ai_match_tags || [];
  const source = story.source || story.ai_source || "llm_rerank";
  const sourceLabel = source === "llm_rerank"
    ? "LLM rerank"
    : source === "semantic"
      ? "Semantic"
      : source === "popular"
        ? "Popular"
        : source;
  const similarity = Number(story.similarity ?? story.ai_similarity);
  const confidence = Number.isFinite(similarity) ? Math.round(similarity * 100) : null;

  return (
    <Link className="ai-recommend-card" href={href}>
      <Cover index={index + 8} coverUrl={story.cover_url} small />
      <div className="ai-recommend-body">
        <div className="ai-recommend-title-row">
          <h3 className="story-title">{story.title || "Truyện được đề xuất"}</h3>
          <span className="badge badge-blue">{confidence ? `${confidence}%` : "AI"}</span>
        </div>
        <div className="story-meta">{genre} · {sourceLabel}</div>
        <p>{reason}</p>
        {tags.length > 0 && (
          <div className="ai-tag-row">
            {tags.slice(0, 4).map((tag: string) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

export function ReadingCard({ story, index }: { story: any; index: number }) {
  const chapterCount = Math.max(Number(story.chapter_count ?? story.chapters ?? 1), 1);
  const rawCurrent = Number(story.current_chapter_number ?? story.last_read_chapter ?? story.chapters_read ?? 0);
  const current = Math.max(0, Math.min(chapterCount, rawCurrent));
  const hasProgress = current > 0;
  const percent = hasProgress ? Math.round((current / chapterCount) * 100) : 0;
  const href = story.id ? (hasProgress ? `/stories/${story.id}/chapters/${current}` : `/stories/${story.id}`) : "/discover";

  const authorName = getStoryAuthorName(story);
  const genre = story.category || story.genre || "Truyện";

  return (
    <Link className="reading-card" href={href}>
      <Cover index={index + 3} coverUrl={story.cover_url} small />
      <div className="reading-info">
        <h3 className="story-title">{story.title}</h3>
        <div className="story-meta">{authorName} · {genre}</div>
        {hasProgress ? (
          <>
            <div className="progress"><span style={{ width: `${percent}%` }} /></div>
            <div className="home-meta-row"><span>Chương {current}/{chapterCount}</span><span>{percent}%</span></div>
          </>
        ) : (
          <div className="home-meta-row"><span>{chapterCount} chương</span><span>Chưa đọc</span></div>
        )}
      </div>
    </Link>
  );
}

export function RankingItem({ story, index }: { story: any; index: number }) {
  const href = story.id ? `/stories/${story.id}` : "/story-detail";
  const authorName = getStoryAuthorName(story);
  const genre = story.category || story.genre || "Truyện";

  return (
    <Link className="ranking-item" href={href}>
      <span className="ranking-number">{index + 1}</span>
      <div>
        <h3 className="list-title">{story.title}</h3>
        <div className="list-meta">{authorName} · {genre}</div>
      </div>
      {typeof story.rank_change === "number" ? (
        <span className={`badge ${story.rank_change > 0 ? "badge-crimson" : "badge-blue"}`}>
          {story.rank_change > 0 ? `+${story.rank_change}` : story.rank_change}
        </span>
      ) : null}
    </Link>
  );
}

export function UpdateStoryRow({ story, index }: { story: any; index: number }) {
  const href = story.id ? `/stories/${story.id}` : "/story-detail";
  const authorName = getStoryAuthorName(story);
  const genre = story.category || story.genre || "Truyện";
  const badgeVal = story.badge as Story["badge"] | undefined;

  return (
    <Link className="update-row" href={href}>
      <Cover index={index} coverUrl={story.cover_url} small />
      <div>
        <h3 className="story-title">{story.title}</h3>
        <div className="story-meta">{authorName} · {genre}</div>
      </div>
      <div className="update-meta">
        {badgeVal ? <StoryBadge badge={badgeVal} /> : null}
        <span>vừa cập nhật</span>
      </div>
    </Link>
  );
}

export function QuickStories({ count = 6, storiesList }: { count?: number; storiesList?: any[] }) {
  const displayList = (storiesList ?? []).slice(0, count);

  return (
    <div className="home-story-grid">
      {displayList.map((story, index) => (
        <HomeStoryCard story={story} index={index} key={story.id || story.title} />
      ))}
    </div>
  );
}

export function AIRecommendationStories({ count = 6, storiesList }: { count?: number; storiesList?: any[] }) {
  const displayList = (storiesList ?? []).slice(0, count);

  return (
    <div className="ai-recommend-grid">
      {displayList.map((story, index) => (
        <AIRecommendationCard story={story} index={index} key={story.id || story.story_id || story.title} />
      ))}
    </div>
  );
}
