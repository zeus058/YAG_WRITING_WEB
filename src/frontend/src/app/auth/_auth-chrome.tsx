"use client";

import React from "react";
import Link from "next/link";

const palettes = [
  ["#C81C30", "#FFECCE", "#41503D"],
  ["#3B82F6", "#FEBDB2", "#2E3829"],
  ["#F59E0B", "#FAFAF8", "#41503D"],
  ["#22C55E", "#FFECCE", "#243020"],
  ["#FEBDB2", "#C81C30", "#2E3829"],
];

function AuthFlyingBook({ seed, bookClass }: { seed: number; bookClass: string }) {
  const p = palettes[seed % palettes.length];
  return (
    <div className={`auth-book ${bookClass}`} aria-hidden>
      <svg viewBox="0 0 120 168">
        <rect width="120" height="168" rx="10" fill={p[2]} />
        <path d="M0 112 C28 90 50 126 82 98 C98 84 108 80 120 86 V168 H0Z" fill={p[1]} opacity=".92" />
        <circle cx="92" cy="34" r="30" fill={p[0]} opacity=".86" />
        <path d="M22 34h48M22 50h32M22 136h70" stroke={p[1]} strokeWidth="6" strokeLinecap="round" />
        <rect x="14" y="14" width="92" height="140" rx="8" fill="none" stroke={p[1]} strokeOpacity=".32" strokeWidth="2" />
      </svg>
    </div>
  );
}

export function AuthBackdrop() {
  return (
    <div className="auth-ambient" aria-hidden="true">
      <AuthFlyingBook seed={0} bookClass="book-one" />
      <AuthFlyingBook seed={1} bookClass="book-two" />
      <AuthFlyingBook seed={2} bookClass="book-three" />
      <AuthFlyingBook seed={3} bookClass="book-four" />
      <AuthFlyingBook seed={4} bookClass="book-five" />
      <AuthFlyingBook seed={5} bookClass="book-six" />
    </div>
  );
}

export function AuthProductFooter() {
  return null;
}
