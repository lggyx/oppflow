/** 统一 API 客户端：自动携带 JWT、401 时用 refresh token 重试一次。 */

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const TOKEN_KEY = "oppflow.auth";

export interface AuthPayload {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface User {
  id: number;
  email: string;
  display_name: string;
  handle: string;
  avatar_emoji: string;
  bio: string;
  role: "user" | "admin";
  level: number;
  github_login: string | null;
}

export function loadStoredAuth(): { accessToken: string; refreshToken: string; user: User } | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storeAuth(a: AuthPayload | { accessToken: string; refreshToken: string; user: User } | null) {
  if (a === null) localStorage.removeItem(TOKEN_KEY);
  else localStorage.setItem(TOKEN_KEY, JSON.stringify(a));
}

let unauthorizedHandler: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  unauthorizedHandler = fn;
}

async function tryRefresh(): Promise<boolean> {
  const stored = loadStoredAuth();
  if (!stored?.refreshToken) return false;
  try {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: stored.refreshToken }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as AuthPayload;
    storeAuth(data);
    stored.accessToken = data.accessToken;
    stored.refreshToken = data.refreshToken;
    stored.user = data.user;
    localStorage.setItem(TOKEN_KEY, JSON.stringify(stored));
    window.dispatchEvent(new CustomEvent("oppflow:auth-refreshed", { detail: data.user }));
    return true;
  } catch {
    return false;
  }
}

async function request<T>(method: string, path: string, body?: unknown, retried = false): Promise<T> {
  const stored = loadStoredAuth();
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (stored?.accessToken) headers["Authorization"] = `Bearer ${stored.accessToken}`;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 401 && !retried && stored?.refreshToken) {
    const ok = await tryRefresh();
    if (ok) return request<T>(method, path, body, true);
    storeAuth(null);
    unauthorizedHandler?.();
  }

  if (res.status === 204) return null as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = data as { code?: string; message?: string } | null;
    throw new ApiError(res.status, err?.code ?? "unknown", err?.message ?? `请求失败（${res.status}）`);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  del: <T>(path: string) => request<T>("DELETE", path),
};

export function qs(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== "");
  return entries.length ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString()}` : "";
}
