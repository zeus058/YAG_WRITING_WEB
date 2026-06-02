import Link from "next/link";
import { stories, type Story } from "@/data/yag";
import { Cover } from "./Cover";

export function getStoryAuthorName(story: any) {
  const author = story?.author;
  if (typeof author === "string") return author;
  return (
    author?.display_name ||
    author?.profile?.display_name ||
    author?.username ||
    story?.author_name ||
    "Tác giả YAG"
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
  const reads = story.view_count !== undefined ? String(story.view_count >= 1000 ? `${(story.view_count / 1000).toFixed(0)}K` : story.view_count) : ["1.2M", "842K", "635K", "524K", "418K", "390K", "318K", "276K"][index % 8];
  const rating = formatRating(story.rating_avg, (4.9 - (index % 5) * 0.1).toFixed(1));
  const href = story.id ? `/stories/${story.id}` : "/story-detail";
  
  const authorName = getStoryAuthorName(story);
  const genre = story.category || story.genre || "Truyện";
  const chapterCount = story.chapter_count ?? story.chapters ?? 0;
  const badgeVal = story.badge || (index % 3 === 0 ? "hot" : index % 2 === 0 ? "ai" : "done");

  return (
    <Link className="home-story-card" href={href}>
      <div className="home-story-cover">
        <Cover index={index} coverUrl={story.cover_url} />
        <StoryBadge badge={badgeVal} short />
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

export function ReadingCard({ story, index }: { story: any; index: number }) {
  const chapterCount = Math.max(Number(story.chapter_count ?? story.chapters ?? 1), 1);
  const current = Math.max(1, Math.min(chapterCount, 8 + index * 5));
  const percent = Math.round((current / chapterCount) * 100);
  const href = story.id ? `/stories/${story.id}/chapters/${current}` : "/reader-mode";
  
  const authorName = getStoryAuthorName(story);
  const genre = story.category || story.genre || "Truyện";

  return (
    <Link className="reading-card" href={href}>
      <Cover index={index + 3} coverUrl={story.cover_url} small />
      <div className="reading-info">
        <h3 className="story-title">{story.title}</h3>
        <div className="story-meta">{authorName} · {genre}</div>
        <div className="progress"><span style={{ width: `${percent}%` }} /></div>
        <div className="home-meta-row"><span>Chương {current}/{chapterCount}</span><span>{percent}%</span></div>
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
      <span className={`badge ${index < 3 ? "badge-crimson" : "badge-blue"}`}>{index < 3 ? "Tăng hạng" : "Ổn định"}</span>
    </Link>
  );
}

export function UpdateStoryRow({ story, index }: { story: any; index: number }) {
  const href = story.id ? `/stories/${story.id}` : "/story-detail";
  const authorName = getStoryAuthorName(story);
  const genre = story.category || story.genre || "Truyện";
  const badgeVal = story.badge || (index % 3 === 0 ? "hot" : index % 2 === 0 ? "ai" : "done");

  return (
    <Link className="update-row" href={href}>
      <Cover index={index} coverUrl={story.cover_url} small />
      <div>
        <h3 className="story-title">{story.title}</h3>
        <div className="story-meta">{authorName} · {genre}</div>
      </div>
      <div className="update-meta">
        <StoryBadge badge={badgeVal} />
        <span>vừa cập nhật</span>
      </div>
    </Link>
  );
}

export function QuickStories({ count = 6, storiesList }: { count?: number; storiesList?: any[] }) {
  const displayList = storiesList || stories.slice(0, count);

  return (
    <div className="home-story-grid">
      {displayList.map((story, index) => (
        <HomeStoryCard story={story} index={index} key={story.id || story.title} />
      ))}
    </div>
  );
}
