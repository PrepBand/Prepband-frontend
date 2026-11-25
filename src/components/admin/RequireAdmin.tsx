import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useIsAdmin } from "../../lib/useIsAdmin";
import { NotFoundPage } from "../../pages/NotFoundPage";

/**
 * Admin-only routes. Anyone who isn't an admin, including signed-out
 * visitors, gets the ordinary 404 page rather than a login redirect or a
 * "forbidden" message, so the admin area's existence isn't advertised.
 * This is presentation only: the backend enforces the role on every call.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useIsAdmin();

  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-status-row auth-status-row-centered">
          <Loader2 size={20} className="spin" aria-hidden="true" /> Loading…
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <NotFoundPage />;
  }

  return <>{children}</>;
}
