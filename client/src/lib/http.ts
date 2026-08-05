// =============================================================================
// URS-DMS — minimal HTTP client for the backend API.
// Every service layer (auth, documents, aaccup, root, notifications) talks to
// the real backend through these helpers. No local data stores are used.
// =============================================================================

const API_BASE = (import.meta as unknown as { env: { VITE_API_BASE?: string } }).env.VITE_API_BASE ?? "http://localhost:4000/api/v1";

export { API_BASE };

const SERVER_TOKEN_KEY = "urs_dms_server_token";

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(SERVER_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setServerToken(token: string): void {
  try {
    localStorage.setItem(SERVER_TOKEN_KEY, token);
  } catch {}
}

export function clearServerToken(): void {
  try {
    localStorage.removeItem(SERVER_TOKEN_KEY);
  } catch {}
}

export interface ApiEnvelope<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiPageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiPage<T> {
  items: T[];
  meta: ApiPageMeta;
}

export interface ApiErrorEnvelope {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

export class ApiRequestError extends Error {
  public readonly status: number;
  public readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Single-flight refresh. On a page refresh with an expired access token,
 * several API calls 401 in parallel. Each one was previously firing its own
 * /auth/refresh with the same (old) refresh cookie, which rotated the session
 * on the server; the loser of the race then tripped the reuse-detection and
 * revoked ALL of the user's sessions — forcing a logout back to the login page.
 * Serialising refresh behind a single shared promise ensures only one refresh
 * runs; the rest await the same result and retry with the new token.
 */
let refreshInFlight: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  try {
    const refreshResponse = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: "{}",
    });
    const refreshPayload = await refreshResponse.json() as
      | ApiEnvelope<{ accessToken: string }>
      | ApiErrorEnvelope;
    if (refreshResponse.ok && refreshPayload.success) {
      setServerToken(refreshPayload.data.accessToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function requestEnvelope<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
  retried = false,
): Promise<ApiEnvelope<T>> {
  const url = `${API_BASE}${path}`;
  const token = getAccessToken();

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      credentials: "include",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new ApiRequestError(0, "NETWORK", err instanceof Error ? err.message : String(err));
  }

  if (res.status === 401 && !retried && token && !path.startsWith("/auth/")) {
    if (!refreshInFlight) {
      refreshInFlight = refreshAccessToken().finally(() => {
        refreshInFlight = null;
      });
    }
    const refreshed = await refreshInFlight;
    if (refreshed) {
      return requestEnvelope<T>(method, path, body, true);
    }
    clearServerToken();
  }

  if (res.status === 204) {
    return { success: true, data: undefined as T };
  }

  let payload: ApiEnvelope<T> | ApiErrorEnvelope;
  try {
    payload = await res.json();
  } catch {
    throw new ApiRequestError(res.status, "PARSE_ERROR", `Invalid response from ${path}`);
  }

  if (!res.ok || !("success" in payload) || !payload.success) {
    const err = payload as ApiErrorEnvelope;
    throw new ApiRequestError(res.status, err.error.code, err.error.message);
  }

  return payload as ApiEnvelope<T>;
}

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  return (await requestEnvelope<T>(method, path, body)).data;
}

export const apiGet = <T>(path: string): Promise<T> => request<T>("GET", path);
export const apiPost = <T>(path: string, body?: unknown): Promise<T> => request<T>("POST", path, body);
export const apiPatch = <T>(path: string, body?: unknown): Promise<T> => request<T>("PATCH", path, body);
export const apiDelete = <T>(path: string): Promise<T> => request<T>("DELETE", path);

export async function apiGetPage<T>(path: string): Promise<ApiPage<T>> {
  const payload = await requestEnvelope<T[]>("GET", path);
  const meta = payload.meta ?? {};
  return {
    items: payload.data,
    meta: {
      page: Number(meta.page ?? 1),
      pageSize: Number(meta.pageSize ?? payload.data.length),
      total: Number(meta.total ?? payload.data.length),
      totalPages: Number(meta.totalPages ?? 1),
    },
  };
}
