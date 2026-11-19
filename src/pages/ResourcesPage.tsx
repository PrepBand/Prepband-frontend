import { ArrowRight, Library } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DashboardSidebar } from "../components/dashboard/DashboardSidebar";
import { DashboardTopbar } from "../components/dashboard/DashboardTopbar";
import { useDashboardTheme } from "../lib/useDashboardTheme";

export function ResourcesPage() {
  const { theme } = useDashboardTheme();
  const navigate = useNavigate();

  return (
    <div className="dashboard-shell" data-theme={theme}>
      <DashboardSidebar />
      <div className="dashboard-content">
        <DashboardTopbar label="Resources" />

        <main className="dashboard-main dashboard-main-shell">
          <div className="page-heading">
            <h1>Guides for every step of the journey.</h1>
            <p>Strategy guides, band descriptors, and sample answers for all four skills.</p>
          </div>

          <div className="dashboard-card stage-card">
            <span className="stage-icon" aria-hidden="true">
              <Library size={28} />
            </span>
            <h2>Resources are on their way.</h2>
            <p>We&rsquo;re building a library of strategy guides and sample answers for Listening, Reading, Writing and Speaking.</p>
            <button type="button" className="button button-primary stage-cta" onClick={() => navigate("/app/practice")}>
              Back to practice <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
