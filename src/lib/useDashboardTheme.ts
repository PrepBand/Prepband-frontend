import { useSyncExternalStore } from "react";

const STORAGE_KEY = "prepband-dashboard-theme";

type Theme = "light" | "dark";

function readStoredTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

let theme: Theme = readStoredTheme();
const listeners = new Set<() => void>();

function setTheme(next: Theme) {
  theme = next;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage can be unavailable (private mode); theme just won't persist.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return theme;
}

/**
 * Shared across every component that calls it (module-level store, not a
 * per-component useState) so toggling the theme in one place, e.g. the
 * topbar, updates every page's own `data-theme` attribute immediately.
 */
export function useDashboardTheme() {
  const currentTheme = useSyncExternalStore(subscribe, getSnapshot);

  const toggleTheme = () => setTheme(currentTheme === "light" ? "dark" : "light");

  return { theme: currentTheme, toggleTheme };
}
