import { Loader2, WifiOff, X } from "lucide-react";
import { serverStatus, useServerStatus } from "../../lib/serverStatus";

/** App-wide notice for a sleeping or unreachable API (spec 5.4 "backend
 * cold-start/retrying", 10.2). Announced politely to screen readers. */
export function ServerStatusBanner() {
  const status = useServerStatus();
  if (status === "ok") return null;

  return (
    <div className={`server-banner server-banner-${status}`} role="status" aria-live="polite">
      {status === "waking" ? (
        <>
          <Loader2 size={16} className="spin" aria-hidden="true" />
          <span>
            <strong>Waking up the server&hellip;</strong> Prepband runs on free hosting that sleeps when nobody is using
            it, so this can take up to a minute. Your saved work is safe.
          </span>
        </>
      ) : (
        <>
          <WifiOff size={16} aria-hidden="true" />
          <span>
            <strong>Can&rsquo;t reach Prepband right now.</strong> Check your connection; we&rsquo;ll keep trying when you
            continue. Anything already saved is safe.
          </span>
        </>
      )}
      <button type="button" className="server-banner-close" aria-label="Dismiss" onClick={() => serverStatus.dismiss()}>
        <X size={15} aria-hidden="true" />
      </button>
    </div>
  );
}
