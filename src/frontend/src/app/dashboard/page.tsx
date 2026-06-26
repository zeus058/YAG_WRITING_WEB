"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { stories } from "@/data/yag";
import { Cover, QuickStories, RankingItem, ReadingCard, UpdateStoryRow } from "@/components/ui";
import { AppShell } from "@/components/layout";

export default function DashboardPage() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [suggestedGenre, setSuggestedGenre] = useState("Ngôn tình");
  const [suggestionRefreshedCount, setSuggestionRefreshedCount] = useState(0);

  // Trích xuất danh sách truyện đọc tiếp mô phỏng
  const continueReadingStories = stories.slice(3, 6);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const handleRefreshSuggestions = () => {
    setSuggestionRefreshedCount((prev) => prev + 1);
    triggerToast("Đã làm mới gợi ý truyện dựa trên sở thích đọc hiện tại của bạn.");
  };

  return (
    <AppShell activeId="s04">
      {/* SECTION: HERO / BANNER TRUYỆN NỔI BẬT */}
      <section className="home-hero">
        <Link className="home-featured" href="/story-detail">
          <div className="home-featured-copy">
            <span className="badge badge-crimson">Đang được đọc nhiều</span>
            <h2>Mưa Trên Thành Cũ</h2>
            <p>Một bí mật bị giấu trong những bức thư cũ kéo hai con người trở lại thành phố sau chiến tranh.</p>
            <div className="home-featured-stats">
              <span>72 chương</span>
              <span>4.9 ★</span>
              <span>1.2M lượt đọc</span>
            </div>
            <span className="button button-primary" style={{ width: "fit-content" }}>Đọc tiếp</span>
          </div>
          <div className="home-featured-cover">
            <Cover index={0} />
          </div>
        </Link>

        {/* CỘT PHẢI: TRUYỆN ĐANG ĐỌC DỞ */}
        <aside className="panel panel-pad stack home-continue">
          <div className="home-section-head">
            <h2 className="section-title">Đọc tiếp</h2>
            <Link href="/library" className="section-link">
              Thư viện
            </Link>
          </div>
          {continueReadingStories.map((story, index) => (
            <ReadingCard story={story} index={index} key={story.title} />
          ))}
        </aside>
      </section>

      {/* STRIP: GỢI Ý CÁ NHÂN HÓA */}
      <section className="action-strip" style={{ margin: "24px 0" }}>
        <div>
          <strong>Gu đọc hôm nay</strong>
          <div className="list-meta">
            YAG ưu tiên truyện lịch sử, trinh thám nhẹ và tác giả đăng đều trong tuần này
            {suggestionRefreshedCount > 0 ? ` · đã làm mới ${suggestionRefreshedCount} lần` : ""}.
          </div>
        </div>
        <button
          className="button"
          type="button"
          onClick={handleRefreshSuggestions}
        >
          Làm mới gợi ý
        </button>
      </section>

      {/* GRID LAYOUT CHÍNH CỦA TRANG CHỦ */}
      <section className="home-layout">
        <main className="stack">
          {/* SECTION: DÀNH CHO BẠN */}
          <section className="panel panel-pad stack">
            <div className="home-section-head">
              <h2 className="section-title">Dành cho bạn</h2>
              <Link href="/discover" className="section-link">
                Xem thêm
              </Link>
            </div>
            <QuickStories count={12} />
          </section>

          {/* SECTION: MỚI CẬP NHẬT */}
          <section className="panel panel-pad stack">
            <div className="home-section-head">
              <h2 className="section-title">Mới cập nhật</h2>
              <Link href="/discover" className="section-link">
                Tất cả truyện mới
              </Link>
            </div>
            <div className="update-list">
              {stories.slice(8, 14).map((story, index) => (
                <UpdateStoryRow story={story} index={index + 8} key={story.title} />
              ))}
            </div>
          </section>
        </main>

        <aside className="stack">
          {/* CỘT PHẢI: BẢNG XẾP HẠNG HẰNG NGÀY */}
          <section className="panel panel-pad stack">
            <div className="home-section-head">
              <h2 className="section-title">BXH hôm nay</h2>
              <Link href="/discover" className="section-link">
                Chi tiết
              </Link>
            </div>
            <div className="ranking-list">
              {stories.slice(0, 6).map((story, index) => (
                <RankingItem story={story} index={index} key={story.title} />
              ))}
            </div>
          </section>

          {/* CỘT PHẢI: THỂ LOẠI NỔI BẬT */}
          <section className="panel panel-pad stack">
            <h2 className="section-title">Thể loại nổi bật</h2>
            <div className="genre-strip">
              {[
                "Ngôn tình",
                "Trinh thám",
                "Khoa học viễn tưởng",
                "Huyền huyễn",
                "Chữa lành",
                "Cổ trang",
                "Phiêu lưu",
                "Kỳ ảo",
              ].map((item) => (
                <button
                  key={item}
                  className={`pill ${suggestedGenre === item ? "active" : ""}`}
                  onClick={() => setSuggestedGenre(item)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
          </section>
        </aside>
      </section>

      {/* Thông báo Toast */}
      {toastMessage && (
        <div className="toast-stack">
          <div className="toast toast-success">{toastMessage}</div>
        </div>
      )}
    </AppShell>
  );
}
