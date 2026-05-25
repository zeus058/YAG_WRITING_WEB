import Link from "next/link";
import { stories, type Story } from "@/data/yag";
import { Cover } from "./Cover";

export function StoryBadge({ badge, short = false }: { badge: Story["badge"]; short?: boolean }) {
  const className = badge === "done" ? "badge-green" : badge === "ai" ? "badge-blue" : "badge-crimson";
  const text = badge === "done" ? "Hoàn thành" : badge === "ai" ? (short ? "Hợp gu" : "AI đề xuất") : short ? "Nổi bật" : "Đang hot";

  return <span className={`badge ${className} story-status-badge story-status-${badge}`}>{text}</span>;
}

export function HomeStoryCard({ story, index }: { story: Story; index: number }) {
  const reads = ["1.2M", "842K", "635K", "524K", "418K", "390K", "318K", "276K"][index % 8];
  const rating = (4.9 - (index % 5) * 0.1).toFixed(1);

  return (
    <Link className="home-story-card" href="/story-detail">
      <div className="home-story-cover">
        <Cover index={index} />
        <StoryBadge badge={story.badge} short />
      </div>
      <div className="home-story-body">
        <h3 className="story-title">{story.title}</h3>
        <div className="story-meta">{story.author} · {story.genre}</div>
        <div className="home-meta-row">
          <span>{story.chapters} chương</span>
          <span>{rating} ★</span>
          <span>{reads} đọc</span>
        </div>
      </div>
    </Link>
  );
}

export function ReadingCard({ story, index }: { story: Story; index: number }) {
  const current = Math.min(story.chapters - 1, 8 + index * 5);
  const percent = Math.round((current / story.chapters) * 100);

  return (
    <Link className="reading-card" href="/reader-mode">
      <Cover index={index + 3} small />
      <div className="reading-info">
        <h3 className="story-title">{story.title}</h3>
        <div className="story-meta">{story.author} · {story.genre}</div>
        <div className="progress"><span style={{ width: `${percent}%` }} /></div>
        <div className="home-meta-row"><span>Chương {current}/{story.chapters}</span><span>{percent}%</span></div>
      </div>
    </Link>
  );
}

export function RankingItem({ story, index }: { story: Story; index: number }) {
  return (
    <Link className="ranking-item" href="/story-detail">
      <span className="ranking-number">{index + 1}</span>
      <div>
        <h3 className="list-title">{story.title}</h3>
        <div className="list-meta">{story.author} · {story.genre}</div>
      </div>
      <span className={`badge ${index < 3 ? "badge-crimson" : "badge-blue"}`}>{index < 3 ? "Tăng hạng" : "Ổn định"}</span>
    </Link>
  );
}

export function UpdateStoryRow({ story, index }: { story: Story; index: number }) {
  return (
    <Link className="update-row" href="/story-detail">
      <Cover index={index} small />
      <div>
        <h3 className="story-title">{story.title}</h3>
        <div className="story-meta">{story.author} · {story.genre}</div>
      </div>
      <div className="update-meta">
        <StoryBadge badge={story.badge} />
        <span>vừa cập nhật</span>
      </div>
    </Link>
  );
}

export function QuickStories({ count = 6 }: { count?: number }) {
  return (
    <div className="home-story-grid">
      {stories.slice(0, count).map((story, index) => <HomeStoryCard story={story} index={index} key={story.title} />)}
    </div>
  );
}
