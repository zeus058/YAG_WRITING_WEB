"use client";

import React from "react";

function AuthFlyingBook({ coverNum, bookClass }: { coverNum: number; bookClass: string }) {
  return (
    <div className={`auth-book ${bookClass}`} aria-hidden>
      <img
        src={`/auth_cover_${coverNum}.png`}
        alt={`Novel Cover ${coverNum}`}
        style={{
          width: "100%",
          height: "auto",
          borderRadius: "6px",
          display: "block",
          objectFit: "cover",
          border: "1px solid rgba(255, 255, 255, 0.15)",
        }}
      />
    </div>
  );
}

export function AuthBackdrop() {
  return (
    <div className="auth-ambient" aria-hidden="true">
      <AuthFlyingBook coverNum={1} bookClass="book-one" />
      <AuthFlyingBook coverNum={2} bookClass="book-two" />
      <AuthFlyingBook coverNum={3} bookClass="book-three" />
      <AuthFlyingBook coverNum={4} bookClass="book-four" />
      <AuthFlyingBook coverNum={5} bookClass="book-five" />
      <AuthFlyingBook coverNum={6} bookClass="book-six" />
    </div>
  );
}

export function AuthProductFooter() {
  return null;
}
