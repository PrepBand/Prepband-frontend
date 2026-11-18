import { ArrowRight, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DashboardSidebar } from "../components/dashboard/DashboardSidebar";
import { DashboardTopbar } from "../components/dashboard/DashboardTopbar";
import { useDashboardTheme } from "../lib/useDashboardTheme";

export function CertificatesPage() {
  const { theme } = useDashboardTheme();
  const navigate = useNavigate();

  return (
    <div className="dashboard-shell" data-theme={theme}>
      <DashboardSidebar />
      <div className="dashboard-content">
        <DashboardTopbar label="Certificates" />

        <main className="dashboard-main dashboard-main-shell">
          <div className="page-heading">
            <h1>A small celebration. A big commitment.</h1>
            <p>Your unofficial certificates recognise the practice you&rsquo;ve completed.</p>
          </div>

          <div className="dashboard-card stage-card">
            <span className="stage-icon" aria-hidden="true">
              <Award size={28} />
            </span>
            <h2>Your effort deserves a moment.</h2>
            <p>Complete all four parts of a guided mock to unlock an unofficial practice completion certificate.</p>
            <button
              type="button"
              className="button button-primary stage-cta"
              onClick={() => navigate("/app/mock-tests")}
            >
              Explore mock tests <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
