/**
 * Sends short crash and fallback reports to the backend's log
 * (POST /client-events), so problems on students' devices are visible
 * without a paid error tracker.
 *
 * Deliberately tiny and failure-proof: plain fetch with keepalive (no
 * auth, no retries, no waking banner), at most a handful of reports per
 * page load, duplicates dropped, and nothing that identifies the student.
 * The page address is sent without its query string.
 */

export type ClientEventKind = "error" | "unhandled_rejection" | "render_error" | "live_fallback";

type Details = Record<string, string | number | boolean | null>;

const MAX_PER_PAGE_LOAD = 8;
const sent = new Set<string>();
let count = 0;

const RELEASE = (import.meta.env.VITE_RELEASE as string | undefined) ?? (import.meta.env.MODE === "production" ? "prod" : "dev");

function endpoint(): string | null {
  const base = import.meta.env.VITE_API_BASE_URL as string | undefined;
  return base ? `${base.replace(/\/$/, "")}/client-events` : null;
}

export function reportClientEvent(kind: ClientEventKind, message: string, extra: { stack?: string; details?: Details } = {}): void {
  const url = endpoint();
  if (!url || import.meta.env.MODE === "test") return;
  const fingerprint = `${kind}:${message}:${JSON.stringify(extra.details ?? {})}`;
  if (sent.has(fingerprint) || count >= MAX_PER_PAGE_LOAD) return;
  sent.add(fingerprint);
  count += 1;

  const body = JSON.stringify({
    kind,
    message: message.slice(0, 500),
    stack: extra.stack?.slice(0, 4000),
    page: window.location.pathname,
    release: RELEASE.slice(0, 40),
    details: extra.details,
  });
  try {
    void fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  } catch {
    // Reporting must never cause an error of its own.
  }
}

function describe(reason: unknown): { message: string; stack?: string } {
  if (reason instanceof Error) return { message: `${reason.name}: ${reason.message}`, stack: reason.stack };
  return { message: typeof reason === "string" ? reason : "Non-error rejection" };
}

/** Reports uncaught errors and unhandled promise rejections. */
export function installGlobalErrorReporting(): void {
  window.addEventListener("error", (event) => {
    // Failed <img>/<script> loads also fire "error" with no message.
    if (!event.message) return;
    reportClientEvent("error", event.message, { stack: event.error instanceof Error ? event.error.stack : undefined });
  });
  window.addEventListener("unhandledrejection", (event) => {
    const { message, stack } = describe(event.reason);
    // An API error the page already showed the student isn't a bug.
    if (event.reason && typeof event.reason === "object" && "status" in event.reason) return;
    reportClientEvent("unhandled_rejection", message, { stack });
  });
}
