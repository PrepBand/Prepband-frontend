import { Loader2, TriangleAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LatestStepsCard, WeekCalendarCard } from "../components/dashboard/ActivityPanels";
import { DashboardHero } from "../components/dashboard/DashboardHero";
import { DashboardSidebar } from "../components/dashboard/DashboardSidebar";
import { DashboardTopbar } from "../components/dashboard/DashboardTopbar";
import { skills } from "../data/content";
import { useAuth } from "../lib/AuthProvider";
import { useDashboardTheme } from "../lib/useDashboardTheme";
import { useProfile } from "../lib/useProfile";

const TRACK_LABELS: Record<string, string> = {
  academic: "Academic training",
  general: "General training",
};

export function DashboardPage() {
  const { session } = useAuth();
  const { profile, about, studyGoal, targetScores, loading, error, refetch } = useProfile();
  const navigate = useNavigate();
  const { theme } = useDashboardTheme();

  const goToPractice = () => navigate("/app/practice");
  const goToMockTests = () => navigate("/app/mock-tests");

  const greetingName = about?.first_name || profile?.display_name?.trim().split(" ")[0] || session?.user.email || "there";
  const trackLabel = studyGoal?.ielts_type ? TRACK_LABELS[studyGoal.ielts_type] ?? null : null;
  const targetBand = profile?.target_band ?? targetScores?.overall ?? null;

  return (
    <div className="dashboard-shell" data-theme={theme}>
      <DashboardSidebar />

      <div className="dashboard-content">
        <DashboardTopbar label="Overview" />

        <main className="dashboard-main dashboard-main-shell">
          {loading && (
            <div className="auth-status-row">
              <Loader2 size={18} className="spin" aria-hidden="true" /> Loading your dashboard…
            </div>
          )}

          {!loading && error && (
            <div className="dashboard-card empty-card" role="alert">
              <TriangleAlert size={20} />
              <strong>We couldn&rsquo;t load your profile.</strong>
              <p>{error}</p>
              <button className="button button-secondary" type="button" onClick={refetch}>
                Try again
              </button>
            </div>
          )}

          {!loading && !error && profile && (
            <>
              <DashboardHero
                firstName={greetingName}
                targetBand={targetBand}
                trackLabel={trackLabel}
                onPractice={goToPractice}
              />

              <section className="dashboard-section" aria-labelledby="skills-heading">
                <div className="dashboard-section-head">
                  <h2 id="skills-heading" className="dashboard-section-title">
                    Your four skills. One big goal.
                  </h2>
                  <button type="button" className="dashboard-section-link dashboard-section-link-button" onClick={goToPractice}>
                    Explore all practice
                  </button>
                </div>
                <div className="skills-grid dashboard-skills-grid">
                  {skills.map(({ name, detail, icon: Icon, tone }) => (
                    <button
                      type="button"
                      className="skill-card dashboard-skill-card dashboard-skill-card-button"
                      key={name}
                      onClick={() => navigate("/app/practice", { state: { skill: name.toLowerCase() } })}
                    >
                      <div className={`skill-icon ${tone}`}>
                        <Icon size={21} strokeWidth={1.9} aria-hidden="true" />
                      </div>
                      <h3>{name}</h3>
                      <p>{detail}</p>
                      <span className="skill-badge">Start practice</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="dashboard-section activity-grid">
                <LatestStepsCard onChoosePractice={goToPractice} onChooseMock={goToMockTests} />
                <WeekCalendarCard />
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
