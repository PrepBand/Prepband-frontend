import { ArrowRight, BarChart3, ClipboardList, Clock3, Flag, Flame, Loader2, TrendingUp, Trophy, TriangleAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DashboardHero } from "../components/dashboard/DashboardHero";
import { DashboardSidebar } from "../components/dashboard/DashboardSidebar";
import { DashboardTopbar } from "../components/dashboard/DashboardTopbar";
import { SKILL_META, SKILL_ORDER } from "../data/practice";
import { useAuth } from "../lib/AuthProvider";
import { useDashboardTheme } from "../lib/useDashboardTheme";
import { useProfile } from "../lib/useProfile";

export function DashboardPage() {
  const { session } = useAuth();
  const { profile, about, targetScores, loading, error, refetch } = useProfile();
  const navigate = useNavigate();
  const { theme } = useDashboardTheme();

  const goToPractice = () => navigate("/app/practice");
  const goToMockTests = () => navigate("/app/mock-tests");

  const greetingName = about?.first_name || profile?.display_name?.trim().split(" ")[0] || session?.user.email || "there";
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
              <DashboardHero firstName={greetingName} targetBand={targetBand} />

              <section className="dashboard-section" aria-labelledby="stats-heading">
                <div className="dashboard-stats" id="stats-heading">
                  <div className="stat-tile">
                    <span className="stat-tile-label">
                      <Trophy size={16} aria-hidden="true" /> Best score
                    </span>
                    <strong>0.0</strong>
                    <span>All-time best</span>
                  </div>
                  <div className="stat-tile">
                    <span className="stat-tile-label">
                      <Flame size={16} aria-hidden="true" /> Current streak
                    </span>
                    <strong>0 days</strong>
                    <span>Days in a row</span>
                  </div>
                  <div className="stat-tile">
                    <span className="stat-tile-label">
                      <Clock3 size={16} aria-hidden="true" /> Study time
                    </span>
                    <strong>0m</strong>
                    <span>Total practice time</span>
                  </div>
                  <div className="stat-tile">
                    <span className="stat-tile-label">
                      <Flag size={16} aria-hidden="true" /> Tests taken
                    </span>
                    <strong>0</strong>
                    <span>Tests finished</span>
                  </div>
                </div>
              </section>

              <section className="dashboard-section dashboard-two-col-grid">
                <div className="dashboard-card">
                  <div className="dashboard-section-head">
                    <h2 className="dashboard-section-title">Score progress over time</h2>
                  </div>
                  <div className="chart-placeholder">
                    <TrendingUp size={26} aria-hidden="true" />
                    <strong>Complete a practice or mock to start your score trend.</strong>
                  </div>
                </div>

                <div className="dashboard-card">
                  <div className="dashboard-section-head">
                    <h2 className="dashboard-section-title">Weekly practice frequency</h2>
                  </div>
                  <div className="chart-placeholder">
                    <BarChart3 size={26} aria-hidden="true" />
                    <strong>Your sessions per day will appear here once you start practicing.</strong>
                  </div>
                </div>
              </section>

              <section className="dashboard-section dashboard-two-col-grid">
                <div className="dashboard-card">
                  <div className="dashboard-section-head">
                    <h2 className="dashboard-section-title">Target gap</h2>
                    <button
                      type="button"
                      className="dashboard-section-link dashboard-section-link-button"
                      onClick={() => navigate("/app/profile")}
                    >
                      Edit
                    </button>
                  </div>
                  <div className="target-gap-list">
                    {SKILL_ORDER.map((skill) => {
                      const meta = SKILL_META[skill];
                      const Icon = meta.icon;
                      const target = targetScores?.[skill] ?? null;
                      return (
                        <div className="target-gap-row" key={skill}>
                          <span className="target-gap-label">
                            <Icon size={16} aria-hidden="true" /> {meta.label}
                          </span>
                          <span className="target-gap-value">
                            &mdash; {target != null ? `of ${target.toFixed(1)}` : ""}
                          </span>
                          <div className="target-gap-track">
                            <div className="target-gap-fill" style={{ width: "0%" }} />
                          </div>
                        </div>
                      );
                    })}
                    <div className="target-gap-row target-gap-overall">
                      <span className="target-gap-label">Overall</span>
                      <span className="target-gap-value">
                        &mdash; {targetBand != null ? `of ${targetBand.toFixed(1)}` : ""}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="dashboard-card">
                  <div className="dashboard-section-head">
                    <h2 className="dashboard-section-title">Recent test results</h2>
                    <button
                      type="button"
                      className="dashboard-section-link dashboard-section-link-button"
                      onClick={() => navigate("/app/practice-history")}
                    >
                      View all
                    </button>
                  </div>
                  <div className="chart-placeholder">
                    <ClipboardList size={26} aria-hidden="true" />
                    <strong>No tests taken yet.</strong>
                    <button type="button" className="button button-secondary" onClick={goToMockTests}>
                      Explore mock tests
                    </button>
                  </div>
                </div>
              </section>

              <div className="dashboard-start-practice-row">
                <button type="button" className="button button-primary dashboard-hero-cta" onClick={goToPractice}>
                  Start practice <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
