const ACCESS_TOKEN_KEY = "yag.accessToken";
const REFRESH_TOKEN_KEY = "yag.refreshToken";
const ACCESS_TOKEN_COOKIE = "access_token";

function storage() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function getAccessToken() {
  return storage()?.getItem(ACCESS_TOKEN_KEY) ?? null;
}

function setCookieToken(token: string) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(token)}; Path=/; SameSite=Lax; Max-Age=3600${secure}`;
}

function clearCookieToken() {
  if (typeof document === "undefined") return;
  document.cookie = `${ACCESS_TOKEN_COOKIE}=; Path=/; SameSite=Lax; Max-Age=0`;
}

export function setAuthTokens(tokens: { accessToken?: string; refreshToken?: string }) {
  const localStorage = storage();
  if (!localStorage) return;

  if (tokens.accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    setCookieToken(tokens.accessToken);
  }
  if (tokens.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export function clearAuthTokens() {
  const localStorage = storage();
  if (!localStorage) return;

  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  clearCookieToken();
}

