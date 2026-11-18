import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function useScrollToHash() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;
    try {
      document.querySelector(location.hash)?.scrollIntoView({ behavior: "smooth" });
    } catch {
      // location.hash came from the URL verbatim — an invalid CSS selector
      // (e.g. "#123" or "#<script>") would otherwise throw and crash the page.
    }
  }, [location]);
}
