import { useEffect, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { api, describeError } from "../../lib/apiClient";
import { MODULE_LABELS, type AdminOverview, type Module } from "../../lib/adminTypes";

export function AdminOverviewPage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<AdminOverview>("/admin/overview")
      .then(setOverview)
      .catch((err) => setError(describeError(err, "Failed to load the overview.")));
  }, []);

  const tiles = overview
    ? [
        { label: "Published tests", value: overview.tests_by_status.published ?? 0 },
        { label: "Drafts", value: overview.tests_by_status.draft ?? 0 },
        { label: "Archived", value: overview.tests_by_status.archived ?? 0 },
        { label: "Users", value: overview.total_users },
        { label: "Attempts submitted", value: overview.attempts_by_status.submitted ?? 0 },
        { label: "Attempts in progress", value: overview.attempts_by_status.in_progress ?? 0 },
      ]
    : [];

  return (
    <AdminLayout title="Overview">
      <div className="page-heading">
        <h1>Content and people, at a glance.</h1>
        <p>Author practice sets and mock tests, publish them to students, and keep an eye on usage.</p>
      </div>

      {error && <p className="form-banner form-banner-error" role="alert">{error}</p>}
      {!overview && !error && (
        <p className="admin-muted">
          <Loader2 size={16} className="spin" aria-hidden="true" /> Loading…
        </p>
      )}

      {overview && (
        <>
          <div className="admin-stat-grid">
            {tiles.map((tile) => (
              <div className="stat-tile admin-stat" key={tile.label}>
                <strong>{tile.value}</strong>
                <span>{tile.label}</span>
              </div>
            ))}
          </div>

          <div className="dashboard-card admin-card">
            <h2>Published by module</h2>
            <ul className="admin-module-list">
              {(Object.keys(MODULE_LABELS) as Module[]).map((module) => (
                <li key={module}>
                  <span>{MODULE_LABELS[module]}</span>
                  <strong>{overview.published_by_module[module] ?? 0}</strong>
                </li>
              ))}
            </ul>
            <p className="admin-muted">
              Writing and Speaking attempts are marked &ldquo;not assessed&rdquo;: there&rsquo;s no automated band score, only
              diagnostics, the rubric and the student&rsquo;s own self-review.
            </p>
          </div>

          <div className="admin-quick-links">
            <Link className="button button-primary" to="/admin/tests">
              Manage tests <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link className="button button-secondary" to="/admin/users">
              View users
            </Link>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
