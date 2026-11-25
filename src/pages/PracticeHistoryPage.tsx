import { useEffect, useState } from "react";
import { ArrowRight, Clock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { DashboardSidebar } from "../components/dashboard/DashboardSidebar";
import { DashboardTopbar } from "../components/dashboard/DashboardTopbar";
import { SegmentedTabs } from "../components/dashboard/SegmentedTabs";
import { SKILL_META, type SkillKey } from "../data/practice";
import { api, describeError } from "../lib/apiClient";
import type { AttemptHistoryItem, AttemptHistoryPage } from "../lib/attemptTypes";
import { useDashboardTheme } from "../lib/useDashboardTheme";

type SkillFilter = "all" | SkillKey;
type Filters = { status: string; kind: string; track: string; from: string; to: string };

const PAGE_SIZE = 20;
const EMPTY_FILTERS: Filters = { status: "", kind: "", track: "", from: "", to: "" };

const SKILL_TABS: { value: SkillFilter; label: string }[] = [
  { value: "all", label: "All skills" },
  { value: "listening", label: "Listening" },
  { value: "reading", label: "Reading" },
  { value: "writing", label: "Writing" },
  { value: "speaking", label: "Speaking" },
];

const STATUS_LABEL: Record<AttemptHistoryItem["status"], string> = {
  in_progress: "In progress",
  submitted: "Submitted",
  expired: "Time ran out",
  cancelled: "Cancelled",
};

function outcome(item: AttemptHistoryItem): string {
  if (item.status === "in_progress") return "In progress";
  if (item.status === "cancelled") return "Cancelled";
  if (item.assessment_status === "not_assessed") {
    if (item.module === "writing") return `${item.words_written ?? 0} words · not assessed`;
    return `${item.speaking_answers ?? 0} answers · not assessed`;
  }
  const score = item.raw_score != null && item.max_score != null ? `${item.raw_score}/${item.max_score}` : "-";
  return item.estimated_band != null ? `${score} · est. band ${item.estimated_band.toFixed(1)}` : score;
}

function kindLabel(item: AttemptHistoryItem): string {
  if (item.mock_attempt_id) return "Full mock";
  return item.kind === "mock" ? "Single-section mock" : "Practice";
}

/** FR-RESULT-01: the student's own attempts, filtered and paginated by the server. */
export function PracticeHistoryPage() {
  const { theme } = useDashboardTheme();
  const navigate = useNavigate();
  const [skillFilter, setSkillFilter] = useState<SkillFilter>("all");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [offset, setOffset] = useState(0);
  const [page, setPage] = useState<AttemptHistoryPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
    if (skillFilter !== "all") params.set("module", skillFilter);
    for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
    let active = true;
    setLoading(true);
    setError("");
    api
      .get<AttemptHistoryPage>(`/me/attempts?${params}`)
      .then((result) => active && setPage(result))
      .catch((err) => active && setError(describeError(err, "Couldn't load your history.")))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [skillFilter, filters, offset]);

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setOffset(0);
  };
  const filtersActive = skillFilter !== "all" || Object.values(filters).some(Boolean);
  const items = page?.items ?? [];
  const total = page?.total ?? 0;

  return (
    <div className="dashboard-shell" data-theme={theme}>
      <DashboardSidebar />
      <div className="dashboard-content">
        <DashboardTopbar label="Practice history" />

        <main className="dashboard-main dashboard-main-shell">
          <div className="page-heading">
            <h1>Every practice tells a story.</h1>
            <p>Revisit your responses, reflect on feedback, and see how far you&rsquo;ve come.</p>
          </div>

          <div className="page-tabs-row">
            <SegmentedTabs
              options={SKILL_TABS}
              value={skillFilter}
              onChange={(value) => {
                setSkillFilter(value);
                setOffset(0);
              }}
              aria-label="Filter history by skill"
            />
          </div>

          <div className="history-filters" role="group" aria-label="More filters">
            <label>
              <span>Type</span>
              <select value={filters.kind} onChange={(event) => updateFilter("kind", event.target.value)}>
                <option value="">All types</option>
                <option value="practice">Practice</option>
                <option value="mock">Single-section mock</option>
                <option value="full_mock">Full mock sections</option>
              </select>
            </label>
            <label>
              <span>Status</span>
              <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
                <option value="">Any status</option>
                <option value="submitted">Submitted</option>
                <option value="expired">Time ran out</option>
                <option value="in_progress">In progress</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
            <label>
              <span>Track</span>
              <select value={filters.track} onChange={(event) => updateFilter("track", event.target.value)}>
                <option value="">Any track</option>
                <option value="academic">Academic</option>
                <option value="general">General Training</option>
                <option value="both">Shared by both</option>
              </select>
            </label>
            <label>
              <span>From</span>
              <input type="date" value={filters.from} max={filters.to || undefined} onChange={(event) => updateFilter("from", event.target.value)} />
            </label>
            <label>
              <span>To</span>
              <input type="date" value={filters.to} min={filters.from || undefined} onChange={(event) => updateFilter("to", event.target.value)} />
            </label>
            {filtersActive && (
              <button
                type="button"
                className="button button-secondary button-sm"
                onClick={() => {
                  setSkillFilter("all");
                  setFilters(EMPTY_FILTERS);
                  setOffset(0);
                }}
              >
                Clear filters
              </button>
            )}
          </div>

          {error && (
            <p className="form-banner form-banner-error form-banner-text" role="alert">
              {error}
            </p>
          )}
          {loading && !page && <p>Loading…</p>}

          {items.length > 0 && (
            <>
              <p className="admin-muted history-count" aria-live="polite">
                Showing {offset + 1}–{offset + items.length} of {total}
              </p>
              <ul className="history-list" aria-busy={loading}>
                {items.map((item) => {
                  const meta = SKILL_META[item.module];
                  const Icon = meta.icon;
                  return (
                    <li key={item.id} className="dashboard-card history-item">
                      <span className={`practice-tag ${meta.tone}`}>
                        <Icon size={14} aria-hidden="true" /> {meta.label}
                      </span>
                      <div className="history-main">
                        <h3>{item.test_title}</h3>
                        <p className="admin-muted">
                          {kindLabel(item)} · {item.mode === "exam" ? "exam mode" : "practice mode"} · {STATUS_LABEL[item.status]} ·{" "}
                          {new Date(item.submitted_at ?? item.started_at).toLocaleString()}
                        </p>
                      </div>
                      <span className="history-outcome">{outcome(item)}</span>
                      {item.status === "in_progress" ? (
                        item.mock_attempt_id ? (
                          <Link className="button button-secondary button-sm" to={`/app/full-mock/${item.mock_attempt_id}`}>
                            Continue
                          </Link>
                        ) : (
                          <Link
                            className="button button-secondary button-sm"
                            to={`/app/attempt/${item.test_id}`}
                            state={{ mode: item.mode, returnTo: "/app/practice-history", returnLabel: "Back to Practice history" }}
                          >
                            Continue
                          </Link>
                        )
                      ) : item.status === "cancelled" ? (
                        <span className="admin-muted">-</span>
                      ) : (
                        <Link className="button button-secondary button-sm" to={`/app/results/${item.id}`}>
                          View
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
              {total > PAGE_SIZE && (
                <nav className="pagination" aria-label="History pages">
                  <button
                    type="button"
                    className="button button-secondary button-sm"
                    disabled={offset === 0 || loading}
                    onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                  >
                    Previous
                  </button>
                  <span>
                    Page {Math.floor(offset / PAGE_SIZE) + 1} of {Math.ceil(total / PAGE_SIZE)}
                  </span>
                  <button
                    type="button"
                    className="button button-secondary button-sm"
                    disabled={offset + PAGE_SIZE >= total || loading}
                    onClick={() => setOffset(offset + PAGE_SIZE)}
                  >
                    Next
                  </button>
                </nav>
              )}
            </>
          )}

          {page && items.length === 0 && filtersActive && (
            <div className="dashboard-card stage-card">
              <h2>Nothing matches these filters.</h2>
              <p>Try a different skill, status or date range.</p>
            </div>
          )}

          {page && items.length === 0 && !filtersActive && (
            <div className="dashboard-card stage-card">
              <span className="stage-icon" aria-hidden="true">
                <Clock size={26} />
              </span>
              <h2>A fresh page, ready for you.</h2>
              <p>Your completed practices will appear here.</p>
              <button type="button" className="button button-primary stage-cta" onClick={() => navigate("/app/practice")}>
                Start a practice <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
