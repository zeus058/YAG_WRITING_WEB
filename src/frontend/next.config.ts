import type { NextConfig } from "next";

// Production build-time environment validation
const deployEnvironment =
  process.env.NEXT_PUBLIC_DEPLOY_ENV ??
  process.env.NEXT_PUBLIC_ENVIRONMENT ??
  process.env.ENVIRONMENT ??
  "development";
const normalizedDeployEnvironment = deployEnvironment.toLowerCase();

function assertRequiredProductionUrl(name: string, allowedProtocols: string[]) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[Production Readiness Error] ${name} must be set for production deployment.`);
  }

  const parsed = new URL(value);
  if (!allowedProtocols.includes(parsed.protocol)) {
    throw new Error(
      `[Production Readiness Error] ${name} must use ${allowedProtocols.join(" or ")} in production.`
    );
  }

  if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "0.0.0.0") {
    throw new Error(
      `[Production Readiness Error] ${name} is set to '${value}'. ` +
      `For production deployment, public URLs must not be localhost.`
    );
  }
}

if (normalizedDeployEnvironment === "production") {
  assertRequiredProductionUrl("NEXT_PUBLIC_APP_URL", ["https:"]);
  assertRequiredProductionUrl("NEXT_PUBLIC_API_BASE_URL", ["https:"]);
  assertRequiredProductionUrl("NEXT_PUBLIC_WS_BASE_URL", ["wss:"]);

  if (process.env.NEXT_PUBLIC_USE_MOCKS !== "false") {
    throw new Error("[Production Readiness Error] NEXT_PUBLIC_USE_MOCKS must be explicitly false in production.");
  }
}

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
      { source: "/s04-home-feed.html", destination: "/home", permanent: true },
      { source: "/s04-home-feed", destination: "/home", permanent: true },
      { source: "/dashboard", destination: "/home", permanent: true },
      { source: "/s05-discover-search.html", destination: "/discover", permanent: true },
      { source: "/s05-discover-search", destination: "/discover", permanent: true },
      { source: "/s06-story-detail.html", destination: "/discover", permanent: true },
      { source: "/s06-story-detail", destination: "/discover", permanent: true },
      { source: "/story-detail", destination: "/discover", permanent: true },
      { source: "/s07-reader-mode.html", destination: "/home", permanent: true },
      { source: "/s07-reader-mode", destination: "/home", permanent: true },
      { source: "/reader-mode", destination: "/home", permanent: true },
      { source: "/s08-forum.html", destination: "/forum", permanent: true },
      { source: "/s08-forum", destination: "/forum", permanent: true },
      { source: "/s09-membership.html", destination: "/membership", permanent: true },
      { source: "/s09-membership", destination: "/membership", permanent: true },
      { source: "/s10-payment-result.html", destination: "/payment/result", permanent: true },
      { source: "/s10-payment-result", destination: "/payment/result", permanent: true },
      { source: "/payment-result", destination: "/payment/result", permanent: true },
      { source: "/s11-library.html", destination: "/library", permanent: true },
      { source: "/s11-library", destination: "/library", permanent: true },
      { source: "/s12-profile.html", destination: "/profile/me", permanent: true },
      { source: "/s12-profile", destination: "/profile/me", permanent: true },
      { source: "/profile", destination: "/profile/me", permanent: true },
      { source: "/s13-account-settings.html", destination: "/settings", permanent: true },
      { source: "/s13-account-settings", destination: "/settings", permanent: true },
      { source: "/account-settings", destination: "/settings", permanent: true },
      { source: "/s14-notifications.html", destination: "/notifications", permanent: true },
      { source: "/s14-notifications", destination: "/notifications", permanent: true },
      { source: "/s15-author-works.html", destination: "/author/stories", permanent: true },
      { source: "/s15-author-works", destination: "/author/stories", permanent: true },
      { source: "/author-works", destination: "/author/stories", permanent: true },
      { source: "/s16-author-studio.html", destination: "/author/stories", permanent: true },
      { source: "/s16-author-studio", destination: "/author/stories", permanent: true },
      { source: "/author-studio", destination: "/author/stories", permanent: true },
      { source: "/s17-publish-chapter.html", destination: "/author/stories", permanent: true },
      { source: "/s17-publish-chapter", destination: "/author/stories", permanent: true },
      { source: "/publish-chapter", destination: "/author/stories", permanent: true },
      { source: "/s18-schedule-commitment.html", destination: "/author/schedule", permanent: true },
      { source: "/s18-schedule-commitment", destination: "/author/schedule", permanent: true },
      { source: "/schedule-commitment", destination: "/author/schedule", permanent: true },
      { source: "/s19-admin-dashboard.html", destination: "/admin", permanent: true },
      { source: "/s19-admin-dashboard", destination: "/admin", permanent: true },
      { source: "/admin-dashboard", destination: "/admin", permanent: true },
      { source: "/s20-content-moderation.html", destination: "/admin/moderation", permanent: true },
      { source: "/s20-content-moderation", destination: "/admin/moderation", permanent: true },
      { source: "/content-moderation", destination: "/admin/moderation", permanent: true },
      { source: "/s21-reports.html", destination: "/admin/stats", permanent: true },
      { source: "/s21-reports", destination: "/admin/stats", permanent: true },
      { source: "/reports", destination: "/admin/stats", permanent: true },
    ];
  },
};

export default nextConfig;
