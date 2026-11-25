import { serverStatus } from "./serverStatus";
import { supabase } from "./supabaseClient";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;

export class ApiError extends Error {
  status: number;
  code: string;
  /** Per-problem messages, e.g. every reason a test can't be published. */
  details: string[];

  constructor(status: number, code: string, message: string, details: string[] = []) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** The error message plus any per-problem details, ready to display. */
export function describeError(err: unknown, fallback = "Something went wrong."): string {
  if (err instanceof ApiError) {
    return err.details.length ? `${err.message} ${err.details.join(" ")}` : err.message;
  }
  return err instanceof Error ? err.message : fallback;
}

// A request slower than this shows the "waking up the server" banner.
const SLOW_MS = 4000;
// Give a sleeping free-tier instance this long to wake before giving up.
const WAKE_BUDGET_MS = 90_000;
const RETRY_DELAYS_MS = [2000, 4000, 8000, 15_000, 20_000, 20_000];
// Safe to repeat: the server treats a repeat as the same request.
const IDEMPOTENT = new Set(["GET", "PUT", "HEAD", "OPTIONS"]);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * fetch() with cold-start handling: shows the waking banner when a request
 * is slow, and retries idempotent requests on network errors and
 * 502/503/504 (what a sleeping or restarting instance returns) within
 * WAKE_BUDGET_MS. POST, PATCH and DELETE are never repeated automatically.
 */
export async function fetchWithWake(url: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const started = Date.now();
  let slowShown = false;
  const showSlow = () => {
    if (!slowShown) {
      slowShown = true;
      serverStatus.slow();
    }
  };
  const timer = setTimeout(showSlow, SLOW_MS);
  const canRetry = (attempt: number) =>
    IDEMPOTENT.has(method) && attempt < RETRY_DELAYS_MS.length && Date.now() - started < WAKE_BUDGET_MS;
  try {
    for (let attempt = 0; ; attempt += 1) {
      let response: Response;
      try {
        response = await fetch(url, init);
      } catch {
        if (!canRetry(attempt)) {
          serverStatus.offline();
          throw new ApiError(
            0,
            "network_error",
            "We can't reach Prepband right now. Check your connection and try again. Anything already saved is safe.",
          );
        }
        showSlow();
        await sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      const waking = response.status === 502 || response.status === 503 || response.status === 504;
      if (waking && canRetry(attempt)) {
        showSlow();
        await sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      return response;
    }
  } finally {
    clearTimeout(timer);
    if (slowShown) serverStatus.slowDone();
  }
}

/** Friendlier wording for the error states every screen must handle (spec 5.4). */
export function messageFor(status: number, serverMessage: string | undefined): string {
  if (status === 401) return "Your session has expired. Please log in again.";
  if (status === 403) return serverMessage ?? "You don't have permission to do that.";
  if (status === 429) return serverMessage ?? "Too many requests. Please wait a minute and try again.";
  if (status === 413) return "That's too large to send. Try a smaller file.";
  if (status >= 500) return serverMessage ?? "Something went wrong on our side. Please try again.";
  return serverMessage ?? `Request failed with status ${status}.`;
}

async function errorFrom(response: Response): Promise<ApiError> {
  const body = await response.json().catch(() => null);
  const code = response.status === 401 ? "session_expired" : (body?.error?.code ?? "unknown_error");
  const details: string[] = Array.isArray(body?.error?.details)
    ? body.error.details.map((item: { loc?: unknown[]; msg?: string }) =>
        [item.loc && item.loc.length > 1 ? `${item.loc.slice(1).join(".")}:` : "", item.msg ?? ""].join(" ").trim(),
      )
    : [];
  return new ApiError(response.status, code, messageFor(response.status, body?.error?.message), details);
}

function baseUrl(): string {
  if (!API_BASE_URL) {
    throw new ApiError(0, "missing_config", "VITE_API_BASE_URL is not set.");
  }
  return API_BASE_URL;
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${baseUrl()}${path}`;
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  for (const [name, value] of Object.entries(await authHeader())) headers.set(name, value);

  const response = await fetchWithWake(url, { ...options, headers });
  serverStatus.ok();
  if (response.status === 204) {
    return undefined as T;
  }
  if (!response.ok) {
    throw await errorFrom(response);
  }
  return (await response.json().catch(() => null)) as T;
}

/**
 * Fetches an authenticated file (e.g. a certificate PDF) and hands it to
 * the browser as a download. A plain link can't carry the bearer token.
 */
export async function downloadFile(path: string, fallbackName: string): Promise<void> {
  const response = await fetchWithWake(`${baseUrl()}${path}`, { headers: await authHeader() });
  serverStatus.ok();
  if (!response.ok) {
    throw await errorFrom(response);
  }
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? fallbackName;
  saveBlob(await response.blob(), filename);
}

/** Hands a blob to the browser as a file download. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Fetches a text file (e.g. a CSV export) with the session token. */
export async function getText(path: string): Promise<string> {
  const response = await fetchWithWake(`${baseUrl()}${path}`, { headers: await authHeader() });
  serverStatus.ok();
  if (!response.ok) {
    throw await errorFrom(response);
  }
  return response.text();
}

/** Public endpoints (no session needed), e.g. certificate verification. */
export async function publicGet<T>(path: string): Promise<T> {
  const response = await fetchWithWake(`${baseUrl()}${path}`);
  serverStatus.ok();
  if (!response.ok) {
    throw await errorFrom(response);
  }
  return (await response.json().catch(() => null)) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T = void>(path: string) => request<T>(path, { method: "DELETE" }),
};
