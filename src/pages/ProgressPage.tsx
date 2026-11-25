import { ArrowRight, Award, Download, FileText, LineChart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ScoreTrendChart } from "../components/charts/ScoreTrendChart";
import { DashboardSidebar } from "../components/dashboard/DashboardSidebar";
import { DashboardTopbar } from "../components/dashboard/DashboardTopbar";
import { SKILL_META, SKILL_ORDER } from "../data/practice";
import type { ProgressOut } from "../lib/attemptTypes";
import { useDashboardTheme } from "../lib/useDashboardTheme";
import { latestBand, useProgress } from "../lib/useProgress";

function download(filename: string, type: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** FR-RESULT-06: progress by date and module, plus an exportable summary. */
export function ProgressPage() {
  const { theme } = useDashboardTheme();
  const navigate = useNavigate();
  const { progress, error } = useProgress();
  const points = progress?.points ?? [];
  const writingPoints = points.filter((p) => p.module === "writing");
  const speakingPoints = points.filter((p) => p.module === "speaking");

  const exportJson = (data: ProgressOut) =>
    download(
      "prepband-progress.json",
      "application/json",
      JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          note: "Estimated bands are approximate practice estimates, not official IELTS scores. Writing and Speaking are not assessed.",
          ...data,
        },
        null,
        2,
      ),
    );

  const exportCsv = (data: ProgressOut) => {
    const header = ["submitted_at", "module", "test", "type", "assessment", "raw_score", "max_score", "percentage", "estimated_band", "words_written", "speaking_answers"];
    const rows = data.points.map((p) =>
      [p.submitted_at, p.module, p.test_title, p.kind, p.assessment_status, p.raw_score, p.max_score, p.percentage, p.estimated_band, p.words_written, p.speaking_answers]
        .map(csvCell)
        .join(","),
    );
    download("prepband-progress.csv", "text/csv", [header.join(","), ...rows].join("\n"));
  };

  return (
    <div className="dashboard-shell" data-theme={theme}>
      <DashboardSidebar />
      <div className="dashboard-content">
        <DashboardTopbar label="My progress" />

        <main className="dashboard-main dashboard-main-shell">
          <div className="page-heading-row">
            <div className="page-heading">
              <h1>Look at the steps you&rsquo;re taking.</h1>
              <p>Progress is more than a score. It&rsquo;s showing up and finding your rhythm.</p>
            </div>
            {progress && (
              <div className="progress-export">
                <button type="button" className="button button-secondary" onClick={() => exportCsv(progress)}>
                  <Download size={15} aria-hidden="true" /> Export CSV
                </button>
                <button type="button" className="button button-secondary" onClick={() => exportJson(progress)}>
                  <Download size={15} aria-hidden="true" /> Export JSON
                </button>
              </div>
            )}
          </div>

          {error && (
            <p className="form-banner form-banner-error form-banner-text" role="alert">
              {error}
            </p>
          )}

          <div className="metrics-grid">
            {SKILL_ORDER.map((skill) => {
              const meta = SKILL_META[skill];
              const Icon = meta.icon;
              const band = latestBand(points, skill);
              return (
                <div className="dashboard-card metric-card" key={skill}>
                  <div className="metric-card-head">
                    {meta.label}
                    <Icon size={18} aria-hidden="true" />
                  </div>
                  <span className="metric-card-value">{progress ? progress.completed_by_module[skill] ?? 0 : "–"}</span>
                  <span className="metric-card-label">
                    Finished sessions
                    {band != null && ` · latest est. band ${band.toFixed(1)}`}
                    {(skill === "writing" || skill === "speaking") && " · not assessed"}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="metrics-grid metrics-grid-two">
            <div className="dashboard-card metric-card">
              <div className="metric-card-head">
                Full mocks completed
                <FileText size={18} aria-hidden="true" />
              </div>
              <span className="metric-card-value">{progress?.full_mocks_completed ?? "–"}</span>
              <span className="metric-card-label">All four sections finished</span>
            </div>
            <div className="dashboard-card metric-card">
              <div className="metric-card-head">
                Certificates
                <Award size={18} aria-hidden="true" />
              </div>
              <span className="metric-card-value">{progress?.certificates ?? "–"}</span>
              <span className="metric-card-label">Unofficial practice certificates</span>
            </div>
          </div>

          <div className="progress-columns">
            <div className="dashboard-card">
              <h2>Your objective practice scores</h2>
              <p>Listening &amp; Reading · estimated band per finished attempt</p>
              {points.some((p) => p.estimated_band != null) ? (
                <ScoreTrendChart points={points} title="Estimated band over time" />
              ) : (
                <div className="chart-placeholder">
                  <LineChart size={26} aria-hidden="true" />
                  <strong>Complete a Reading or Listening session to start your chart.</strong>
                </div>
              )}
            </div>

            <div className="dashboard-card">
              <h2>Writing and Speaking</h2>
              <p>Not assessed, so there&rsquo;s no band to chart. Here&rsquo;s what you&rsquo;ve produced instead.</p>
              <dl className="progress-production">
                <dt>Writing sessions</dt>
                <dd>{writingPoints.length}</dd>
                <dt>Words written</dt>
                <dd>{writingPoints.reduce((sum, p) => sum + (p.words_written ?? 0), 0)}</dd>
                <dt>Speaking sessions</dt>
                <dd>{speakingPoints.length}</dd>
                <dt>Speaking answers recorded</dt>
                <dd>{speakingPoints.reduce((sum, p) => sum + (p.speaking_answers ?? 0), 0)}</dd>
              </dl>
              <div className="next-step-list">
                {SKILL_ORDER.map((skill) => {
                  const meta = SKILL_META[skill];
                  const done = progress?.completed_by_module[skill] ?? 0;
                  return (
                    <button
                      key={skill}
                      type="button"
                      className="next-step-row"
                      onClick={() => navigate("/app/practice", { state: { skill } })}
                    >
                      <div>
                        <strong>{meta.label}</strong>
                        <p>{done === 0 ? "Try your first focused session." : `Keep going: ${done} finished so far.`}</p>
                      </div>
                      <ArrowRight size={16} aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
