const ACCESS_TOKEN_KEY = "yag.accessToken";
const REFRESH_TOKEN_KEY = "yag.refreshToken";

function storage() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function getAccessToken() {
  return storage()?.getItem(ACCESS_TOKEN_KEY) ?? null;
}

export function setAuthTokens(tokens: { accessToken?: string; refreshToken?: string }) {
  const localStorage = storage();
  if (!localStorage) return;

  if (tokens.accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  if (tokens.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export function clearAuthTokens() {
  const localStorage = storage();
  if (!localStorage) return;

  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

