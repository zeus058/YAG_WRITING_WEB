"use client";

import Link from "next/link";
import React, { useState, useEffect, useRef } from "react";
import { BrandLogo, Cover, getStoryAuthorName, Icon } from "@/components/ui";
import { yagApi } from "@/lib";

/**
 * Component bọc hỗ trợ hiệu ứng hiển thị khi cuộn trang (Reveal on Scroll)
 */
function RevealOnScroll({
  children,
  delayClass = "",
}: {
  children: React.ReactNode;
  delayClass?: string;
}) {
  const domRef = useRef<HTMLDivElement>(null);
  const [isVisible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    const currentEl = domRef.current;
    if (currentEl) {
      observer.observe(currentEl);
    }

    return () => {
      if (currentEl) observer.unobserve(currentEl);
    };
  }, []);

  return (
    <div
      ref={domRef}
      className={`reveal ${isVisible ? "visible" : ""} ${delayClass}`}
    >
      {children}
    </div>
  );
}

/**
 * Component hiển thị bìa sách dạng 3D floating có liên kết thực tế với câu chuyện người dùng
 */
function HeroBookCard({
  className,
  story,
  fallbackSvg,
  defaultTitle,
  defaultAuthor,
}: {
  className: string;
  story?: any;
  fallbackSvg: React.ReactNode;
  defaultTitle: string;
  defaultAuthor: string;
}) {
  const title = story ? story.title : defaultTitle;
  const author = story ? getStoryAuthorName(story) : defaultAuthor;

  const content = (
    <div className={`book-card ${className}`}>
      {story && story.cover_url ? (
        <div className="book-cover-img-wrap" style={{ width: "200px", height: "260px", overflow: "hidden", position: "relative" }}>
          <img
            src={story.cover_url}
            alt={title}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </div>
      ) : (
        fallbackSvg
      )}
      <div className="book-meta">
        <div className="book-title-sm" title={title}>
          {title}
        </div>
        <div className="book-author-sm" title={author}>
          {author}
        </div>
      </div>
    </div>
  );

  return (
    <Link href={story ? `/stories/${story.id}` : "/discover"} style={{ textDecoration: "none" }}>
      {content}
    </Link>
  );
}

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [stories, setStories] = useState<any[]>([]);
  const [loadingStories, setLoadingStories] = useState(true);

  // === Fetch stories from backend ===
  useEffect(() => {
    let active = true;
    async function fetchStories() {
      try {
        const res = await yagApi.reader.listStories();
        if (active) {
          setStories(res.data || []);
        }
      } catch (err) {
        console.error("Error fetching stories:", err);
      } finally {
        if (active) {
          setLoadingStories(false);
        }
      }
    }
    fetchStories();
    return () => {
      active = false;
    };
  }, []);

  const storiesScrollRef = useRef<HTMLDivElement>(null);
  const [isDraggingStories, setIsDraggingStories] = useState(false);
  const [storiesStartX, setStoriesStartX] = useState(0);
  const [storiesScrollLeft, setStoriesScrollLeft] = useState(0);

  const handleStoriesMouseDown = (e: React.MouseEvent) => {
    if (!storiesScrollRef.current) return;
    setIsDraggingStories(true);
    setStoriesStartX(e.pageX - storiesScrollRef.current.offsetLeft);
    setStoriesScrollLeft(storiesScrollRef.current.scrollLeft);
  };

  const handleStoriesMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingStories || !storiesScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - storiesScrollRef.current.offsetLeft;
    const walk = (x - storiesStartX) * 1.5;
    storiesScrollRef.current.scrollLeft = storiesScrollLeft - walk;
  };

  const handleStoriesMouseUpOrLeave = () => {
    setIsDraggingStories(false);
  };

  // === Xử lý hiệu ứng Navbar khi cuộn trang ===
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 60) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }

      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        setScrollProgress((window.scrollY / totalScroll) * 100);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // === Logic của Slider Tính Năng (Feature Slider) ===
  const sliderRef = useRef<HTMLDivElement>(null);
  const [sliderIndex, setSliderIndex] = useState(0);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartScroll, setDragStartScroll] = useState(0);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const [visibleCards, setVisibleCards] = useState(3);

  const cardW = 340 + 24; // Width + gap
  const totalCardsCount = 6;

  // Tính số card hiển thị dựa trên kích thước màn hình
  useEffect(() => {
    const updateVisibleCards = () => {
      if (!sliderRef.current) return;
      const width = sliderRef.current.parentElement?.offsetWidth || 1200;
      const count = Math.floor(width / (340 + 24)) || 1;
      setVisibleCards(count);
    };
    updateVisibleCards();
    window.addEventListener("resize", updateVisibleCards);
    return () => window.removeEventListener("resize", updateVisibleCards);
  }, []);

  const totalSlides = Math.max(1, totalCardsCount - visibleCards + 1);

  const goToSlide = (idx: number) => {
    const safeIdx = Math.max(0, Math.min(idx, totalSlides - 1));
    setSliderIndex(safeIdx);
  };

  // Tự động chuyển slide
  useEffect(() => {
    if (isDraggingSlider) return;
    const timer = setInterval(() => {
      setSliderIndex((prev) => (prev < totalSlides - 1 ? prev + 1 : 0));
    }, 3800);
    return () => clearInterval(timer);
  }, [totalSlides, isDraggingSlider]);

  // Kéo chuột cho Slider
  const handleSliderMouseDown = (e: React.MouseEvent) => {
    setIsDraggingSlider(true);
    setDragStartX(e.pageX);
    setDragStartScroll(sliderIndex * cardW);
    e.preventDefault();
  };

  const handleSliderMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingSlider) return;
    const diff = dragStartX - e.pageX;
    const newIdx = Math.round((dragStartScroll + diff) / cardW);
    goToSlide(newIdx);
  };

  const handleSliderMouseUpOrLeave = () => {
    setIsDraggingSlider(false);
  };

  return (
    <div className="landing-page bg-[#41503D] min-h-screen text-white font-sans overflow-x-hidden">
      {/* Scroll indicator progress bar */}
      <div
        className="scroll-progress-bar"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          height: "3px",
          backgroundColor: "var(--crimson)",
          width: `${scrollProgress}%`,
          zIndex: 1000,
          transition: "width 0.1s ease-out"
        }}
      />

      {/* ═══════════ NAVBAR ═══════════ */}
      <nav id="mainNav" className={isScrolled ? "scrolled" : ""}>
        <Link className="logo" href="/" style={{ textDecoration: "none" }}>
          <BrandLogo />
        </Link>
        {/* Nav links removed for Landing Page per BUG-LP-001 */}
        <div className="nav-actions">
          <Link className="btn-nav-ghost" href="/auth?tab=login">Đăng nhập</Link>
          <Link className="btn-nav-cta" href="/auth?tab=register">Đăng ký miễn phí</Link>
        </div>
      </nav>

      {/* ═══════════ HERO ═══════════ */}
      <section className="hero" id="hero">
        <div className="hero-bg">
          <div className="orb orb1"></div>
          <div className="orb orb2"></div>
          <div className="orb orb3"></div>
          {/* Ambient micro-particles (fireflies) */}
          <div className="particle" style={{ left: "10%", animationDelay: "0s", animationDuration: "5.5s", width: "4px", height: "4px" }}></div>
          <div className="particle" style={{ left: "28%", animationDelay: "1.2s", animationDuration: "7s", width: "3px", height: "3px" }}></div>
          <div className="particle" style={{ left: "45%", animationDelay: "2.5s", animationDuration: "6s", width: "5px", height: "5px" }}></div>
          <div className="particle" style={{ left: "62%", animationDelay: "0.8s", animationDuration: "8s", width: "3px", height: "3px" }}></div>
          <div className="particle" style={{ left: "78%", animationDelay: "3.2s", animationDuration: "5.2s", width: "4px", height: "4px" }}></div>
          <div className="particle" style={{ left: "90%", animationDelay: "1.7s", animationDuration: "6.8s", width: "2px", height: "2px" }}></div>
          <div className="particle" style={{ left: "18%", animationDelay: "4s", animationDuration: "7.5s", width: "3.5px", height: "3.5px" }}></div>
          <div className="particle" style={{ left: "55%", animationDelay: "2.8s", animationDuration: "4.8s", width: "4px", height: "4px" }}></div>
          <div className="hero-bg-text">YAG</div>
        </div>

        <div className="hero-inner">
          {/* Cột trái */}
          <div className="hero-left">
            <div className="hero-eyebrow">
              <div className="eyebrow-dot"></div>
              Nền tảng đọc & viết với AI đồng hành
            </div>
            <h1 className="hero-title">
              Nơi mọi
              <br />
              <em>câu chuyện</em>
              <br />
              bắt đầu hành trình
            </h1>
            <p className="hero-sub">
              Khám phá tác phẩm do cộng đồng đăng tải, viết cùng trợ lý AI
              Gemini, tìm kiếm ngữ nghĩa thông minh — tất cả trong một nền tảng
              dành cho người Việt.
            </p>
            <div className="hero-btns">
              <Link className="btn-primary" href="/auth?tab=register">
                <svg
                  style={{
                    width: "16px",
                    height: "16px",
                    fill: "none",
                    stroke: "currentColor",
                    strokeWidth: 2,
                    strokeLinecap: "round",
                  }}
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="10,8 16,12 10,16" fill="white" stroke="none" />
                </svg>
                Bắt đầu miễn phí
              </Link>
              <Link className="btn-ghost" href="/author/stories">
                Tôi muốn viết truyện
                <svg
                  style={{
                    width: "16px",
                    height: "16px",
                    fill: "none",
                    stroke: "currentColor",
                    strokeWidth: 2,
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                  }}
                  viewBox="0 0 24 24"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>
            </div>
            <div className="hero-stats">
              <div>
                <div className="stat-val">Live</div>
                <div className="stat-key">Tác phẩm chất lượng</div>
              </div>
              <div>
                <div className="stat-val">AI</div>
                <div className="stat-key">Tìm kiếm ngữ nghĩa</div>
              </div>
              <div>
                <div className="stat-val">PayOS</div>
                <div className="stat-key">Đăng ký Premium</div>
              </div>
            </div>
          </div>

          {/* Cột phải: Book mockup visual */}
          <div className="hero-visual">
            <div className="book-stack">
              {/* Book 3 (back) */}
              <HeroBookCard
                className="bc3"
                story={stories[2]}
                defaultTitle="Tác phẩm cộng đồng"
                defaultAuthor="Đăng bởi người dùng"
                fallbackSvg={
                  <svg
                    viewBox="0 0 200 260"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ width: "200px", height: "260px", display: "block" }}
                  >
                    <defs>
                      <linearGradient id="bg3" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{ stopColor: "#0a1628" }} />
                        <stop offset="100%" style={{ stopColor: "#1a4a7a" }} />
                      </linearGradient>
                    </defs>
                    <rect width="200" height="260" fill="url(#bg3)" />
                    <circle
                      cx="100"
                      cy="110"
                      r="55"
                      fill="none"
                      stroke="rgba(255,255,255,.08)"
                      strokeWidth="1"
                    />
                    <path
                      d="M70,90 Q100,60 130,90 Q100,120 70,90Z"
                      fill="rgba(59,130,246,.3)"
                    />
                  </svg>
                }
              />

              {/* Book 2 (middle) */}
              <HeroBookCard
                className="bc2"
                story={stories[1]}
                defaultTitle="Không gian đọc"
                defaultAuthor="Hành trình sáng tạo mới"
                fallbackSvg={
                  <svg
                    viewBox="0 0 200 260"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ width: "200px", height: "260px", display: "block" }}
                  >
                    <defs>
                      <linearGradient id="bg2" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{ stopColor: "#051a0a" }} />
                        <stop offset="100%" style={{ stopColor: "#1a6b3a" }} />
                      </linearGradient>
                    </defs>
                    <rect width="200" height="260" fill="url(#bg2)" />
                    <ellipse
                      cx="100"
                      cy="120"
                      rx="40"
                      ry="55"
                      fill="none"
                      stroke="rgba(255,255,255,.1)"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M80,100 C90,80 110,80 120,100 C110,130 90,130 80,100Z"
                      fill="rgba(34,197,94,.25)"
                    />
                    <line
                      x1="60"
                      y1="170"
                      x2="140"
                      y2="170"
                      stroke="rgba(255,255,255,.1)"
                      strokeWidth="1"
                    />
                    <line
                      x1="70"
                      y1="185"
                      x2="130"
                      y2="185"
                      stroke="rgba(255,255,255,.07)"
                      strokeWidth="1"
                    />
                  </svg>
                }
              />

              {/* Book 1 (front) */}
              <HeroBookCard
                className="bc1"
                story={stories[0]}
                defaultTitle="YAG Stories"
                defaultAuthor="User Content"
                fallbackSvg={
                  <svg
                    viewBox="0 0 200 260"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ width: "200px", height: "260px", display: "block" }}
                  >
                    <defs>
                      <linearGradient id="bg1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{ stopColor: "#12023a" }} />
                        <stop offset="100%" style={{ stopColor: "#4a1080" }} />
                      </linearGradient>
                      <radialGradient id="glow1" cx="50%" cy="45%" r="40%">
                        <stop
                          offset="0%"
                          style={{ stopColor: "rgba(200,28,48,.6)" }}
                        />
                        <stop offset="100%" style={{ stopColor: "transparent" }} />
                      </radialGradient>
                    </defs>
                    <rect width="200" height="260" fill="url(#bg1)" />
                    <ellipse
                      cx="100"
                      cy="115"
                      rx="60"
                      ry="70"
                      fill="url(#glow1)"
                      opacity=".6"
                    />
                    {/* Sword silhouette */}
                    <rect
                      x="98"
                      y="40"
                      width="4"
                      height="120"
                      rx="2"
                      fill="rgba(255,236,206,.6)"
                    />
                    <rect
                      x="80"
                      y="120"
                      width="40"
                      height="3"
                      rx="1.5"
                      fill="rgba(254,189,178,.5)"
                    />
                    <polygon
                      points="100,35 95,55 105,55"
                      fill="rgba(255,236,206,.8)"
                    />
                    <rect
                      x="97"
                      y="160"
                      width="6"
                      height="30"
                      rx="3"
                      fill="rgba(254,189,178,.4)"
                    />
                    {/* Stars */}
                    <circle cx="60" cy="60" r="1.5" fill="rgba(255,255,255,.5)" />
                    <circle cx="150" cy="80" r="1" fill="rgba(255,255,255,.4)" />
                    <circle cx="40" cy="160" r="1" fill="rgba(255,255,255,.3)" />
                    <circle cx="165" cy="140" r="2" fill="rgba(255,255,255,.35)" />
                    {/* Title */}
                    <text
                      x="100"
                      y="220"
                      textAnchor="middle"
                      fontFamily="serif"
                      fontSize="13"
                      fill="rgba(255,236,206,.9)"
                      fontStyle="italic"
                    >
                      YAG Stories
                    </text>
                    <text
                      x="100"
                      y="238"
                      textAnchor="middle"
                      fontFamily="sans-serif"
                      fontSize="9"
                      fill="rgba(255,255,255,.4)"
                      letterSpacing="1"
                    >
                      User Content
                    </text>
                  </svg>
                }
              />

              {/* Floating badges */}
              <div className="float-badge">✦ AI Đề xuất</div>
              <div className="float-badge2">Đọc & viết thông minh</div>
            </div>
          </div>
        </div>

        <div className="scroll-cue">
          <span>Cuộn xuống</span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </div>
      </section>

      {/* Wave hero → petal */}
      <div className="wave-block" style={{ backgroundColor: "var(--jungle)" }}>
        <svg viewBox="0 0 1440 72" preserveAspectRatio="none" style={{ height: "72px" }}>
          <path
            d="M0,72 C200,20 400,60 600,35 C800,10 1000,55 1200,30 C1320,15 1380,40 1440,28 L1440,72Z"
            fill="#FFECCE"
          />
        </svg>
      </div>

      {/* ═══════════ FEATURES SLIDER ═══════════ */}
      <section className="section section-features">
        <div className="sec-wrap">
          <RevealOnScroll>
            <div className="sec-header">
              <div className="sec-label">✦ Tính năng nổi bật</div>
              <h2 className="sec-title">
                Mọi thứ bạn cần để
                <br />
                <em>đọc & viết</em> tốt hơn
              </h2>
              <p className="sec-desc">
                Từ không gian đọc tĩnh lặng đến studio sáng tác thông minh – YAG
                đồng hành cùng bạn.
              </p>
            </div>
          </RevealOnScroll>

          <RevealOnScroll>
            <div className="feat-slider-wrap">
              <div
                className={`feat-slider ${isDraggingSlider ? "dragging" : ""}`}
                ref={sliderRef}
                style={{
                  transform: `translateX(-${sliderIndex * cardW}px)`,
                }}
                onMouseDown={handleSliderMouseDown}
                onMouseMove={handleSliderMouseMove}
                onMouseUp={handleSliderMouseUpOrLeave}
                onMouseLeave={handleSliderMouseUpOrLeave}
              >
                {/* Card 1: Reader Mode */}
                <div className="feat-card">
                  <div
                    className="feat-icon-area"
                    style={{
                      background: "linear-gradient(135deg,#FFECCE,#f5dba8)",
                    }}
                  >
                    {/* Hand-drawn open book styling */}
                    <svg viewBox="0 0 100 100" style={{ width: "90px", height: "90px" }} fill="none" stroke="#41503D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M50,85 C35,80 20,85 10,85 L10,25 C20,25 35,20 50,25 Z" fill="rgba(255,255,255,0.7)" />
                      <path d="M50,85 C65,80 80,85 90,85 L90,25 C80,25 65,20 50,25 Z" fill="rgba(255,255,255,0.7)" />
                      <line x1="50" y1="25" x2="50" y2="85" />
                      <line x1="20" y1="40" x2="40" y2="40" strokeWidth="1.5" />
                      <line x1="20" y1="52" x2="35" y2="52" strokeWidth="1.5" />
                      <line x1="20" y1="64" x2="40" y2="64" strokeWidth="1.5" />
                      <line x1="60" y1="40" x2="80" y2="40" strokeWidth="1.5" />
                      <line x1="60" y1="52" x2="75" y2="52" strokeWidth="1.5" />
                      <line x1="60" y1="64" x2="80" y2="64" strokeWidth="1.5" />
                      <circle cx="50" cy="15" r="6" fill="#F59E0B" stroke="#41503D" strokeWidth="1.5" />
                      <line x1="50" y1="5" x2="50" y2="8" strokeWidth="1.5" />
                      <line x1="43" y1="10" x2="40" y2="8" strokeWidth="1.5" />
                      <line x1="57" y1="10" x2="60" y2="8" strokeWidth="1.5" />
                    </svg>
                  </div>
                  <div className="feat-title">Reader Mode</div>
                  <p className="feat-desc">
                    Không gian đọc thuần tuý, tự động ẩn mọi phần gây phân tâm. Tuỳ
                    chỉnh font, nền sáng/tối/sepia. Tối ưu cho mọi thiết bị.
                  </p>
                  <div className="feat-tag">
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      style={{ width: "12px", height: "12px" }}
                    >
                      <circle cx="8" cy="8" r="6" />
                      <path d="M8 5v3l2 2" />
                    </svg>
                    Bảo vệ mắt
                  </div>
                </div>

                {/* Card 2: AI Writing */}
                <div className="feat-card">
                  <div
                    className="feat-icon-area"
                    style={{
                      background: "linear-gradient(135deg,#f0f4ff,#dbe8ff)",
                    }}
                  >
                    {/* Hand-drawn pencil and paper */}
                    <svg viewBox="0 0 100 100" style={{ width: "90px", height: "90px" }} fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="25" y="15" width="50" height="70" rx="4" fill="rgba(255,255,255,0.7)" />
                      <line x1="35" y1="30" x2="65" y2="30" strokeWidth="1.5" opacity="0.6" />
                      <line x1="35" y1="42" x2="65" y2="42" strokeWidth="1.5" opacity="0.6" />
                      <line x1="35" y1="54" x2="55" y2="54" strokeWidth="1.5" opacity="0.6" />
                      <g transform="rotate(-30 65 65)">
                        <path d="M55,30 L65,30 L65,80 L55,80 Z" fill="#F59E0B" stroke="#3B82F6" />
                        <polygon points="55,80 65,80 60,90" fill="#FFECCE" stroke="#3B82F6" />
                        <polygon points="58,86 62,86 60,90" fill="#3B82F6" />
                      </g>
                      <path d="M15,25 Q20,25 20,20 Q20,25 25,25 Q20,25 20,30 Q20,25 15,25 Z" fill="#F59E0B" stroke="none" />
                      <path d="M80,45 Q83,45 83,42 Q83,45 86,45 Q83,45 83,48 Q83,45 80,45 Z" fill="#F59E0B" stroke="none" />
                    </svg>
                  </div>
                  <div className="feat-title">AI Đồng hành viết</div>
                  <p className="feat-desc">
                    Trợ lý Gemini gợi ý tình tiết ngay trong editor, phân tích ngữ
                    cảnh 1000 từ để đưa ra ý tưởng phù hợp nhất với câu chuyện của
                    bạn.
                  </p>
                  <div
                    className="feat-tag"
                    style={{ background: "rgba(59,130,246,.08)", color: "#3B82F6" }}
                  >
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      style={{ width: "12px", height: "12px" }}
                    >
                      <path d="M12 3L9.5 8 12 13H4L6.5 8 4 3h8z" />
                    </svg>
                    Powered by Gemini
                  </div>
                </div>

                {/* Card 3: AI Search */}
                <div className="feat-card">
                  <div
                    className="feat-icon-area"
                    style={{
                      background: "linear-gradient(135deg,#fff0f5,#ffd6e0)",
                    }}
                  >
                    {/* Hand-drawn magnifying glass and nodes */}
                    <svg viewBox="0 0 100 100" style={{ width: "90px", height: "90px" }} fill="none" stroke="#C81C30" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="25" cy="25" r="5" fill="#FFECCE" stroke="#C81C30" />
                      <circle cx="75" cy="30" r="5" fill="#FFECCE" stroke="#C81C30" />
                      <circle cx="35" cy="70" r="5" fill="#FFECCE" stroke="#C81C30" />
                      <line x1="29" y1="26" x2="71" y2="29" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.6" />
                      <line x1="27" y1="29" x2="33" y2="66" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.6" />
                      <circle cx="55" cy="45" r="16" fill="rgba(255,255,255,0.7)" stroke="#C81C30" />
                      <line x1="66" y1="56" x2="85" y2="75" strokeWidth="4" />
                      <path d="M48,40 L50,42 L48,44 L46,42 Z" fill="#C81C30" stroke="none" />
                    </svg>
                  </div>
                  <div className="feat-title">Tìm kiếm ngữ nghĩa</div>
                  <p className="feat-desc">
                    Không cần nhớ tên truyện. Chỉ cần mô tả cảm xúc hay bối cảnh –
                    AI Vector Search sẽ tìm đúng tác phẩm bạn muốn đọc.
                  </p>
                  <div className="feat-tag">
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      style={{ width: "12px", height: "12px" }}
                    >
                      <circle cx="8" cy="8" r="3" />
                      <path d="M8 1v2M8 13v2M1 8h2M13 8h2" />
                    </svg>
                    Vector Search
                  </div>
                </div>

                {/* Card 4: Forum */}
                <div className="feat-card">
                  <div
                    className="feat-icon-area"
                    style={{
                      background: "linear-gradient(135deg,#f0fff4,#d1fae5)",
                    }}
                  >
                    {/* Hand-drawn chat bubbles */}
                    <svg viewBox="0 0 100 100" style={{ width: "90px", height: "90px" }} fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20,50 C20,35 35,25 50,25 C65,25 75,32 75,45 C75,55 65,65 55,65 C52,65 48,68 45,71 L45,65 C30,65 20,60 20,50 Z" fill="rgba(255,255,255,0.7)" />
                      <path d="M45,65 C45,58 52,53 62,53 C72,53 80,58 80,65 C80,72 72,77 67,77 L67,82 C65,80 62,77 60,77 C50,77 45,72 45,65 Z" fill="#D1FAE5" />
                      <circle cx="40" cy="45" r="2" fill="#22C55E" stroke="none" />
                      <circle cx="50" cy="45" r="2" fill="#22C55E" stroke="none" />
                      <circle cx="60" cy="45" r="2" fill="#22C55E" stroke="none" />
                      <circle cx="85" cy="20" r="5" fill="#EF4444" stroke="#FFF" strokeWidth="1.5">
                        <animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />
                      </circle>
                    </svg>
                  </div>
                  <div className="feat-title">Diễn đàn Real-time</div>
                  <p className="feat-desc">
                    Thảo luận cùng tác giả và độc giả ngay dưới mỗi chương. Bình
                    luận cập nhật tức thì qua WebSocket, không cần tải lại trang.
                  </p>
                  <div
                    className="feat-tag"
                    style={{ background: "rgba(34,197,94,.08)", color: "#22C55E" }}
                  >
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      style={{ width: "12px", height: "12px" }}
                    >
                      <circle cx="8" cy="8" r="3" />
                      <path d="M8 2a6 6 0 1 1 0 12" />
                    </svg>
                    WebSocket Live
                  </div>
                </div>

                {/* Card 5: AI Moderation */}
                <div className="feat-card">
                  <div
                    className="feat-icon-area"
                    style={{
                      background: "linear-gradient(135deg,#fff8f0,#fde8cc)",
                    }}
                  >
                    {/* Hand-drawn shield and checkmark */}
                    <svg viewBox="0 0 100 100" style={{ width: "90px", height: "90px" }} fill="none" stroke="#C81C30" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M50,15 L80,25 L80,55 C80,75 50,85 50,85 C50,85 20,75 20,55 L20,25 Z" fill="rgba(255,255,255,0.7)" />
                      <path d="M38,48 L46,56 L62,38" stroke="#22C55E" strokeWidth="4" />
                      <path d="M50,10 L52,15 L57,15 L53,18 L55,23 L50,20 L45,23 L47,18 L43,15 L48,15 Z" fill="#F59E0B" stroke="none" />
                    </svg>
                  </div>
                  <div className="feat-title">AI Kiểm duyệt</div>
                  <p className="feat-desc">
                    Hệ thống tự động lọc nội dung không phù hợp bằng Gemini AI, bảo
                    vệ cộng đồng và đảm bảo môi trường đọc lành mạnh 24/7.
                  </p>
                  <div
                    className="feat-tag"
                    style={{ background: "rgba(245,158,11,.08)", color: "#F59E0B" }}
                  >
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      style={{ width: "12px", height: "12px" }}
                    >
                      <path d="M12 2H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" />
                      <path d="m5 7 2 2 4-4" />
                    </svg>
                    Content Safety
                  </div>
                </div>

                {/* Card 6: Membership */}
                <div className="feat-card">
                  <div
                    className="feat-icon-area"
                    style={{
                      background: "linear-gradient(135deg,#fdf4ff,#ede0ff)",
                    }}
                  >
                    {/* Hand-drawn crown and PayOS card */}
                    <svg viewBox="0 0 100 100" style={{ width: "90px", height: "90px" }} fill="none" stroke="#8B5CF6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="18" y="32" width="64" height="42" rx="6" fill="rgba(255,255,255,0.7)" />
                      <line x1="26" y1="42" x2="38" y2="42" strokeWidth="3" opacity="0.7" />
                      <rect x="26" y="52" width="48" height="12" rx="2" fill="#EDE0FF" stroke="#8B5CF6" strokeWidth="1.5" />
                      <text x="50" y="61" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#8B5CF6" stroke="none" fontFamily="sans-serif">PayOS</text>
                      <path d="M35,32 L40,20 L50,28 L60,20 L65,32 Z" fill="#F59E0B" stroke="#8B5CF6" />
                      <circle cx="40" cy="18" r="2" fill="#8B5CF6" stroke="none" />
                      <circle cx="50" cy="26" r="2" fill="#8B5CF6" stroke="none" />
                      <circle cx="60" cy="18" r="2" fill="#8B5CF6" stroke="none" />
                    </svg>
                  </div>
                  <div className="feat-title">Membership</div>
                  <p className="feat-desc">
                    Mở khoá toàn bộ chương premium, ủng hộ tác giả yêu thích. Thanh
                    toán an toàn qua PayOS, 3 gói linh hoạt.
                  </p>
                  <div
                    className="feat-tag"
                    style={{ background: "rgba(139,92,246,.08)", color: "#8B5CF6" }}
                  >
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      style={{ width: "12px", height: "12px" }}
                    >
                      <rect x="1" y="4" width="14" height="10" rx="2" />
                      <path d="M1 8h14" />
                    </svg>
                    Thanh toán PayOS
                  </div>
                </div>
              </div>

              {/* Slider Controls */}
              <div className="slider-controls">
                <button
                  className="slider-btn"
                  onClick={() => goToSlide(sliderIndex - 1)}
                  aria-label="Trước"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                <div className="slider-dots">
                  {Array.from({ length: totalSlides }).map((_, i) => (
                    <button
                      key={i}
                      className={`slider-dot ${sliderIndex === i ? "active" : ""}`}
                      onClick={() => goToSlide(i)}
                      aria-label={`Slide ${i + 1}`}
                    ></button>
                  ))}
                </div>
                <button
                  className="slider-btn"
                  onClick={() => goToSlide(sliderIndex + 1)}
                  aria-label="Tiếp"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* Wave petal → jungle */}
      <div className="wave-block" style={{ backgroundColor: "var(--petal)" }}>
        <svg viewBox="0 0 1440 72" preserveAspectRatio="none" style={{ height: "72px" }}>
          <path
            d="M0,0 C360,72 720,0 1080,55 C1260,80 1380,15 1440,40 L1440,72 L0,72Z"
            fill="#41503D"
          />
        </svg>
      </div>

      {/* ═══════════ STORIES ═══════════ */}
      <section className="section section-stories">
        <div className="sec-wrap">
          <RevealOnScroll>
            <div className="sec-header">
              <div className="sec-header-text">
                <div className="sec-label">✦ Tác phẩm cộng đồng</div>
                <h2 className="sec-title">
                  Khám phá kho tàng
                  <br />
                  <em>truyện cộng đồng</em>
                </h2>
                <p className="sec-desc">
                  Hàng nghìn câu chuyện từ các tác giả tài năng — từ kiếm hiệp, kỳ
                  ảo đến lãng mạn. Mỗi tác phẩm được kiểm duyệt bởi AI Gemini
                  trước khi đến tay độc giả.
                </p>
              </div>
              <Link className="btn-see-all" href="/discover">
                Khám phá →
              </Link>
            </div>
          </RevealOnScroll>

          {loadingStories ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "200px" }}>
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-t-transparent border-[#FEBDB2]"></div>
            </div>
          ) : stories.length === 0 ? (
            <div className="sec-desc" style={{ textAlign: "center", margin: "40px auto", color: "rgba(255, 255, 255, 0.6)" }}>
              Chưa có truyện nào được xuất bản. Hãy là người đầu tiên sáng tác!
            </div>
          ) : (
            <div
              ref={storiesScrollRef}
              className={`stories-scroll ${isDraggingStories ? "dragging" : ""}`}
              onMouseDown={handleStoriesMouseDown}
              onMouseMove={handleStoriesMouseMove}
              onMouseUp={handleStoriesMouseUpOrLeave}
              onMouseLeave={handleStoriesMouseUpOrLeave}
            >
              {stories.map((story, index) => {
                const badgeClass = story.badge || (story.view_count > 1000 ? "hot" : story.rating_avg >= 4.5 ? "ai" : "");
                const badgeLabel = story.badge === "hot" ? "Đang hot" : story.badge === "ai" ? "AI đề xuất" : story.badge === "done" ? "Hoàn thành" : (story.view_count > 1000 ? "Đang hot" : "");
                
                return (
                  <Link
                    href={`/stories/${story.id}`}
                    key={story.id}
                    className="s-card"
                    style={{ textDecoration: "none" }}
                  >
                    <div className="s-cover">
                      <Cover index={index} coverUrl={story.cover_url} />
                      {badgeLabel && (
                        <span className={`s-badge ${badgeClass}`}>
                          {badgeLabel}
                        </span>
                      )}
                    </div>
                    <div className="s-info">
                      <div className="s-genre">{story.category || story.genre || "Truyện"}</div>
                      <h3 className="s-name" title={story.title} style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}>
                        {story.title}
                      </h3>
                      <div className="s-author">{getStoryAuthorName(story)}</div>
                      <div className="s-stats">
                        <span className="s-stat" style={{ display: "inline-flex", alignItems: "center", gap: "2px" }}>
                          <Icon name="book" className="!w-3 !h-3" />
                          {story.chapter_count || 0}c
                        </span>
                        <span className="s-stat" style={{ display: "inline-flex", alignItems: "center", gap: "2px" }}>
                          ★ {Number(story.rating_avg || 0).toFixed(1)}
                        </span>
                        <span className="s-stat" style={{ display: "inline-flex", alignItems: "center", gap: "2px" }}>
                          {(story.view_count >= 1000 ? `${(story.view_count / 1000).toFixed(0)}K` : story.view_count) || 0} đọc
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Wave jungle → ink */}
      <div className="wave-block" style={{ backgroundColor: "var(--jungle)" }}>
        <svg viewBox="0 0 1440 72" preserveAspectRatio="none" style={{ height: "72px" }}>
          <path d="M0,72 C480,10 960,60 1440,20 L1440,72Z" fill="#2b3328" />
        </svg>
      </div>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section className="section section-how">
        <div className="sec-wrap">
          <RevealOnScroll>
            <div className="sec-header">
              <div className="sec-label">✦ Cách hoạt động</div>
              <h2 className="sec-title" style={{ color: "#fff" }}>
                Chỉ 3 bước để bắt đầu
                <br />
                <em style={{ color: "var(--coral)" }}>hành trình</em> của bạn
              </h2>
              <p className="sec-desc">
                Đơn giản, nhanh chóng và hoàn toàn miễn phí để bắt đầu.
              </p>
            </div>
          </RevealOnScroll>

          <div className="how-grid">
            {/* Custom animated SVG journey line connector */}
            <div className="how-connector" style={{ background: "none", height: "auto", top: "24px" }}>
              <svg width="100%" height="20" viewBox="0 0 600 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: "visible" }}>
                <defs>
                  <linearGradient id="arrowGrad" x1="0" y1="0" x2="600" y2="0" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="rgba(254, 189, 178, 0.1)" />
                    <stop offset="30%" stopColor="rgba(254, 189, 178, 0.8)" />
                    <stop offset="70%" stopColor="rgba(254, 189, 178, 0.8)" />
                    <stop offset="100%" stopColor="rgba(254, 189, 178, 0.1)" />
                  </linearGradient>
                </defs>
                <path
                  d="M 10,10 Q 150,0 300,10 T 590,10"
                  stroke="url(#arrowGrad)"
                  strokeWidth="2"
                  strokeDasharray="6,6"
                  strokeLinecap="round"
                  fill="none"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    values="120;0"
                    dur="6s"
                    repeatCount="indefinite"
                  />
                </path>
              </svg>
            </div>
            <div className="how-step">
              <RevealOnScroll delayClass="reveal-delay-1">
                <div className="step-circle">
                  <div className="step-num-tag">1</div>
                  <svg viewBox="0 0 24 24">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div className="step-name">Tạo tài khoản</div>
                <p className="step-text">
                  Đăng ký miễn phí trong vòng 30 giây. Không cần thẻ tín dụng,
                  không cần xác minh phức tạp.
                </p>
              </RevealOnScroll>
            </div>

            <div className="how-step">
              <RevealOnScroll delayClass="reveal-delay-2">
                <div className="step-circle">
                  <div className="step-num-tag">2</div>
                  <svg viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </div>
                <div className="step-name">Khám phá hoặc viết</div>
                <p className="step-text">
                  Tìm kiếm truyện yêu thích với AI ngữ nghĩa, hoặc mở Author Studio
                  và bắt đầu sáng tác ngay hôm nay.
                </p>
              </RevealOnScroll>
            </div>

            <div className="how-step">
              <RevealOnScroll delayClass="reveal-delay-3">
                <div className="step-circle">
                  <div className="step-num-tag">3</div>
                  <svg viewBox="0 0 24 24">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div className="step-name">Kết nối cộng đồng</div>
                <p className="step-text">
                  Bình luận, theo dõi tác giả yêu thích, tham gia diễn đàn và chia
                  sẻ cảm xúc cùng cộng đồng.
                </p>
              </RevealOnScroll>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ PRODUCTION COMMITMENTS ═══════════ */}
      <section className="section section-testi" style={{ paddingTop: "64px" }}>
        <div className="sec-wrap">
          <RevealOnScroll>
            <div className="sec-header">
              <div className="sec-label">✦ Cam kết chất lượng</div>
              <h2 className="sec-title">
                Trải nghiệm đọc và viết
                <br />
                tối ưu cùng <em>YAG</em>
              </h2>
            </div>
          </RevealOnScroll>

          <div className="testi-grid">
            <RevealOnScroll delayClass="reveal-delay-1">
              <div className="t-card">
                <div className="t-stars">01</div>
                <p className="t-text">
                  Trang khám phá, thư viện và hồ sơ tác giả được tối ưu hóa để hiển thị những tác phẩm chất lượng cao nhất từ cộng đồng viết truyện Việt.
                </p>
                <div className="t-author">
                  <div className="t-avatar">QC</div>
                  <div>
                    <div className="t-name">Nội dung chọn lọc</div>
                    <div className="t-role">Tác phẩm từ cộng đồng</div>
                  </div>
                </div>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delayClass="reveal-delay-2">
              <div className="t-card">
                <div className="t-stars">02</div>
                <p className="t-text">
                  Tất cả ảnh bìa tác phẩm và ảnh đại diện tác giả được lưu trữ trên Cloudinary CDN tốc độ cao, đảm bảo hiển thị sắc nét tức thì trên mọi thiết bị.
                </p>
                <div className="t-author">
                  <div className="t-avatar">CS</div>
                  <div>
                    <div className="t-name">Lưu trữ đám mây</div>
                    <div className="t-role">Tốc độ tải trang tối ưu</div>
                  </div>
                </div>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delayClass="reveal-delay-3">
              <div className="t-card">
                <div className="t-stars">03</div>
                <p className="t-text">
                  Cơ chế thanh toán an toàn qua cổng PayOS và hệ thống xử lý tác vụ ngầm thông minh giúp các tương tác của bạn diễn ra nhanh chóng, bảo mật.
                </p>
                <div className="t-author">
                  <div className="t-avatar">PR</div>
                  <div>
                    <div className="t-name">Hạ tầng hiện đại</div>
                    <div className="t-role">Thanh toán PayOS an toàn</div>
                  </div>
                </div>
              </div>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* Wave ink → petal */}
      <div className="wave-block" style={{ backgroundColor: "var(--ink)" }}>
        <svg viewBox="0 0 1440 72" preserveAspectRatio="none" style={{ height: "72px" }}>
          <path
            d="M0,40 C300,80 700,0 1000,50 C1200,80 1350,20 1440,45 L1440,72 L0,72Z"
            fill="#FFECCE"
          />
        </svg>
      </div>

      {/* ═══════════ MEMBERSHIP ═══════════ */}
      <section className="section section-membership">
        <div className="sec-wrap">
          <RevealOnScroll>
            <div className="sec-header">
              <div className="sec-label">✦ Gói thành viên</div>
              <h2 className="sec-title">
                Chọn gói phù hợp
                <br />
                với <em>hành trình</em> của bạn
              </h2>
              <p className="sec-desc">Bắt đầu miễn phí, nâng cấp khi sẵn sàng.</p>
            </div>
          </RevealOnScroll>

          <div className="plans-grid">
            {/* Free */}
            <RevealOnScroll delayClass="reveal-delay-1">
              <div className="plan-card">
                <div className="plan-name">Miễn phí</div>
                <div className="plan-price">
                  0<span>đ</span>
                </div>
                <div className="plan-period">/ mãi mãi</div>
                <ul className="plan-features">
                  <li className="plan-feat-item yes">
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m2 8 4 4 8-8" />
                    </svg>
                    Đọc chương miễn phí
                  </li>
                  <li className="plan-feat-item yes">
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m2 8 4 4 8-8" />
                    </svg>
                    Tìm kiếm AI cơ bản
                  </li>
                  <li className="plan-feat-item yes">
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m2 8 4 4 8-8" />
                    </svg>
                    Tham gia diễn đàn
                  </li>
                  <li className="plan-feat-item no">
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m4 4 8 8M12 4l-8 8" />
                    </svg>
                    Chương premium
                  </li>
                  <li className="plan-feat-item no">
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m4 4 8 8M12 4l-8 8" />
                    </svg>
                    AI gợi ý không giới hạn
                  </li>
                </ul>
                <Link className="btn-plan btn-plan-outline" href="/auth?tab=register">Bắt đầu</Link>
              </div>
            </RevealOnScroll>

            {/* Gói Tháng Premium - Popular */}
            <RevealOnScroll delayClass="reveal-delay-2">
              <div className="plan-card popular">
                <div className="popular-badge">⭐ Phổ biến nhất</div>
                <div className="plan-name">Tháng Premium</div>
                <div className="plan-price">
                  50K<span>đ</span>
                </div>
                <div className="plan-period">/ 30 ngày</div>
                <ul className="plan-features">
                  <li className="plan-feat-item yes">
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m2 8 4 4 8-8" />
                    </svg>
                    Tất cả tính năng miễn phí
                  </li>
                  <li className="plan-feat-item yes">
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m2 8 4 4 8-8" />
                    </svg>
                    Mở khoá chương premium
                  </li>
                  <li className="plan-feat-item yes">
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m2 8 4 4 8-8" />
                    </svg>
                    AI gợi ý không giới hạn
                  </li>
                  <li className="plan-feat-item yes">
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m2 8 4 4 8-8" />
                    </svg>
                    Không quảng cáo
                  </li>
                  <li className="plan-feat-item yes">
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m2 8 4 4 8-8" />
                    </svg>
                    Hỗ trợ ưu tiên
                  </li>
                </ul>
                <Link className="btn-plan btn-plan-solid" href="/membership">Đăng ký ngay</Link>
              </div>
            </RevealOnScroll>

            {/* Gói Năm Premium */}
            <RevealOnScroll delayClass="reveal-delay-3">
              <div className="plan-card">
                <div className="plan-name">Năm Premium</div>
                <div className="plan-price">
                  500K<span>đ</span>
                </div>
                <div className="plan-period">/ 365 ngày · tiết kiệm 20%</div>
                <ul className="plan-features">
                  <li className="plan-feat-item yes">
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m2 8 4 4 8-8" />
                    </svg>
                    Tất cả quyền lợi gói Tháng
                  </li>
                  <li className="plan-feat-item yes">
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m2 8 4 4 8-8" />
                    </svg>
                    Huy hiệu thành viên VIP
                  </li>
                  <li className="plan-feat-item yes">
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m2 8 4 4 8-8" />
                    </svg>
                    Early access chương mới
                  </li>
                  <li className="plan-feat-item yes">
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m2 8 4 4 8-8" />
                    </svg>
                    Tải ngoại tuyến (sắp có)
                  </li>
                  <li className="plan-feat-item yes">
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m2 8 4 4 8-8" />
                    </svg>
                    Tiết kiệm 20% so với gói tháng
                  </li>
                </ul>
                <Link className="btn-plan btn-plan-outline" href="/membership">
                  Chọn gói năm
                </Link>
              </div>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* Wave petal → jungle-dark */}
      <div className="wave-block" style={{ backgroundColor: "var(--petal)" }}>
        <svg viewBox="0 0 1440 72" preserveAspectRatio="none" style={{ height: "72px" }}>
          <path
            d="M0,20 C400,72 900,10 1440,50 L1440,72 L0,72Z"
            fill="#2e3829"
          />
        </svg>
      </div>

      {/* ═══════════ CTA ═══════════ */}
      <section className="section-cta">
        <div className="cta-bg-orb cta-orb1"></div>
        <div className="cta-bg-orb cta-orb2"></div>
        <div className="cta-inner">
          <RevealOnScroll>
            <div className="cta-eyebrow">
              ✦ Miễn phí · Không quảng cáo khi đọc
            </div>
            <h2 className="cta-title">
              Bắt đầu hành trình
              <br />
              <em>của riêng bạn</em> hôm nay
            </h2>
            <p className="cta-text">
              Tạo tài khoản để đọc, viết và xuất bản những câu chuyện của riêng
              bạn trên một hệ thống dùng dữ liệu thật.
            </p>
            <div className="cta-btns">
              <Link
                className="btn-primary"
                href="/auth?tab=register"
                style={{ fontSize: "15px", padding: "16px 36px" }}
              >
                ✦ Đăng ký miễn phí
              </Link>
            </div>
            <p className="cta-note">
              Không cần thẻ tín dụng · Bắt đầu trong 30 giây · Thanh toán qua
              PayOS
            </p>
          </RevealOnScroll>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer>
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <div className="footer-logo">
                <BrandLogo />
              </div>
              <p className="footer-tagline">
                Nền tảng đọc và viết truyện thông minh dành cho người Việt, tích
                hợp AI Gemini.
              </p>
            </div>
            <div>
              <div className="footer-col-title">Khám phá</div>
              <ul className="footer-links">
                <li>
                  <Link href="/home">Trang chủ đọc</Link>
                </li>
                <li>
                  <Link href="/discover">Khám phá truyện</Link>
                </li>
                <li>
                  <Link href="/library">Thư viện cá nhân</Link>
                </li>
                <li>
                  <Link href="/membership">Membership</Link>
                </li>
              </ul>
            </div>
            <div>
              <div className="footer-col-title">Tác giả</div>
              <ul className="footer-links">
                <li>
                  <Link href="/author/stories">Tác phẩm của tôi</Link>
                </li>
                <li>
                  <Link href="/author/stories">Không gian viết</Link>
                </li>
                <li>
                  <Link href="/author/stories">Xuất bản chương</Link>
                </li>
                <li>
                  <Link href="/author/schedule">Lịch đăng & cam kết</Link>
                </li>
              </ul>
            </div>
            <div>
              <div className="footer-col-title">Hỗ trợ</div>
              <ul className="footer-links">
                <li>
                  <Link href="/about">Về YAG</Link>
                </li>
                <li>
                  <Link href="/terms">Điều khoản sử dụng</Link>
                </li>
                <li>
                  <Link href="/privacy">Chính sách bảo mật</Link>
                </li>
                <li>
                  <Link href="/contact">Liên hệ hỗ trợ</Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-copy">
              © 2026 YAG Writing Web
            </div>
            <div className="footer-socials">
              <Link className="social-btn" href="/profile/me" aria-label="Hồ sơ cá nhân">
                <svg viewBox="0 0 24 24">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </Link>
              <Link className="social-btn" href="/notifications" aria-label="Thông báo">
                <svg viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                </svg>
              </Link>
              <Link className="social-btn" href="/about" aria-label="Thông tin dự án">
                <svg viewBox="0 0 24 24">
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
