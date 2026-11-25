import { useEffect, useState } from "react";
import { ArrowRight, Award, ClipboardList, Clock3, Flag, Flame, Loader2, TrendingUp, Trophy, TriangleAlert } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ScoreTrendChart } from "../components/charts/ScoreTrendChart";
import { WeeklyActivityChart } from "../components/charts/WeeklyActivityChart";
import { DashboardHero } from "../components/dashboard/DashboardHero";
import { DashboardSidebar } from "../components/dashboard/DashboardSidebar";
import { DashboardTopbar } from "../components/dashboard/DashboardTopbar";
import { SKILL_META, SKILL_ORDER } from "../data/practice";
import { api } from "../lib/apiClient";
import type { AttemptHistoryItem, AttemptHistoryPage, CertificateOut } from "../lib/attemptTypes";
import { useAuth } from "../lib/AuthProvider";
import { formatDate } from "../lib/fullMock";
import { useDashboardTheme } from "../lib/useDashboardTheme";
import { useProfile } from "../lib/useProfile";
import { bestBand, formatMinutes, latestBand, streakDays, studyMinutes, useProgress } from "../lib/useProgress";

function recentOutcome(item: AttemptHistoryItem): string {
  if (item.status === "in_progress") return "In progress";
  if (item.status === "cancelled") return "Cancelled";
  if (item.assessment_status === "not_assessed") return "Not assessed";
  if (item.raw_score == null || item.max_score == null) return "-";
  return `${item.raw_score}/${item.max_score}${item.estimated_band != null ? ` · est. ${item.estimated_band.toFixed(1)}` : ""}`;
}

export function DashboardPage() {
  const { session } = useAuth();
  const { profile, about, targetScores, loading, error, refetch } = useProfile();
  const navigate = useNavigate();
  const { theme } = useDashboardTheme();
  const { progress } = useProgress();
  const [recent, setRecent] = useState<AttemptHistoryItem[] | null>(null);
  const [certificates, setCertificates] = useState<CertificateOut[]>([]);

  // FR-DASH-04: recent attempts and certificates with working links.
  useEffect(() => {
    api
      .get<AttemptHistoryPage>("/me/attempts?limit=5")
      .then((page) => setRecent(page.items))
      .catch(() => setRecent([]));
    api
      .get<CertificateOut[]>("/certificates")
      .then(setCertificates)
      .catch(() => setCertificates([]));
  }, []);

  const points = progress?.points ?? [];
  const best = bestBand(points);
  const streak = streakDays(points);
  const latestCertificate = certificates.find((c) => c.revoked_at == null) ?? null;

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
                    <strong>{best != null ? best.toFixed(1) : "–"}</strong>
                    <span>Best est. band (Listening/Reading)</span>
                  </div>
                  <div className="stat-tile">
                    <span className="stat-tile-label">
                      <Flame size={16} aria-hidden="true" /> Current streak
                    </span>
                    <strong>
                      {streak} {streak === 1 ? "day" : "days"}
                    </strong>
                    <span>Days in a row</span>
                  </div>
                  <div className="stat-tile">
                    <span className="stat-tile-label">
                      <Clock3 size={16} aria-hidden="true" /> Study time
                    </span>
                    <strong>{formatMinutes(studyMinutes(points))}</strong>
                    <span>Time in finished sessions</span>
                  </div>
                  <div className="stat-tile">
                    <span className="stat-tile-label">
                      <Flag size={16} aria-hidden="true" /> Tests taken
                    </span>
                    <strong>{points.length}</strong>
                    <span>Sessions finished</span>
                  </div>
                </div>
              </section>

              <section className="dashboard-section dashboard-two-col-grid">
                <div className="dashboard-card">
                  <div className="dashboard-section-head">
                    <h2 className="dashboard-section-title">Score progress over time</h2>
                  </div>
                  {points.some((p) => p.estimated_band != null) ? (
                    <ScoreTrendChart points={points} title="Estimated band, Listening and Reading" />
                  ) : (
                    <div className="chart-placeholder">
                      <TrendingUp size={26} aria-hidden="true" />
                      <strong>Complete a Listening or Reading session to start your score trend.</strong>
                    </div>
                  )}
                </div>

                <div className="dashboard-card">
                  <div className="dashboard-section-head">
                    <h2 className="dashboard-section-title">Weekly practice frequency</h2>
                  </div>
                  <WeeklyActivityChart points={points} />
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
                      const assessed = skill === "listening" || skill === "reading";
                      const current = assessed ? latestBand(points, skill) : null;
                      const fill = current != null && target ? Math.min(100, (current / target) * 100) : 0;
                      return (
                        <div className="target-gap-row" key={skill}>
                          <span className="target-gap-label">
                            <Icon size={16} aria-hidden="true" /> {meta.label}
                          </span>
                          <span className="target-gap-value">
                            {assessed ? (current != null ? current.toFixed(1) : "—") : "Not assessed"}{" "}
                            {target != null ? `of ${target.toFixed(1)}` : ""}
                          </span>
                          <div className="target-gap-track">
                            <div className="target-gap-fill" style={{ width: `${fill}%` }} />
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
                  {recent && recent.length > 0 ? (
                    <ul className="recent-results">
                      {recent.map((item) => {
                        const meta = SKILL_META[item.module];
                        const Icon = meta.icon;
                        const to =
                          item.status === "in_progress"
                            ? item.mock_attempt_id
                              ? `/app/full-mock/${item.mock_attempt_id}`
                              : `/app/attempt/${item.test_id}`
                            : `/app/results/${item.id}`;
                        return (
                          <li key={item.id}>
                            <Icon size={15} aria-hidden="true" />
                            {item.status === "cancelled" ? (
                              <span className="recent-results-title">{item.test_title}</span>
                            ) : (
                              <Link
                                className="recent-results-title"
                                to={to}
                                state={item.status === "in_progress" && !item.mock_attempt_id ? { mode: item.mode, returnTo: "/app/dashboard", returnLabel: "Back to Overview" } : undefined}
                              >
                                {item.test_title}
                              </Link>
                            )}
                            <span className="recent-results-outcome">{recentOutcome(item)}</span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="chart-placeholder">
                      <ClipboardList size={26} aria-hidden="true" />
                      <strong>{recent === null ? "Loading…" : "No tests taken yet."}</strong>
                      {recent !== null && (
                        <button type="button" className="button button-secondary" onClick={goToMockTests}>
                          Explore mock tests
                        </button>
                      )}
                    </div>
                  )}
                  {latestCertificate && (
                    <p className="recent-certificate">
                      <Award size={15} aria-hidden="true" /> Latest certificate:{" "}
                      <Link to={`/app/certificates/${latestCertificate.id}`}>{latestCertificate.code}</Link> · issued{" "}
                      {formatDate(latestCertificate.issued_at)}
                    </p>
                  )}
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
