import { Moon, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/AuthProvider";
import { useDashboardTheme } from "../../lib/useDashboardTheme";
import { useProfile } from "../../lib/useProfile";
import { NotificationsBell } from "./NotificationsBell";

const TRACK_LABELS: Record<string, string> = {
  academic: "Academic training",
  general: "General training",
};

export function DashboardTopbar({ label }: { label: string }) {
  const { session } = useAuth();
  const { profile, studyGoal } = useProfile();
  const { theme, toggleTheme } = useDashboardTheme();
  const navigate = useNavigate();

  const initials = profile?.avatar_initials || session?.user.email?.[0]?.toUpperCase() || "?";
  const trackLabel = studyGoal?.ielts_type ? TRACK_LABELS[studyGoal.ielts_type] ?? null : null;

  return (
    <header className="dashboard-topbar">
      <span className="dashboard-breadcrumb">
        Your workspace <span aria-hidden="true">/</span> <strong>{label}</strong>
      </span>
      <div className="dashboard-topbar-actions">
        {trackLabel && <span className="track-pill">{trackLabel}</span>}
        <button
          type="button"
          className="icon-button"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          onClick={toggleTheme}
        >
          {theme === "dark" ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
        </button>
        <NotificationsBell />
        <button
          className="dashboard-avatar dashboard-avatar-button"
          type="button"
          onClick={() => navigate("/app/profile")}
          aria-label="Open your profile"
        >
          {profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : initials}
        </button>
      </div>
    </header>
  );
}
