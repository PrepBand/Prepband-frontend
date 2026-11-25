import { useEffect, useRef, useState } from "react";

/**
 * Tracks an element's rendered width so charts can draw in real pixels
 * (text stays 11-12px at any card width) instead of scaling a fixed
 * viewBox up or down.
 */
export function useElementWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setWidth(Math.max(240, Math.round(element.getBoundingClientRect().width)));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}
