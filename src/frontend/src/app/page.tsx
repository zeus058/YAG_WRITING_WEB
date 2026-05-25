"use client";

import Link from "next/link";
import React, { useState, useEffect, useRef } from "react";

/**
 * Component Hiển thị hiệu ứng đếm số tăng dần (Count Up)
 */
function StatCounter({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const elementRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !hasStarted.current) {
          hasStarted.current = true;
          let start = 0;
          const duration = 1800;
          const stepTime = 16;
          const increment = target / (duration / stepTime);

          const timer = setInterval(() => {
            start += increment;
            if (start >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(start));
            }
          }, stepTime);
        }
      },
      { threshold: 0.5 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [target]);

  // Định dạng số hiển thị (ví dụ 12000 thành 12.0K hoặc 12K+)
  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  return (
    <div ref={elementRef}>
      <div className="stat-val">{formatNumber(count)}{suffix}</div>
    </div>
  );
}

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

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);

  // === Xử lý hiệu ứng Navbar khi cuộn trang ===
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 60) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
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

  // === Logic kéo chuột cho Stories Scroll ===
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
    const walk = (x - storiesStartX) * 1.2;
    storiesScrollRef.current.scrollLeft = storiesScrollLeft - walk;
  };

  const handleStoriesMouseUpOrLeave = () => {
    setIsDraggingStories(false);
  };

  return (
    <div className="bg-[#41503D] min-h-screen text-white font-sans overflow-x-hidden">
      {/* ═══════════ NAVBAR ═══════════ */}
      <nav id="mainNav" className={isScrolled ? "scrolled" : ""}>
        <Link className="logo" href="/">
          Y<span className="logo-accent">A</span>G<div className="logo-dot"></div>
        </Link>
        <ul className="nav-links">
          <li>
            <Link href="/discover">Khám phá</Link>
          </li>
          <li>
            <Link href="/discover">Thể loại</Link>
          </li>
          <li>
            <Link href="/forum">Diễn đàn</Link>
          </li>
          <li>
            <Link href="/author-studio">Tác giả</Link>
          </li>
        </ul>
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
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
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
              Đọc hàng ngàn tác phẩm, viết cùng trợ lý AI Gemini, tìm kiếm ngữ
              nghĩa thông minh — tất cả trong một nền tảng dành cho người Việt.
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
              <Link className="btn-ghost" href="/author-studio">
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
                <StatCounter target={12000} suffix="+" />
                <div className="stat-key">Tác phẩm</div>
              </div>
              <div>
                <StatCounter target={48000} suffix="+" />
                <div className="stat-key">Độc giả</div>
              </div>
              <div>
                <StatCounter target={3200} suffix="+" />
                <div className="stat-key">Tác giả</div>
              </div>
            </div>
          </div>

          {/* Cột phải: Book mockup visual */}
          <div className="hero-visual">
            <div className="book-stack">
              {/* Book 3 (back) */}
              <div className="book-card bc3">
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
                <div className="book-meta">
                  <div className="book-title-sm">Biển Sâu XXII</div>
                  <div className="book-author-sm">Ngân Hà</div>
                </div>
              </div>
              {/* Book 2 */}
              <div className="book-card bc2">
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
                <div className="book-meta">
                  <div className="book-title-sm">Mùa Hạ Năm Ấy</div>
                  <div className="book-author-sm">Hạ Linh</div>
                </div>
              </div>
              {/* Book 1 (front) */}
              <div className="book-card bc1">
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
                    Thiên Kiếm Vô Danh
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
                    Mộc Vân
                  </text>
                </svg>
              </div>
              {/* Floating badges */}
              <div className="float-badge">✦ AI Đề xuất</div>
              <div className="float-badge2">📚 3.2K+ Tác giả</div>
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
                    <svg viewBox="0 0 120 100" style={{ width: "110px" }}>
                      <rect
                        x="10"
                        y="20"
                        width="45"
                        height="60"
                        rx="3"
                        fill="#41503D"
                        opacity=".15"
                      />
                      <rect
                        x="65"
                        y="20"
                        width="45"
                        height="60"
                        rx="3"
                        fill="#41503D"
                        opacity=".15"
                      />
                      <rect
                        x="12"
                        y="22"
                        width="41"
                        height="56"
                        rx="2"
                        fill="#fff"
                        opacity=".9"
                      />
                      <rect
                        x="67"
                        y="22"
                        width="41"
                        height="56"
                        rx="2"
                        fill="#fff"
                        opacity=".9"
                      />
                      <rect
                        x="18"
                        y="32"
                        width="29"
                        height="2"
                        rx="1"
                        fill="#41503D"
                        opacity=".25"
                      />
                      <rect
                        x="18"
                        y="38"
                        width="25"
                        height="2"
                        rx="1"
                        fill="#41503D"
                        opacity=".18"
                      />
                      <rect
                        x="18"
                        y="44"
                        width="27"
                        height="2"
                        rx="1"
                        fill="#41503D"
                        opacity=".18"
                      />
                      <rect
                        x="18"
                        y="50"
                        width="22"
                        height="2"
                        rx="1"
                        fill="#41503D"
                        opacity=".18"
                      />
                      <rect
                        x="18"
                        y="56"
                        width="26"
                        height="2"
                        rx="1"
                        fill="#41503D"
                        opacity=".18"
                      />
                      <rect
                        x="73"
                        y="32"
                        width="29"
                        height="2"
                        rx="1"
                        fill="#41503D"
                        opacity=".25"
                      />
                      <rect
                        x="73"
                        y="38"
                        width="25"
                        height="2"
                        rx="1"
                        fill="#41503D"
                        opacity=".18"
                      />
                      <rect
                        x="73"
                        y="44"
                        width="27"
                        height="2"
                        rx="1"
                        fill="#41503D"
                        opacity=".18"
                      />
                      <rect
                        x="73"
                        y="50"
                        width="22"
                        height="2"
                        rx="1"
                        fill="#41503D"
                        opacity=".18"
                      />
                      <rect
                        x="73"
                        y="56"
                        width="26"
                        height="2"
                        rx="1"
                        fill="#41503D"
                        opacity=".18"
                      />
                      <rect
                        x="57"
                        y="20"
                        width="6"
                        height="60"
                        fill="#41503D"
                        opacity=".12"
                      />
                      <circle
                        cx="87"
                        cy="72"
                        r="8"
                        fill="#FFECCE"
                        stroke="#f5dba8"
                        strokeWidth="1.5"
                      />
                      <circle cx="87" cy="72" r="5" fill="#F59E0B" opacity=".7" />
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
                    <svg viewBox="0 0 120 100" style={{ width: "110px" }}>
                      <rect
                        x="10"
                        y="15"
                        width="70"
                        height="70"
                        rx="6"
                        fill="#fff"
                        stroke="#e0e8f0"
                        strokeWidth="1"
                      />
                      <rect x="10" y="15" width="70" height="18" rx="6" fill="#f0f4ff" />
                      <rect x="10" y="27" width="70" height="6" rx="0" fill="#f0f4ff" />
                      <circle cx="20" cy="24" r="3" fill="#EF4444" opacity=".6" />
                      <circle cx="30" cy="24" r="3" fill="#F59E0B" opacity=".6" />
                      <circle cx="40" cy="24" r="3" fill="#22C55E" opacity=".6" />
                      <rect
                        x="18"
                        y="42"
                        width="52"
                        height="2"
                        rx="1"
                        fill="#41503D"
                        opacity=".2"
                      />
                      <rect
                        x="18"
                        y="49"
                        width="44"
                        height="2"
                        rx="1"
                        fill="#41503D"
                        opacity=".15"
                      />
                      <rect
                        x="18"
                        y="56"
                        width="50"
                        height="2"
                        rx="1"
                        fill="#41503D"
                        opacity=".15"
                      />
                      <rect
                        x="18"
                        y="63"
                        width="35"
                        height="2"
                        rx="1"
                        fill="#C81C30"
                        opacity=".4"
                      />
                      <rect x="53" y="60" width="2" height="8" rx="1" fill="#3B82F6" opacity=".8">
                        <animate
                          attributeName="opacity"
                          values="0.8;0;0.8"
                          dur="1.2s"
                          repeatCount="indefinite"
                        />
                      </rect>
                      <rect
                        x="84"
                        y="15"
                        width="28"
                        height="70"
                        rx="6"
                        fill="#3B82F6"
                        opacity=".08"
                        stroke="#3B82F6"
                        strokeWidth=".5"
                        strokeOpacity=".3"
                      />
                      <text
                        x="98"
                        y="42"
                        textAnchor="middle"
                        fontSize="7"
                        fill="#3B82F6"
                        fontFamily="sans-serif"
                        fontWeight="bold"
                      >
                        AI
                      </text>
                      <rect
                        x="88"
                        y="48"
                        width="20"
                        height="2"
                        rx="1"
                        fill="#3B82F6"
                        opacity=".3"
                      />
                      <rect
                        x="88"
                        y="53"
                        width="16"
                        height="2"
                        rx="1"
                        fill="#3B82F6"
                        opacity=".2"
                      />
                      <rect
                        x="88"
                        y="58"
                        width="18"
                        height="2"
                        rx="1"
                        fill="#3B82F6"
                        opacity=".2"
                      />
                      <path
                        d="M98,22 L99.5,26 L103.5,27.5 L99.5,29 L98,33 L96.5,29 L92.5,27.5 L96.5,26Z"
                        fill="#F59E0B"
                        opacity=".8"
                      >
                        <animateTransform
                          attributeName="transform"
                          type="rotate"
                          from="0 98 27.5"
                          to="360 98 27.5"
                          dur="4s"
                          repeatCount="indefinite"
                        />
                      </path>
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
                    <svg viewBox="0 0 120 100" style={{ width: "110px" }}>
                      <rect
                        x="15"
                        y="15"
                        width="90"
                        height="22"
                        rx="11"
                        fill="#fff"
                        stroke="#FEBDB2"
                        strokeWidth="1.5"
                      />
                      <circle
                        cx="32"
                        cy="26"
                        r="6"
                        fill="none"
                        stroke="#C81C30"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M36,30 L40,34"
                        stroke="#C81C30"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      <rect
                        x="45"
                        y="22"
                        width="50"
                        height="8"
                        rx="4"
                        fill="#FFECCE"
                        opacity=".7"
                      />
                      <circle cx="30" cy="60" r="6" fill="#C81C30" opacity=".7" />
                      <circle cx="60" cy="48" r="8" fill="#C81C30" opacity=".9" />
                      <circle cx="90" cy="65" r="5" fill="#FEBDB2" opacity=".8" />
                      <circle cx="50" cy="75" r="4" fill="#C81C30" opacity=".5" />
                      <circle cx="78" cy="78" r="6" fill="#FEBDB2" opacity=".6" />
                      <line
                        x1="30"
                        y1="60"
                        x2="60"
                        y2="48"
                        stroke="#C81C30"
                        strokeWidth=".8"
                        opacity=".35"
                        strokeDasharray="3,2"
                      />
                      <line
                        x1="60"
                        y1="48"
                        x2="90"
                        y2="65"
                        stroke="#C81C30"
                        strokeWidth=".8"
                        opacity=".35"
                        strokeDasharray="3,2"
                      />
                      <line
                        x1="60"
                        y1="48"
                        x2="50"
                        y2="75"
                        stroke="#C81C30"
                        strokeWidth=".8"
                        opacity=".25"
                        strokeDasharray="3,2"
                      />
                      <line
                        x1="90"
                        y1="65"
                        x2="78"
                        y2="78"
                        stroke="#FEBDB2"
                        strokeWidth=".8"
                        opacity=".35"
                        strokeDasharray="3,2"
                      />
                      <rect x="52" y="40" width="20" height="10" rx="5" fill="#C81C30" />
                      <text
                        x="62"
                        y="48"
                        textAnchor="middle"
                        fontSize="7"
                        fill="white"
                        fontFamily="sans-serif"
                        fontWeight="bold"
                      >
                        AI
                      </text>
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
                    <svg viewBox="0 0 120 100" style={{ width: "110px" }}>
                      <rect
                        x="15"
                        y="18"
                        width="65"
                        height="30"
                        rx="10"
                        fill="#41503D"
                        opacity=".15"
                      />
                      <rect
                        x="17"
                        y="20"
                        width="61"
                        height="26"
                        rx="8"
                        fill="#22C55E"
                        opacity=".25"
                      />
                      <polygon points="25,48 15,56 35,48" fill="#22C55E" opacity=".2" />
                      <rect
                        x="22"
                        y="28"
                        width="40"
                        height="3"
                        rx="1.5"
                        fill="#41503D"
                        opacity=".3"
                      />
                      <rect
                        x="22"
                        y="36"
                        width="30"
                        height="3"
                        rx="1.5"
                        fill="#41503D"
                        opacity=".2"
                      />
                      <rect
                        x="40"
                        y="55"
                        width="65"
                        height="28"
                        rx="10"
                        fill="#41503D"
                        opacity=".1"
                      />
                      <rect
                        x="42"
                        y="57"
                        width="61"
                        height="24"
                        rx="8"
                        fill="#3B82F6"
                        opacity=".2"
                      />
                      <polygon points="95,83 105,90 85,83" fill="#3B82F6" opacity=".15" />
                      <rect
                        x="48"
                        y="64"
                        width="44"
                        height="3"
                        rx="1.5"
                        fill="#41503D"
                        opacity=".25"
                      />
                      <rect
                        x="48"
                        y="72"
                        width="35"
                        height="3"
                        rx="1.5"
                        fill="#41503D"
                        opacity=".15"
                      />
                      <circle cx="100" cy="22" r="5" fill="#22C55E">
                        <animate
                          attributeName="r"
                          values="5;7;5"
                          dur="1.5s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          values="1;0.5;1"
                          dur="1.5s"
                          repeatCount="indefinite"
                        />
                      </circle>
                      <circle cx="100" cy="22" r="3" fill="#22C55E" />
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
                    <svg viewBox="0 0 120 100" style={{ width: "110px" }}>
                      <path
                        d="M60,15 L90,28 L90,52 Q90,72 60,85 Q30,72 30,52 L30,28Z"
                        fill="none"
                        stroke="#C81C30"
                        strokeWidth="2"
                        strokeLinejoin="round"
                        opacity=".4"
                      />
                      <path
                        d="M60,22 L84,33 L84,52 Q84,68 60,79 Q36,68 36,52 L36,33Z"
                        fill="none"
                        stroke="#C81C30"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                        opacity=".25"
                      />
                      <path
                        d="M60,30 L76,39 L76,52 Q76,63 60,72 Q44,63 44,52 L44,39Z"
                        fill="#C81C30"
                        opacity=".1"
                      />
                      <path
                        d="M50,52 L57,59 L72,44"
                        stroke="#22C55E"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                      <line
                        x1="30"
                        y1="48"
                        x2="90"
                        y2="48"
                        stroke="#C81C30"
                        strokeWidth=".8"
                        opacity=".3"
                        strokeDasharray="4,3"
                      >
                        <animateTransform
                          attributeName="transform"
                          type="translate"
                          from="0,-15"
                          to="0,15"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                      </line>
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
                    <svg viewBox="0 0 120 100" style={{ width: "110px" }}>
                      <polygon
                        points="60,20 75,45 90,35 85,65 35,65 30,35 45,45"
                        fill="none"
                        stroke="#C81C30"
                        strokeWidth="2"
                        strokeLinejoin="round"
                        opacity=".5"
                      />
                      <polygon
                        points="60,25 73,47 87,37 83,62 37,62 33,37 47,47"
                        fill="#C81C30"
                        opacity=".15"
                      />
                      <circle cx="60" cy="20" r="4" fill="#C81C30" opacity=".8" />
                      <circle cx="90" cy="35" r="3" fill="#F59E0B" opacity=".8" />
                      <circle cx="30" cy="35" r="3" fill="#F59E0B" opacity=".8" />
                      <rect
                        x="55"
                        y="48"
                        width="10"
                        height="8"
                        rx="2"
                        fill="#C81C30"
                        opacity=".6"
                      />
                      <rect
                        x="25"
                        y="72"
                        width="70"
                        height="18"
                        rx="6"
                        fill="#C81C30"
                        opacity=".12"
                        stroke="#C81C30"
                        strokeWidth=".8"
                        strokeOpacity=".3"
                      />
                      <text
                        x="60"
                        y="84"
                        textAnchor="middle"
                        fontSize="8"
                        fill="#C81C30"
                        fontFamily="sans-serif"
                        fontWeight="bold"
                        opacity=".7"
                      >
                        VNPAY
                      </text>
                    </svg>
                  </div>
                  <div className="feat-title">Membership</div>
                  <p className="feat-desc">
                    Mở khoá toàn bộ chương premium, ủng hộ tác giả yêu thích. Thanh
                    toán an toàn qua VNPAY, 3 gói linh hoạt.
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
                    Thanh toán VNPAY
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
                <div className="sec-label">✦ Tác phẩm nổi bật</div>
                <h2 className="sec-title">
                  Hàng nghìn câu chuyện
                  <br />
                  đang chờ bạn khám phá
                </h2>
                <p className="sec-desc">
                  Từ kiếm hiệp thần tiêu đến ngôn tình hiện đại — AI sẽ gợi ý đúng
                  tác phẩm bạn muốn.
                </p>
              </div>
              <Link className="btn-see-all" href="/discover">
                Xem tất cả →
              </Link>
            </div>
          </RevealOnScroll>

          <RevealOnScroll>
            <div
              className={`stories-scroll ${isDraggingStories ? "dragging" : ""}`}
              ref={storiesScrollRef}
              onMouseDown={handleStoriesMouseDown}
              onMouseMove={handleStoriesMouseMove}
              onMouseUp={handleStoriesMouseUpOrLeave}
              onMouseLeave={handleStoriesMouseUpOrLeave}
            >
              {/* Card 1: Kiếm hiệp */}
              <div className="s-card">
                <div className="s-cover">
                  <div className="s-badge hot">Hot</div>
                  <svg
                    viewBox="0 0 190 130"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ width: "100%", height: "100%" }}
                  >
                    <defs>
                      <linearGradient id="sc1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{ stopColor: "#12023a" }} />
                        <stop offset="100%" style={{ stopColor: "#4a1080" }} />
                      </linearGradient>
                    </defs>
                    <rect width="190" height="130" fill="url(#sc1)" />
                    <circle
                      cx="95"
                      cy="60"
                      r="40"
                      fill="none"
                      stroke="rgba(254,189,178,.15)"
                      strokeWidth="1"
                    />
                    <circle
                      cx="95"
                      cy="60"
                      r="25"
                      fill="rgba(200,28,48,.1)"
                      stroke="rgba(200,28,48,.25)"
                      strokeWidth=".8"
                    />
                    <rect
                      x="93"
                      y="20"
                      width="4"
                      height="80"
                      rx="2"
                      fill="rgba(255,236,206,.6)"
                    />
                    <rect
                      x="75"
                      y="62"
                      width="40"
                      height="3"
                      rx="1.5"
                      fill="rgba(254,189,178,.5)"
                    />
                    <polygon
                      points="95,15 91,27 99,27"
                      fill="rgba(255,236,206,.85)"
                    />
                    <circle cx="30" cy="25" r="1.2" fill="rgba(255,255,255,.5)" />
                    <circle cx="160" cy="35" r="1" fill="rgba(255,255,255,.4)" />
                    <circle cx="20" cy="100" r="1.5" fill="rgba(255,255,255,.3)" />
                    <circle cx="170" cy="95" r="1" fill="rgba(255,255,255,.4)" />
                  </svg>
                </div>
                <div className="s-info">
                  <div className="s-genre">Kiếm hiệp</div>
                  <div className="s-name">Thiên Kiếm Vô Danh</div>
                  <div className="s-author">Mộc Vân</div>
                  <div className="s-stats">
                    <span className="s-stat">👁 2.4M</span>
                    <span className="s-stat">⭐ 4.9</span>
                    <span className="s-stat">📚 312 ch.</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Ngôn tình */}
              <div className="s-card">
                <div className="s-cover">
                  <div className="s-badge" style={{ background: "rgba(34,197,94,.7)" }}>
                    Mới
                  </div>
                  <svg
                    viewBox="0 0 190 130"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ width: "100%", height: "100%" }}
                  >
                    <defs>
                      <linearGradient id="sc2" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{ stopColor: "#051a0a" }} />
                        <stop offset="100%" style={{ stopColor: "#1a6b3a" }} />
                      </linearGradient>
                    </defs>
                    <rect width="190" height="130" fill="url(#sc2)" />
                    <ellipse
                      cx="95"
                      cy="65"
                      rx="35"
                      ry="45"
                      fill="none"
                      stroke="rgba(34,197,94,.2)"
                      strokeWidth="1"
                    />
                    <path
                      d="M65,50 Q95,25 125,50 Q95,85 65,50Z"
                      fill="rgba(34,197,94,.2)"
                    />
                    <circle cx="95" cy="55" r="8" fill="rgba(254,189,178,.3)" />
                    <circle cx="108" cy="48" r="5" fill="rgba(254,189,178,.2)" />
                    <circle cx="82" cy="48" r="5" fill="rgba(254,189,178,.2)" />
                  </svg>
                </div>
                <div className="s-info">
                  <div className="s-genre">Ngôn tình</div>
                  <div className="s-name">Mùa Hạ Năm Ấy</div>
                  <div className="s-author">Hạ Linh</div>
                  <div className="s-stats">
                    <span className="s-stat">👁 1.8M</span>
                    <span className="s-stat">⭐ 4.8</span>
                    <span className="s-stat">📚 88 ch.</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Huyền huyễn */}
              <div className="s-card">
                <div className="s-cover">
                  <div className="s-badge hot">🔥 Hot</div>
                  <svg
                    viewBox="0 0 190 130"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ width: "100%", height: "100%" }}
                  >
                    <defs>
                      <linearGradient id="sc3" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{ stopColor: "#2a0a0a" }} />
                        <stop offset="100%" style={{ stopColor: "#8b2200" }} />
                      </linearGradient>
                    </defs>
                    <rect width="190" height="130" fill="url(#sc3)" />
                    <path
                      d="M95,20 Q120,45 110,65 Q130,50 125,80 Q100,60 105,90 Q80,65 90,85 Q60,60 85,40 Q70,30 95,20Z"
                      fill="rgba(245,158,11,.4)"
                    />
                    <circle
                      cx="95"
                      cy="55"
                      r="12"
                      fill="rgba(245,158,11,.25)"
                      stroke="rgba(245,158,11,.4)"
                      strokeWidth="1"
                    />
                    <circle cx="95" cy="55" r="5" fill="rgba(245,158,11,.6)" />
                  </svg>
                </div>
                <div className="s-info">
                  <div className="s-genre">Huyền huyễn</div>
                  <div className="s-name">Hoả Linh Chi Chủ</div>
                  <div className="s-author">Phong Vũ</div>
                  <div className="s-stats">
                    <span className="s-stat">👁 3.1M</span>
                    <span className="s-stat">⭐ 4.7</span>
                    <span className="s-stat">📚 540 ch.</span>
                  </div>
                </div>
              </div>

              {/* Card 4: Sci-Fi */}
              <div className="s-card">
                <div className="s-cover">
                  <div className="s-badge ai">AI Pick</div>
                  <svg
                    viewBox="0 0 190 130"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ width: "100%", height: "100%" }}
                  >
                    <defs>
                      <linearGradient id="sc4" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{ stopColor: "#02111e" }} />
                        <stop offset="100%" style={{ stopColor: "#1a4a7a" }} />
                      </linearGradient>
                    </defs>
                    <rect width="190" height="130" fill="url(#sc4)" />
                    <path
                      d="M0,70 Q47,55 95,70 Q142,85 190,70 L190,130 L0,130Z"
                      fill="rgba(59,130,246,.15)"
                    />
                    <ellipse
                      cx="95"
                      cy="62"
                      rx="30"
                      ry="10"
                      fill="rgba(59,130,246,.3)"
                      stroke="rgba(59,130,246,.5)"
                      strokeWidth="1"
                    />
                  </svg>
                </div>
                <div className="s-info">
                  <div className="s-genre">Khoa học viễn tưởng</div>
                  <div className="s-name">Biển Sâu Thế Kỷ XXII</div>
                  <div className="s-author">Ngân Hà</div>
                  <div className="s-stats">
                    <span className="s-stat">👁 980K</span>
                    <span className="s-stat">⭐ 4.9</span>
                    <span className="s-stat">📚 160 ch.</span>
                  </div>
                </div>
              </div>

              {/* Card 5: Kinh dị */}
              <div className="s-card">
                <div className="s-cover">
                  <div className="s-badge done">Hoàn thành</div>
                  <svg
                    viewBox="0 0 190 130"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ width: "100%", height: "100%" }}
                  >
                    <defs>
                      <linearGradient id="sc5" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{ stopColor: "#0d0d0d" }} />
                        <stop offset="100%" style={{ stopColor: "#2d1b00" }} />
                      </linearGradient>
                    </defs>
                    <rect width="190" height="130" fill="url(#sc5)" />
                    <circle
                      cx="140"
                      cy="30"
                      r="20"
                      fill="rgba(255,236,206,.12)"
                      stroke="rgba(255,236,206,.15)"
                      strokeWidth="1"
                    />
                    <circle cx="148" cy="25" r="14" fill="#0d0d0d" />
                    <circle cx="95" cy="52" r="12" fill="rgba(30,30,30,.9)" />
                    <circle cx="91" cy="51" r="2" fill="rgba(200,28,48,.8)" />
                    <circle cx="99" cy="51" r="2" fill="rgba(200,28,48,.8)" />
                  </svg>
                </div>
                <div className="s-info">
                  <div className="s-genre">Kinh dị tâm lý</div>
                  <div className="s-name">Bóng Tối Thứ Ba</div>
                  <div className="s-author">Đêm Khuya</div>
                  <div className="s-stats">
                    <span className="s-stat">👁 1.2M</span>
                    <span className="s-stat">⭐ 4.6</span>
                    <span className="s-stat">📚 200 ch.</span>
                  </div>
                </div>
              </div>

              {/* Card 6: Cổ trang */}
              <div className="s-card">
                <div className="s-cover">
                  <div className="s-badge hot">Hot</div>
                  <svg
                    viewBox="0 0 190 130"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ width: "100%", height: "100%" }}
                  >
                    <defs>
                      <linearGradient id="sc6" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{ stopColor: "#1a0a0a" }} />
                        <stop offset="100%" style={{ stopColor: "#6b2f00" }} />
                      </linearGradient>
                    </defs>
                    <rect width="190" height="130" fill="url(#sc6)" />
                    <circle
                      cx="95"
                      cy="55"
                      r="22"
                      fill="none"
                      stroke="rgba(254,189,178,.2)"
                      strokeWidth="1"
                    />
                    <circle cx="95" cy="55" r="5" fill="rgba(245,158,11,.5)" />
                  </svg>
                </div>
                <div className="s-info">
                  <div className="s-genre">Cổ trang</div>
                  <div className="s-name">Độc Bộ Thiên Hạ</div>
                  <div className="s-author">Tuyết Băng</div>
                  <div className="s-stats">
                    <span className="s-stat">👁 2.0M</span>
                    <span className="s-stat">⭐ 4.8</span>
                    <span className="s-stat">📚 420 ch.</span>
                  </div>
                </div>
              </div>
            </div>
          </RevealOnScroll>

          {/* Thể loại nổi bật */}
          <RevealOnScroll>
            <div className="genre-pills">
              <div className="genre-pill">⚔️ Kiếm hiệp</div>
              <div className="genre-pill">💕 Ngôn tình</div>
              <div className="genre-pill">🔥 Huyền huyễn</div>
              <div className="genre-pill">🚀 Khoa học viễn tưởng</div>
              <div className="genre-pill">🌙 Kinh dị</div>
              <div className="genre-pill">🏯 Cổ trang</div>
              <div className="genre-pill">🌏 Hiện đại</div>
              <div className="genre-pill">🧠 Tâm lý</div>
            </div>
          </RevealOnScroll>
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
              <p className="sec-desc" style={{ color: "rgba(255,255,255,.5)" }}>
                Đơn giản, nhanh chóng và hoàn toàn miễn phí để bắt đầu.
              </p>
            </div>
          </RevealOnScroll>

          <div className="how-grid">
            <div className="how-connector"></div>
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

      {/* ═══════════ TESTIMONIALS ═══════════ */}
      <section className="section section-testi" style={{ paddingTop: "64px" }}>
        <div className="sec-wrap">
          <RevealOnScroll>
            <div className="sec-header">
              <div className="sec-label">✦ Cộng đồng nói gì</div>
              <h2 className="sec-title">
                Hàng nghìn người đã
                <br />
                tin tưởng <em>YAG</em>
              </h2>
            </div>
          </RevealOnScroll>

          <div className="testi-grid">
            <RevealOnScroll delayClass="reveal-delay-1">
              <div className="t-card">
                <div className="t-stars">★★★★★</div>
                <p className="t-text">
                  Reader Mode của YAG là tốt nhất tôi từng dùng. Đọc cả đêm mà
                  mắt không mỏi, nền sepia nhìn rất dễ chịu và font chữ đẹp hơn
                  các app khác nhiều.
                </p>
                <div className="t-author">
                  <div className="t-avatar">MN</div>
                  <div>
                    <div className="t-name">Minh Nguyệt</div>
                    <div className="t-role">Độc giả · TP.HCM</div>
                  </div>
                </div>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delayClass="reveal-delay-2">
              <div className="t-card">
                <div className="t-stars">★★★★★</div>
                <p className="t-text">
                  AI gợi ý tình tiết thực sự hữu ích. Khi tôi bí ý tưởng, sidebar
                  AI luôn có vài gợi ý thú vị để tiếp tục mạch truyện. Không còn
                  sợ bí không viết được nữa.
                </p>
                <div className="t-author">
                  <div className="t-avatar">TH</div>
                  <div>
                    <div className="t-name">Trần Hùng</div>
                    <div className="t-role">Tác giả · Hà Nội</div>
                  </div>
                </div>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delayClass="reveal-delay-3">
              <div className="t-card">
                <div className="t-stars">★★★★☆</div>
                <p className="t-text">
                  Tìm kiếm AI cực hay! Tôi chỉ gõ &quot;truyện về tình yêu thời chiến
                  buồn&quot; là nó đề xuất đúng thứ tôi muốn đọc. Không cần biết tên
                  hay tác giả.
                </p>
                <div className="t-author">
                  <div className="t-avatar">PL</div>
                  <div>
                    <div className="t-name">Phương Linh</div>
                    <div className="t-role">Độc giả · Đà Nẵng</div>
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

            {/* Theo quý - Popular */}
            <RevealOnScroll delayClass="reveal-delay-2">
              <div className="plan-card popular">
                <div className="popular-badge">⭐ Phổ biến nhất</div>
                <div className="plan-name">Theo quý</div>
                <div className="plan-price">
                  79K<span>đ</span>
                </div>
                <div className="plan-period">/ 3 tháng</div>
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

            {/* Theo năm */}
            <RevealOnScroll delayClass="reveal-delay-3">
              <div className="plan-card">
                <div className="plan-name">Theo năm</div>
                <div className="plan-price">
                  199K<span>đ</span>
                </div>
                <div className="plan-period">/ 12 tháng · tiết kiệm 40%</div>
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
                    Tất cả quyền lợi Quý
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
                    Tiết kiệm 40% so với tháng
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
              Tham gia cùng hàng chục nghìn độc giả và tác giả đang viết nên
              những câu chuyện đáng nhớ.
            </p>
            <div className="cta-btns">
              <Link
                className="btn-primary"
                href="/auth?tab=register"
                style={{ fontSize: "15px", padding: "16px 36px" }}
              >
                ✦ Đăng ký miễn phí
              </Link>
              <Link
                className="btn-ghost"
                href="/discover"
                style={{ fontSize: "15px", padding: "16px 32px" }}
              >
                Khám phá truyện
              </Link>
            </div>
            <p className="cta-note">
              Không cần thẻ tín dụng · Bắt đầu trong 30 giây · Thanh toán qua
              VNPAY
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
                Y<span>A</span>G
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
                  <Link href="/dashboard">Trang chủ đọc</Link>
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
                  <Link href="/author-works">Tác phẩm của tôi</Link>
                </li>
                <li>
                  <Link href="/author-studio">Không gian viết</Link>
                </li>
                <li>
                  <Link href="/publish-chapter">Xuất bản chương</Link>
                </li>
                <li>
                  <Link href="/schedule-commitment">Lịch đăng & cam kết</Link>
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
              © 2026 YAG Writing Web · HCMUS Intro2SE · Nhóm 1 · Prototype học thuật
            </div>
            <div className="footer-socials">
              <Link className="social-btn" href="/profile" aria-label="Hồ sơ mẫu">
                <svg viewBox="0 0 24 24">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </Link>
              <Link className="social-btn" href="/notifications" aria-label="Thông báo mẫu">
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
