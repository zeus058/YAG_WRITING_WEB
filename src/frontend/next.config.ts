import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(self)",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/s02-auth.html", destination: "/auth", permanent: true },
      { source: "/s02-auth", destination: "/auth", permanent: true },
      { source: "/s03-password-recovery.html", destination: "/auth/recovery", permanent: true },
      { source: "/s03-password-recovery", destination: "/auth/recovery", permanent: true },
      { source: "/s04-home-feed.html", destination: "/dashboard", permanent: true },
      { source: "/s04-home-feed", destination: "/dashboard", permanent: true },
      { source: "/s05-discover-search.html", destination: "/discover", permanent: true },
      { source: "/s05-discover-search", destination: "/discover", permanent: true },
      { source: "/s06-story-detail.html", destination: "/story-detail", permanent: true },
      { source: "/s06-story-detail", destination: "/story-detail", permanent: true },
      { source: "/s07-reader-mode.html", destination: "/reader-mode", permanent: true },
      { source: "/s07-reader-mode", destination: "/reader-mode", permanent: true },
      { source: "/s08-forum.html", destination: "/forum", permanent: true },
      { source: "/s08-forum", destination: "/forum", permanent: true },
      { source: "/s09-membership.html", destination: "/membership", permanent: true },
      { source: "/s09-membership", destination: "/membership", permanent: true },
      { source: "/s10-payment-result.html", destination: "/payment-result", permanent: true },
      { source: "/s10-payment-result", destination: "/payment-result", permanent: true },
      { source: "/s11-library.html", destination: "/library", permanent: true },
      { source: "/s11-library", destination: "/library", permanent: true },
      { source: "/s12-profile.html", destination: "/profile", permanent: true },
      { source: "/s12-profile", destination: "/profile", permanent: true },
      { source: "/s13-account-settings.html", destination: "/account-settings", permanent: true },
      { source: "/s13-account-settings", destination: "/account-settings", permanent: true },
      { source: "/s14-notifications.html", destination: "/notifications", permanent: true },
      { source: "/s14-notifications", destination: "/notifications", permanent: true },
      { source: "/s15-author-works.html", destination: "/author-works", permanent: true },
      { source: "/s15-author-works", destination: "/author-works", permanent: true },
      { source: "/s16-author-studio.html", destination: "/author-studio", permanent: true },
      { source: "/s16-author-studio", destination: "/author-studio", permanent: true },
      { source: "/s17-publish-chapter.html", destination: "/publish-chapter", permanent: true },
      { source: "/s17-publish-chapter", destination: "/publish-chapter", permanent: true },
      { source: "/s18-schedule-commitment.html", destination: "/schedule-commitment", permanent: true },
      { source: "/s18-schedule-commitment", destination: "/schedule-commitment", permanent: true },
      { source: "/s19-admin-dashboard.html", destination: "/admin-dashboard", permanent: true },
      { source: "/s19-admin-dashboard", destination: "/admin-dashboard", permanent: true },
      { source: "/s20-content-moderation.html", destination: "/content-moderation", permanent: true },
      { source: "/s20-content-moderation", destination: "/content-moderation", permanent: true },
      { source: "/s21-reports.html", destination: "/reports", permanent: true },
      { source: "/s21-reports", destination: "/reports", permanent: true },
    ];
  },
};

export default nextConfig;
