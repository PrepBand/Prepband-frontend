import { ArrowRight, Download, LineChart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DashboardSidebar } from "../components/dashboard/DashboardSidebar";
import { DashboardTopbar } from "../components/dashboard/DashboardTopbar";
import { SKILL_META, SKILL_ORDER } from "../data/practice";
import { useDashboardTheme } from "../lib/useDashboardTheme";

export function ProgressPage() {
  const { theme } = useDashboardTheme();
  const navigate = useNavigate();

  const handleExport = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      completedPractices: Object.fromEntries(SKILL_ORDER.map((skill) => [skill, 0])),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "prepband-progress.json";
    link.click();
    URL.revokeObjectURL(url);
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
            <button type="button" className="button button-secondary" onClick={handleExport}>
              <Download size={15} aria-hidden="true" /> Export progress
            </button>
          </div>

          <div className="metrics-grid">
            {SKILL_ORDER.map((skill) => {
              const meta = SKILL_META[skill];
              const Icon = meta.icon;
              return (
                <div className="dashboard-card metric-card" key={skill}>
                  <div className="metric-card-head">
                    {meta.label}
                    <Icon size={18} aria-hidden="true" />
                  </div>
                  <span className="metric-card-value">0</span>
                  <span className="metric-card-label">Completed practices</span>
                </div>
              );
            })}
          </div>

          <div className="progress-columns">
            <div className="dashboard-card">
              <h2>Your objective practice scores</h2>
              <p>Listening &amp; Reading · percentage correct · most recent attempts</p>
              <div className="chart-placeholder">
                <LineChart size={26} aria-hidden="true" />
                <strong>Complete a Reading or Listening practice to start your chart.</strong>
              </div>
            </div>

            <div className="dashboard-card">
              <h2>Make your next step count</h2>
              <div className="next-step-list">
                {SKILL_ORDER.map((skill) => {
                  const meta = SKILL_META[skill];
                  return (
                    <button
                      key={skill}
                      type="button"
                      className="next-step-row"
                      onClick={() => navigate("/app/practice", { state: { skill } })}
                    >
                      <div>
                        <strong>{meta.label}</strong>
                        <p>Try your first focused session.</p>
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
