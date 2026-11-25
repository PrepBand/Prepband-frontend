/**
 * A copy of every unsaved change, kept on this device until the server
 * confirms it.
 *
 * Autosave only reaches the server when the server is reachable. If it's
 * waking up or down and the student closes the tab, the answers would
 * otherwise be lost. Each change is written here first (with its change
 * number); a confirmed save removes it. When the attempt is opened again,
 * anything still here that is newer than the server's copy is put back and
 * re-sent.
 *
 * Only answers and typed text live here. Recordings never do, and live
 * Speaking transcripts are left out because they may not have consent to
 * be kept.
 */

export type DraftKind = "q" | "w" | "s";

export type DraftEntry = { value: unknown; seq: number };

type Draft = { updatedAt: number; entries: Record<string, DraftEntry> };

const PREFIX = "prepband.draft.";
/** Drafts for attempts nobody reopened are dropped after this long. */
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null; // e.g. storage disabled in a private window
  }
}

function read(attemptId: string): Draft {
  const raw = storage()?.getItem(PREFIX + attemptId);
  if (!raw) return { updatedAt: Date.now(), entries: {} };
  try {
    const parsed = JSON.parse(raw) as Draft;
    if (parsed && typeof parsed === "object" && parsed.entries && typeof parsed.entries === "object") return parsed;
  } catch {
    // A corrupt entry is worth less than a crash: start again.
  }
  return { updatedAt: Date.now(), entries: {} };
}

function write(attemptId: string, draft: Draft): void {
  const store = storage();
  if (!store) return;
  try {
    if (Object.keys(draft.entries).length === 0) store.removeItem(PREFIX + attemptId);
    else store.setItem(PREFIX + attemptId, JSON.stringify({ ...draft, updatedAt: Date.now() }));
  } catch {
    // Storage full: the server copy and retries still protect the answer.
  }
}

export function draftKey(kind: DraftKind, id: string): string {
  return `${kind}:${id}`;
}

/** Remembers a change before it is sent. */
export function rememberChange(attemptId: string, key: string, value: unknown, seq: number): void {
  const draft = read(attemptId);
  draft.entries[key] = { value, seq };
  write(attemptId, draft);
}

/** Forgets a change once the server has a copy at least this new. */
export function confirmSaved(attemptId: string, key: string, seq: number): void {
  const draft = read(attemptId);
  const entry = draft.entries[key];
  if (entry && entry.seq <= seq) {
    delete draft.entries[key];
    write(attemptId, draft);
  }
}

/** Every change still waiting for the server. */
export function pendingChanges(attemptId: string): Record<string, DraftEntry> {
  return read(attemptId).entries;
}

export function clearDraft(attemptId: string): void {
  storage()?.removeItem(PREFIX + attemptId);
}

/** Drops drafts of attempts that were never reopened. */
export function pruneOldDrafts(now = Date.now()): void {
  const store = storage();
  if (!store) return;
  const stale: string[] = [];
  for (let i = 0; i < store.length; i += 1) {
    const key = store.key(i);
    if (!key?.startsWith(PREFIX)) continue;
    try {
      const draft = JSON.parse(store.getItem(key) ?? "") as Draft;
      if (!draft.updatedAt || now - draft.updatedAt > MAX_AGE_MS) stale.push(key);
    } catch {
      stale.push(key);
    }
  }
  stale.forEach((key) => store.removeItem(key));
}

/**
 * Change numbers: milliseconds since 1970, but never lower than the last one
 * handed out or than anything the server already holds, so they only ever
 * go up, even if this device's clock is behind another device's.
 */
export function createSeq(floor = 0): { next: () => number; raise: (seen: number) => void } {
  let last = floor;
  return {
    next() {
      last = Math.max(Date.now(), last + 1);
      return last;
    },
    raise(seen: number) {
      if (seen > last) last = seen;
    },
  };
}
