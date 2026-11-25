import { lazy, type ComponentType } from "react";

const RELOAD_FLAG = "prepband.chunkReload";

/**
 * React.lazy for a page module with a named export.
 *
 * After a deploy, a tab that was already open still asks for the old
 * hashed chunk files, which no longer exist. Instead of showing an error,
 * reload once to pick up the new build. The flag in sessionStorage stops a
 * reload loop if the chunk is genuinely unavailable (then the error
 * boundary shows its normal message).
 */
export function lazyPage<T extends Record<string, unknown>>(loader: () => Promise<T>, name: keyof T & string) {
  return lazy(async () => {
    try {
      const module = await loader();
      sessionStorage.removeItem(RELOAD_FLAG);
      return { default: module[name] as ComponentType<object> };
    } catch (err) {
      if (!sessionStorage.getItem(RELOAD_FLAG)) {
        sessionStorage.setItem(RELOAD_FLAG, "1");
        window.location.reload();
        // Never resolves: the page is reloading.
        return new Promise<never>(() => {});
      }
      throw err;
    }
  });
}
