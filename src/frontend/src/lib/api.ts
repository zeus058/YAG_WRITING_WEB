import { getAccessToken, setAuthTokens } from "./auth";
import { appEnv, resolveApiUrl } from "./env";

export type ApiResult<T> = {
  data: T;
  status: number;
};

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

type ApiFetchOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  token?: string | null;
  timeoutMs?: number;
};

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? appEnv.requestTimeoutMs
  );

  const headers = new Headers(options.headers);
  const token = options.token ?? getAccessToken();

  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(resolveApiUrl(path), {
      ...options,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: "include",
      headers,
      signal: options.signal ?? controller.signal,
    });

    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const message =
        typeof payload === "object" && payload !== null && "detail" in payload
          ? String(payload.detail)
          : `API request failed with status ${response.status}`;
      throw new ApiError(message, response.status, payload);
    }

    return { data: payload as T, status: response.status };
  } finally {
    window.clearTimeout(timeout);
  }
}

export type AuthResponse = {
  accessToken: string;
  refreshToken?: string;
  user?: {
    id: string;
    email: string;
    username: string;
    role: "reader" | "author" | "admin";
  };
};

export const yagApi = {
  health: () => apiFetch<{ status: string; service: string; version: string }>("/health"),

  auth: {
    login: async (payload: { email: string; password: string }) => {
      const result = await apiFetch<AuthResponse>("/api/v1/auth/login", {
        method: "POST",
        body: payload,
      });
      setAuthTokens(result.data);
      return result;
    },
    register: async (payload: { email: string; username: string; password: string }) => {
      const result = await apiFetch<AuthResponse>("/api/v1/auth/register", {
        method: "POST",
        body: payload,
      });
      setAuthTokens(result.data);
      return result;
    },
    requestPasswordReset: (payload: { email: string }) =>
      apiFetch<{ message: string }>("/api/v1/auth/password-reset/request", {
        method: "POST",
        body: payload,
      }),
    confirmPasswordReset: (payload: { email: string; otp: string; password: string }) =>
      apiFetch<{ message: string }>("/api/v1/auth/password-reset/confirm", {
        method: "POST",
        body: payload,
      }),
  },

  reader: {
    searchStories: (params: { query: string; semantic?: boolean; genre?: string }) =>
      apiFetch("/api/v1/stories/search", {
        method: "POST",
        body: params,
      }),
    getRecommendations: () => apiFetch("/api/v1/recommendations"),
    followStory: (storyId: string) =>
      apiFetch(`/api/v1/stories/${storyId}/follow`, { method: "POST" }),
    postComment: (chapterId: string, body: { content: string; rating?: number }) =>
      apiFetch(`/api/v1/chapters/${chapterId}/comments`, {
        method: "POST",
        body,
      }),
  },

  author: {
    saveDraft: (chapterId: string, body: { title: string; content: string }) =>
      apiFetch(`/api/v1/author/chapters/${chapterId}/draft`, {
        method: "PUT",
        body,
      }),
    requestAiSuggestion: (body: { chapterId?: string; context: string; mode: string }) =>
      apiFetch("/api/v1/ai/suggestions", {
        method: "POST",
        body,
      }),
    publishChapter: (chapterId: string, body: { scheduleAt?: string; isPremium: boolean }) =>
      apiFetch(`/api/v1/author/chapters/${chapterId}/publish`, {
        method: "POST",
        body,
      }),
    updateSchedule: (storyId: string, body: { cadence: string; nextChapterAt: string }) =>
      apiFetch(`/api/v1/author/stories/${storyId}/schedule`, {
        method: "PUT",
        body,
      }),
  },

  billing: {
    createVnpayCheckout: (body: { planCode: string; returnUrl: string }) =>
      apiFetch<{ paymentUrl: string; transactionId: string }>("/api/v1/payments/vnpay/checkout", {
        method: "POST",
        body,
      }),
  },

  admin: {
    moderationQueue: () => apiFetch("/api/v1/admin/moderation"),
    reviewContent: (reviewId: string, body: { decision: "approved" | "rejected"; reason: string }) =>
      apiFetch(`/api/v1/admin/moderation/${reviewId}`, {
        method: "POST",
        body,
      }),
    reports: (params: { from: string; to: string; type: "revenue" | "users" | "content" }) =>
      apiFetch("/api/v1/admin/reports", {
        method: "POST",
        body: params,
      }),
  },
};

