import { clearAuthTokens, getAccessToken, setAuthTokens } from "./auth";
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

export async function apiFetch<T = any>(path: string, options: ApiFetchOptions = {}): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? appEnv.requestTimeoutMs
  );

  const headers = new Headers(options.headers);
  const token = options.token ?? getAccessToken();

  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body !== undefined && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(resolveApiUrl(path), {
      ...options,
      body: options.body === undefined ? undefined : (options.body instanceof FormData ? options.body : JSON.stringify(options.body)),
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
      if (response.status === 401 && message === "INVALID_OR_EXPIRED_TOKEN") {
        clearAuthTokens();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("yag:auth-expired"));
        }
      }
      throw new ApiError(message, response.status, payload);
    }

    return { data: payload as T, status: response.status };
  } finally {
    clearTimeout(timeout);
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
    profile?: {
      display_name: string;
      avatar_url?: string | null;
      bio?: string | null;
      reputation_score: number;
    } | null;
  };
};

export const yagApi = {
  apiFetch,
  health: () => apiFetch<{ status: string; service: string; version: string }>("/health"),

  auth: {
    login: async (payload: { email: string; password: string }) => {
      const result = await apiFetch<AuthResponse>("/api/v1/auth/login", {
        method: "POST",
        body: payload,
        timeoutMs: 10000,
      });
      setAuthTokens(result.data);
      return result;
    },
    register: async (payload: { email: string; username: string; password: string }) => {
      return apiFetch<{ message: string; email: string }>("/api/v1/auth/register", {
        method: "POST",
        body: payload,
        timeoutMs: 10000,
      });
    },
    verifyEmail: async (payload: { email: string; otp: string }) => {
      const result = await apiFetch<AuthResponse>("/api/v1/auth/verify-email", {
        method: "POST",
        body: payload,
        timeoutMs: 10000,
      });
      setAuthTokens(result.data);
      return result;
    },
    resendVerification: (payload: { email: string }) => {
      return apiFetch<{ message: string; email: string }>("/api/v1/auth/resend-verification", {
        method: "POST",
        body: payload,
        timeoutMs: 10000,
      });
    },
    requestPasswordReset: (payload: { email: string }) =>
      apiFetch<{ message: string }>("/api/v1/auth/password-reset/request", {
        method: "POST",
        body: payload,
        timeoutMs: 10000,
      }),
    confirmPasswordReset: (payload: { email: string; otp: string; password: string }) =>
      apiFetch<{ message: string }>("/api/v1/auth/password-reset/confirm", {
        method: "POST",
        body: payload,
        timeoutMs: 10000,
      }),
    me: () =>
      apiFetch<NonNullable<AuthResponse["user"]>>("/api/v1/auth/me", {
        method: "GET",
      }),
  },

  reader: {
    searchStories: (params: { query: string; semantic?: boolean; genre?: string }) =>
      apiFetch<any>("/api/v1/stories/search", {
        method: "POST",
        body: params,
      }),
    getRecommendations: () => apiFetch<any>("/api/v1/recommendations"),
    followStory: (storyId: string) =>
      apiFetch<any>(`/api/v1/stories/${storyId}/bookmark`, { method: "POST" }),
    postComment: (chapterId: string, body: { content: string; parent_id?: string | null }) =>
      apiFetch<any>(`/api/v1/chapters/${chapterId}/comments`, {
        method: "POST",
        body,
      }),
    listStories: (params?: { category?: string; status?: string; q?: string; ids?: string }) => {
      const query = new URLSearchParams();
      if (params?.category) query.set("category", params.category);
      if (params?.status) query.set("status", params.status);
      if (params?.q) query.set("q", params.q);
      if (params?.ids) query.set("ids", params.ids);
      return apiFetch<any[]>(`/api/v1/stories/?${query.toString()}`, { method: "GET" });
    },
    getStoryDetail: (storyId: string) =>
      apiFetch<any>(`/api/v1/stories/${storyId}`, { method: "GET" }),
    getChapters: (storyId: string) =>
      apiFetch<any[]>(`/api/v1/stories/${storyId}/chapters`, { method: "GET" }),
    getReviews: (storyId: string) =>
      apiFetch<{ reviews: any[] }>(`/api/v1/stories/${storyId}/reviews`, { method: "GET" }),
    getLibrary: () =>
      apiFetch<any[]>("/api/v1/stories/library/me", { method: "GET" }),
  },

  chapters: {
    getChapter: (chapterId: string) =>
      apiFetch<any>(`/api/v1/chapters/${chapterId}`, { method: "GET" }),
    getComments: (chapterId: string) =>
      apiFetch<{ comments: any[] }>(`/api/v1/chapters/${chapterId}/comments/tree`, { method: "GET" }),
  },

  author: {
    getStories: () => apiFetch("/api/v1/stories/my-stories"),
    createStory: (body: FormData) =>
      apiFetch("/api/v1/stories/", {
        method: "POST",
        body,
        headers: new Headers(), // Let the browser set multipart/form-data boundary
      }),
    updateStory: (storyId: string, body: FormData | Record<string, unknown>) =>
      apiFetch(`/api/v1/stories/${storyId}`, {
        method: "PUT",
        body,
        headers: body instanceof FormData ? new Headers() : undefined,
      }),
    deleteStory: (storyId: string) =>
      apiFetch(`/api/v1/stories/${storyId}`, {
        method: "DELETE",
      }),
    getChapters: (storyId: string) => apiFetch(`/api/v1/stories/author/${storyId}/chapters`),
    createChapter: (body: { story_id: string; chapter_number: number; title: string; content: string; is_premium?: boolean }) =>
      apiFetch("/api/v1/chapters/", {
        method: "POST",
        body,
      }),
    saveDraft: (chapterId: string, body: { title: string; content: string }) =>
      apiFetch(`/api/v1/author/chapters/${chapterId}/draft`, {
        method: "PUT",
        body,
      }),
    requestAiSuggestion: (body: {
      chapterId?: string;
      storyId?: string;
      context: string;
      mode: string;
      selectedText?: string;
      targetWords?: number;
      styleReferenceStoryTitle?: string;
      styleReferenceSeriesTitle?: string;
      styleReferenceAuthor?: string;
    }) =>
      apiFetch("/api/v1/ai/suggestions", {
        method: "POST",
        body,
      }),
    publishChapter: (chapterId: string, body: { publish_at?: string; is_premium: boolean }) =>
      apiFetch(`/api/v1/author/chapters/${chapterId}/publish`, {
        method: "POST",
        body,
      }),
    updateSchedule: (storyId: string, body: { cadence: string; nextChapterAt: string }) =>
      apiFetch(`/api/v1/author/stories/${storyId}/schedule`, {
        method: "PUT",
        body,
      }),
    getScheduleOverview: () => apiFetch<any>("/api/v1/author/schedule/overview"),
    listLores: (storyId: string) =>
      apiFetch<any[]>(`/api/v1/stories/${storyId}/lores`, { method: "GET" }),
    createLore: (storyId: string, body: { entity_name: string; entity_type: string; description: string }) =>
      apiFetch<any>(`/api/v1/stories/${storyId}/lores`, {
        method: "POST",
        body,
      }),
    updateLore: (storyId: string, loreId: string, body: { entity_name?: string; entity_type?: string; description?: string }) =>
      apiFetch<any>(`/api/v1/stories/${storyId}/lores/${loreId}`, {
        method: "PUT",
        body,
      }),
    deleteLore: (storyId: string, loreId: string) =>
      apiFetch<any>(`/api/v1/stories/${storyId}/lores/${loreId}`, {
        method: "DELETE",
      }),
  },

  billing: {
    createPayosCheckout: (body: { planCode: string; returnUrl: string }) =>
      apiFetch<{ paymentUrl: string; transactionId: string }>("/api/v1/payments/payos/checkout", {
        method: "POST",
        body,
      }),
    getTransaction: (vnpTxnRef: string) =>
      apiFetch<{
        id: string;
        vnp_txn_ref: string;
        plan_id: string;
        plan_name?: string | null;
        amount: number;
        status: "pending" | "success" | "failed";
        vnp_transaction_no?: string | null;
        ipn_received_at?: string | null;
      }>(`/api/v1/payments/transactions/${vnpTxnRef}`, {
        method: "GET",
      }),
    verifyPayos: (queryParams: Record<string, string>) =>
      apiFetch<{
        success: boolean;
        transaction_id?: string;
        plan_name?: string;
        amount?: number;
        premium_until?: string;
        message: string;
      }>("/api/v1/payments/payos/verify", {
        method: "POST",
        body: queryParams,
      }),
    getTransactionHistory: () =>
      apiFetch<any[]>("/api/v1/payments/history", {
        method: "GET",
      }),
  },

  admin: {
    stats: () => apiFetch("/api/v1/admin/stats"),
    revenueSeries: (range: "week" | "month" | "quarter" = "month") =>
      apiFetch<{ range: string; series: any[] }>(`/api/v1/admin/revenue-series?range=${range}`),
    scheduleAlerts: () => apiFetch<any[]>("/api/v1/admin/schedule-alerts"),
    runScheduleScan: () =>
      apiFetch("/api/v1/admin/schedule-scan", {
        method: "POST",
      }),
    auditLogs: () => apiFetch<any[]>("/api/v1/admin/audit-logs"),
    moderationQueue: () => apiFetch("/api/v1/admin/moderation"),
    overrideModeration: (
      chapterId: string,
      body: { decision: "approved" | "rejected" | "flagged"; reason: string; violation_category?: string | null; confidence_score?: number }
    ) =>
      apiFetch(`/api/v1/admin/moderation/${chapterId}/override`, {
        method: "POST",
        body,
      }),
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
  notifications: {
    list: (limit = 50) =>
      apiFetch<{ notifications: any[] }>(`/api/v1/notifications/?limit=${limit}`, {
        method: "GET",
      }),
    markAsRead: (id: string) =>
      apiFetch<any>(`/api/v1/notifications/${id}/read`, {
        method: "POST",
      }),
    markAllAsRead: () =>
      apiFetch<{ status: string; marked_read_count: number }>("/api/v1/notifications/read-all", {
        method: "POST",
      }),
    unreadCount: () =>
      apiFetch<{ unread_count: number }>("/api/v1/notifications/unread-count", {
        method: "GET",
      }),
  },
  forum: {
    getPosts: () => apiFetch<any[]>("/api/v1/forum/posts"),
    createPost: (content: string) =>
      apiFetch<any>("/api/v1/forum/posts", {
        method: "POST",
        body: { content },
      }),
    likePost: (postId: string) =>
      apiFetch<any>(`/api/v1/forum/posts/${postId}/like`, {
        method: "POST",
      }),
    createReply: (postId: string, content: string) =>
      apiFetch<any>(`/api/v1/forum/posts/${postId}/replies`, {
        method: "POST",
        body: { content },
      }),
  },
  support: {
    submitTicket: (body: { name: string; email: string; subject: string; content: string; agreePrivacy: boolean }) =>
      apiFetch<any>("/api/v1/support/ticket", {
        method: "POST",
        body,
      }),
  },
};

