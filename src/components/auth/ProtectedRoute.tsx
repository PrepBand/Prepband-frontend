import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../lib/AuthProvider";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-status-row auth-status-row-centered">
          <Loader2 size={20} className="spin" aria-hidden="true" /> Loading…
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth/login" replace />;
  }

  return <>{children}</>;
}
