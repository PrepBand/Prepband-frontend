import { useSyncExternalStore } from "react";

/**
 * Whether the API is answering (spec 10.2: "Frontend shows 'Waking up the
 * server' with safe retry and timeout behavior on cold start"). The free
 * Render instance sleeps after ~15 minutes idle; the first request then
 * takes 30-60 s (observed live: 38 s). apiClient reports here and
 * ServerStatusBanner shows it.
 */
export type ServerStatus = "ok" | "waking" | "offline";

let status: ServerStatus = "ok";
let pending = 0;
const listeners = new Set<() => void>();

function set(next: ServerStatus) {
  if (next === status) return;
  status = next;
  for (const listener of listeners) listener();
}

export const serverStatus = {
  get: () => status,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  /** A request has been slow; show the waking message until one succeeds. */
  slow() {
    pending += 1;
    set("waking");
  },
  slowDone() {
    pending = Math.max(0, pending - 1);
  },
  ok() {
    if (pending === 0) set("ok");
  },
  offline() {
    set("offline");
  },
  dismiss() {
    pending = 0;
    set("ok");
  },
};

export function useServerStatus(): ServerStatus {
  return useSyncExternalStore(serverStatus.subscribe, serverStatus.get, serverStatus.get);
}
