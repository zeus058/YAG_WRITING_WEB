export const appEnv = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000",
  wsBaseUrl:
    process.env.NEXT_PUBLIC_WS_BASE_URL ??
    (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000")
      .replace(/^http:/, "ws:")
      .replace(/^https:/, "wss:"),
  useMocks: process.env.NEXT_PUBLIC_USE_MOCKS !== "false",
  requestTimeoutMs: Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS ?? 12000),
} as const;

export function resolveApiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const base = appEnv.apiBaseUrl.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

