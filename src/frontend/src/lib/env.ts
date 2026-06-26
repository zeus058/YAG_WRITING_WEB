export const appEnv = {
  deployEnvironment:
    process.env.NEXT_PUBLIC_DEPLOY_ENV ??
    process.env.NEXT_PUBLIC_ENVIRONMENT ??
    (process.env.VERCEL_ENV === "production" ? "production" : undefined) ??
    "development",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000",
  wsBaseUrl:
    process.env.NEXT_PUBLIC_WS_BASE_URL ??
    (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000")
      .replace(/^http:/, "ws:")
      .replace(/^https:/, "wss:"),
  useMocks: false,
  requestTimeoutMs: Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS ?? 120000),
} as const;

const localUrlMarkers = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"];

function assertProductionUrl(name: string, value: string, allowedProtocols: string[]) {
  const url = new URL(value);
  if (!allowedProtocols.includes(url.protocol)) {
    throw new Error(`${name} must use ${allowedProtocols.join(" or ")} in production`);
  }
  if (localUrlMarkers.some((marker) => url.hostname.includes(marker))) {
    throw new Error(`${name} must not point to localhost in production`);
  }
}



if (appEnv.deployEnvironment === "production") {
  assertProductionUrl("NEXT_PUBLIC_APP_URL", appEnv.appUrl, ["https:"]);
  assertProductionUrl("NEXT_PUBLIC_API_BASE_URL", appEnv.apiBaseUrl, ["https:"]);
  assertProductionUrl("NEXT_PUBLIC_WS_BASE_URL", appEnv.wsBaseUrl, ["wss:"]);
}

export function resolveApiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const base = appEnv.apiBaseUrl.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

