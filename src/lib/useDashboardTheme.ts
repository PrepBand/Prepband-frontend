import { useEffect, useState } from "react";

const STORAGE_KEY = "prepband-dashboard-theme";

type Theme = "light" | "dark";

function readStoredTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function useDashboardTheme() {
  const [theme, setTheme] = useState<Theme>(readStoredTheme);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Storage can be unavailable (private mode); theme just won't persist.
    }
  }, [theme]);

  const toggleTheme = () => setTheme((current) => (current === "light" ? "dark" : "light"));

  return { theme, toggleTheme };
}
