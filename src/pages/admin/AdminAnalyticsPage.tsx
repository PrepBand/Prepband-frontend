import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { api, describeError } from "../../lib/apiClient";
import { MODULE_LABELS, QUESTION_TYPE_LABELS, type Module, type PlatformAnalytics, type TestAnalytics } from "../../lib/adminTypes";

const MODULES: Module[] = ["listening", "reading", "writing", "speaking"];
const pct = (value: number | null) => (value === null ? "-" : `${Math.round(value * 100)}%`);

/** FR-ADMIN-08 question analytics. Without ?test= it shows platform-wide
 * activity; with ?test=<id> it shows one test's per-question results.
 * Aggregates only: no student names or individual answers. */
export function AdminAnalyticsPage() {
  const [params] = useSearchParams();
  const testId = params.get("test");
  return <AdminLayout title="Analytics">{testId ? <TestAnalyticsView testId={testId} /> : <PlatformView />}</AdminLayout>;
}

function PlatformView() {
  const [weeks, setWeeks] = useState(8);
  const [data, setData] = useState<PlatformAnalytics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setData(null);
    api
      .get<PlatformAnalytics>(`/admin/analytics?weeks=${weeks}`)
      .then(setData)
      .catch((err) => setError(describeError(err, "Failed to load analytics.")));
  }, [weeks]);

  return (
    <>
      <div className="page-heading admin-heading-row">
        <div>
          <h1>Analytics.</h1>
          <p>How students are using Prepband. Bands are Listening and Reading estimates only; Writing and Speaking are never scored.</p>
        </div>
        <select className="form-input admin-filter" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} aria-label="Time range">
          <option value={4}>Last 4 weeks</option>
          <option value={8}>Last 8 weeks</option>
          <option value={26}>Last 6 months</option>
          <option value={52}>Last year</option>
        </select>
      </div>

      {error && <p className="form-banner form-banner-error" role="alert">{error}</p>}
      {!data && !error && (
        <p className="admin-muted">
          <Loader2 size={16} className="spin" aria-hidden="true" /> Loading…
        </p>
      )}

      {data && (
        <>
          <div className="admin-stat-row">
            <div className="dashboard-card admin-card admin-stat">
              <span className="admin-muted">Active students</span>
              <strong>{data.active_students}</strong>
            </div>
            <div className="dashboard-card admin-card admin-stat">
              <span className="admin-muted">Attempts started</span>
              <strong>{data.attempts}</strong>
            </div>
          </div>

          <h2>By module</h2>
          <div className="dashboard-card admin-card admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Module</th>
                  <th scope="col">Started</th>
                  <th scope="col">Finished</th>
                  <th scope="col">Completion</th>
                  <th scope="col">Average band</th>
                </tr>
              </thead>
              <tbody>
                {MODULES.map((module) => {
                  const row = data.by_module[module];
                  return (
                    <tr key={module}>
                      <th scope="row">{MODULE_LABELS[module]}</th>
                      <td>{row?.started ?? 0}</td>
                      <td>{row?.finished ?? 0}</td>
                      <td>{pct(row?.completion_rate ?? null)}</td>
                      <td>{module === "writing" || module === "speaking" ? "Not assessed" : (row?.average_band ?? "-")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <h2>Attempts per week</h2>
          <div className="dashboard-card admin-card admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Week of</th>
                  {MODULES.map((module) => (
                    <th key={module} scope="col">{MODULE_LABELS[module]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.weekly.map((row) => (
                  <tr key={row.week}>
                    <th scope="row">{new Date(row.week).toLocaleDateString()}</th>
                    {MODULES.map((module) => (
                      <td key={module}>{row[module] ?? 0}</td>
                    ))}
                  </tr>
                ))}
                {data.weekly.length === 0 && (
                  <tr>
                    <td colSpan={5} className="admin-muted">No attempts in this period.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <h2>Busiest tests</h2>
          <div className="dashboard-card admin-card admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Test</th>
                  <th scope="col">Attempts</th>
                </tr>
              </thead>
              <tbody>
                {data.top_tests.map((test) => (
                  <tr key={test.test_id}>
                    <td>
                      <Link className="admin-link" to={`/admin/analytics?test=${test.test_id}`}>{test.title}</Link>
                    </td>
                    <td>{test.attempts}</td>
                  </tr>
                ))}
                {data.top_tests.length === 0 && (
                  <tr>
                    <td colSpan={2} className="admin-muted">No attempts in this period.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

function TestAnalyticsView({ testId }: { testId: string }) {
  const [data, setData] = useState<TestAnalytics | null>(null);
  const [error, setError] = useState("");
  const [hardestFirst, setHardestFirst] = useState(false);

  useEffect(() => {
    api
      .get<TestAnalytics>(`/admin/tests/${testId}/analytics`)
      .then(setData)
      .catch((err) => setError(describeError(err, "Failed to load this test's analytics.")));
  }, [testId]);

  const questions = useMemo(() => {
    const rows = [...(data?.questions ?? [])];
    if (hardestFirst) rows.sort((a, b) => (a.correct_rate ?? 2) - (b.correct_rate ?? 2));
    return rows;
  }, [data, hardestFirst]);
  const versions = new Set(data?.questions.map((q) => q.version_number));

  return (
    <>
      <p>
        <Link className="admin-link" to="/admin/analytics">
          <ArrowLeft size={14} aria-hidden="true" /> All analytics
        </Link>
      </p>
      {error && <p className="form-banner form-banner-error" role="alert">{error}</p>}
      {!data && !error && (
        <p className="admin-muted">
          <Loader2 size={16} className="spin" aria-hidden="true" /> Loading…
        </p>
      )}
      {data && (
        <>
          <div className="page-heading">
            <h1>{data.test.title}</h1>
            <p>
              {MODULE_LABELS[data.test.module]} · {data.test.status} ·{" "}
              <Link className="admin-link" to={`/admin/tests/${data.test.id}`}>Open in editor</Link>
            </p>
          </div>

          <div className="admin-stat-row">
            <div className="dashboard-card admin-card admin-stat">
              <span className="admin-muted">Finished / started</span>
              <strong>
                {data.summary.attempts_finished} / {data.summary.attempts_started}
              </strong>
              <span className="admin-muted">{pct(data.summary.completion_rate)} completion</span>
            </div>
            {data.scored ? (
              <>
                <div className="dashboard-card admin-card admin-stat">
                  <span className="admin-muted">Average score</span>
                  <strong>{data.summary.average_score_pct === null ? "-" : `${data.summary.average_score_pct}%`}</strong>
                </div>
                <div className="dashboard-card admin-card admin-stat">
                  <span className="admin-muted">Average estimated band</span>
                  <strong>{data.summary.average_band ?? "-"}</strong>
                </div>
              </>
            ) : (
              <div className="dashboard-card admin-card admin-stat">
                <span className="admin-muted">Scoring</span>
                <strong>Not assessed</strong>
                <span className="admin-muted">Writing and Speaking have no band score.</span>
              </div>
            )}
            <div className="dashboard-card admin-card admin-stat">
              <span className="admin-muted">Average time</span>
              <strong>{data.summary.average_minutes === null ? "-" : `${data.summary.average_minutes} min`}</strong>
              <span className="admin-muted">
                {data.summary.practice_attempts} practice · {data.summary.exam_attempts} exam
              </span>
            </div>
          </div>

          {data.scored && (
            <>
              <div className="admin-heading-row">
                <h2>Questions</h2>
                <label className="admin-inline-field">
                  <input type="checkbox" checked={hardestFirst} onChange={(e) => setHardestFirst(e.target.checked)} />
                  <span>Hardest first</span>
                </label>
              </div>
              {data.summary.attempts_finished < 10 && (
                <p className="admin-muted">Fewer than 10 finished attempts: treat these rates as rough.</p>
              )}
              <div className="dashboard-card admin-card admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      {versions.size > 1 && <th scope="col">Version</th>}
                      <th scope="col">#</th>
                      <th scope="col">Question</th>
                      <th scope="col">Correct</th>
                      <th scope="col">Skipped</th>
                      <th scope="col">Most common wrong answers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questions.map((q) => (
                      <tr key={q.question_id}>
                        {versions.size > 1 && <td>v{q.version_number}</td>}
                        <td>
                          {q.section_order}.{q.display_order}
                        </td>
                        <td>
                          {q.prompt}
                          <span className="admin-muted"> · {QUESTION_TYPE_LABELS[q.type]}</span>
                        </td>
                        <td>
                          {pct(q.correct_rate)}{" "}
                          <span className="admin-muted">
                            ({q.correct}/{q.finished_attempts})
                          </span>
                        </td>
                        <td>{q.skipped}</td>
                        <td>
                          {q.common_wrong_answers.length
                            ? q.common_wrong_answers.map((w) => `${w.answer} (${w.count})`).join(", ")
                            : "-"}
                        </td>
                      </tr>
                    ))}
                    {questions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="admin-muted">No questions yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
