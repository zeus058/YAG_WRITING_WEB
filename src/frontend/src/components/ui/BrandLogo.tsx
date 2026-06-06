import React from "react";

type BrandLogoProps = {
  className?: string;
};

export function BrandLogo({ className = "" }: BrandLogoProps) {
  return (
    <span className={`brand-mark-container ${className}`} style={{ display: "inline-flex", alignItems: "center", gap: "10px" }} aria-label="YAG">
      <svg
        width="28"
        height="28"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="brand-logo-svg"
        style={{ flexShrink: 0, transition: "transform 0.3s ease" }}
      >
        {/* Adaptive ultra-minimalist geometric Y monogram */}
        {/* Left branch */}
        <line x1="22" y1="22" x2="50" y2="50" stroke="currentColor" strokeWidth="9" strokeLinecap="round" opacity="0.7" />
        {/* Right branch */}
        <line x1="78" y1="22" x2="50" y2="50" stroke="currentColor" strokeWidth="9" strokeLinecap="round" opacity="0.7" />
        {/* Stem */}
        <line x1="50" y1="50" x2="50" y2="78" stroke="currentColor" strokeWidth="9" strokeLinecap="round" opacity="0.92" />
        {/* Glowing digital dot */}
        <circle cx="50" cy="50" r="7.5" fill="var(--coral, #FEBDB2)" />
      </svg>
      <span className="yag-wordmark" style={{ display: "inline-flex", alignItems: "baseline", gap: "2px", fontWeight: 800, fontSize: "20px", letterSpacing: "2.5px", color: "inherit" }}>
        Y<span style={{ color: "var(--coral)" }}>A</span>G
      </span>
    </span>
  );
}

