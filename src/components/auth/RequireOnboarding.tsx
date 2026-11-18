import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useProfile } from "../../lib/useProfile";

export function RequireOnboarding({ children }: { children: ReactNode }) {
  const { profile, loading } = useProfile();

  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-status-row auth-status-row-centered">
          <Loader2 size={20} className="spin" aria-hidden="true" /> Loading…
        </div>
      </div>
    );
  }

  if (profile && !profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
