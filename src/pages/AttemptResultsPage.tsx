import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { DashboardSidebar } from "../components/dashboard/DashboardSidebar";
import { DashboardTopbar } from "../components/dashboard/DashboardTopbar";
import { AttemptResults } from "../components/engine/AttemptResults";
import { api, ApiError, describeError } from "../lib/apiClient";
import type { ResultsOut } from "../lib/attemptTypes";
import { useDashboardTheme } from "../lib/useDashboardTheme";

/** Re-open a past attempt's results from Practice history. */
export function AttemptResultsPage() {
  const { theme } = useDashboardTheme();
  const { attemptId = "" } = useParams();
  const [results, setResults] = useState<ResultsOut | null>(null);
  const [error, setError] = useState("");
  const [inProgress, setInProgress] = useState(false);

  useEffect(() => {
    api
      .get<ResultsOut>(`/attempts/${attemptId}/results`)
      .then(setResults)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 409) setInProgress(true);
        else setError(describeError(err, "Couldn't load these results."));
      });
  }, [attemptId]);

  return (
    <div className="dashboard-shell" data-theme={theme}>
      <DashboardSidebar />
      <div className="dashboard-content">
        <DashboardTopbar label="Results" />
        <main className="dashboard-main dashboard-main-shell">
          <Link to="/app/practice-history" className="dashboard-section-link dashboard-section-link-button">
            ← Back to Practice history
          </Link>
          {!results && !error && !inProgress && <p>Loading…</p>}
          {error && <p className="form-banner form-banner-error form-banner-text">{error}</p>}
          {inProgress && <p className="info-banner">This attempt is still in progress. Open it from Practice or Mock tests to carry on.</p>}
          {results && <AttemptResults results={results} onReviewSaved={(review) => setResults({ ...results, self_review: review })} />}
        </main>
      </div>
    </div>
  );
}
