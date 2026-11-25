import { useCallback, useEffect, useState } from "react";
import { Award, CheckCircle2, Circle, Clock, Loader2, PlayCircle } from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { DashboardSidebar } from "../components/dashboard/DashboardSidebar";
import { DashboardTopbar } from "../components/dashboard/DashboardTopbar";
import { CertificateActions } from "../components/mock/CertificateActions";
import { MockResultsTable } from "../components/mock/MockResultsTable";
import { SKILL_META } from "../data/practice";
import { api, describeError } from "../lib/apiClient";
import type { CertificateDetail, MockModuleOut, MockOut, MockResultsOut } from "../lib/attemptTypes";
import { formatDate, formatDateTime, isModuleFinished, MODULE_STATUS_LABEL } from "../lib/fullMock";
import { useDashboardTheme } from "../lib/useDashboardTheme";

/**
 * One full mock (FR-MOCK-01..07): the guided Listening -> Reading ->
 * Writing -> Speaking flow, resumable after a refresh or on another
 * device, then the honest consolidated results and the certificate.
 * The server decides order, completion and eligibility; this page only
 * shows what it reports.
 */
export function FullMockPage() {
  const { theme } = useDashboardTheme();
  const { mockId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const justFinished = (location.state as { finished?: string } | null)?.finished;

  const [mock, setMock] = useState<MockOut | null>(null);
  const [results, setResults] = useState<MockResultsOut | null>(null);
  const [certificate, setCertificate] = useState<CertificateDetail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const fresh = await api.get<MockOut>(`/mocks/${mockId}`);
      setMock(fresh);
      if (fresh.status === "completed") {
        const [res, cert] = await Promise.all([
          api.get<MockResultsOut>(`/mocks/${mockId}/results`),
          fresh.certificate ? api.get<CertificateDetail>(`/certificates/${fresh.certificate.id}`) : Promise.resolve(null),
        ]);
        setResults(res);
        setCertificate(cert);
      }
    } catch (err) {
      setError(describeError(err, "Couldn't load this mock test."));
    }
  }, [mockId]);

  useEffect(() => {
    void load();
  }, [load]);

  const startModule = (module: MockModuleOut) => {
    if (module.status === "not_started") {
      const minutes = module.duration_minutes ? `${module.duration_minutes}-minute ` : "";
      const ok = window.confirm(
        `Start ${SKILL_META[module.module].label}? This is a timed ${minutes}section in exam mode. The timer keeps running if you leave the page.`,
      );
      if (!ok) return;
    }
    navigate(`/app/full-mock/${mockId}/${module.module}`);
  };

  const abandon = async () => {
    if (!window.confirm("End this mock test? Any section in progress is cancelled, and you won't get a certificate for it.")) return;
    setBusy(true);
    try {
      setMock(await api.post<MockOut>(`/mocks/${mockId}/abandon`));
    } catch (err) {
      setError(describeError(err, "Couldn't end this mock test."));
    } finally {
      setBusy(false);
    }
  };

  const percent = mock ? Math.round((mock.completed_modules / 4) * 100) : 0;

  return (
    <div className="dashboard-shell" data-theme={theme}>
      <DashboardSidebar />
      <div className="dashboard-content">
        <DashboardTopbar label="Full mock test" />
        <main className="dashboard-main dashboard-main-shell">
          <Link to="/app/mock-tests" className="dashboard-section-link dashboard-section-link-button">
            ← Back to Mock tests
          </Link>

          {!mock && !error && (
            <p className="auth-status-row">
              <Loader2 size={18} className="spin" aria-hidden="true" /> Loading your mock test…
            </p>
          )}
          {error && (
            <p className="form-banner form-banner-error form-banner-text" role="alert">
              {error}
            </p>
          )}

          {mock && (
            <>
              <div className="page-heading-row">
                <div className="page-heading">
                  <h1>{mock.status === "completed" ? "Full mock complete." : "Your full mock test."}</h1>
                  <p>
                    {mock.track === "academic" ? "Academic" : "General Training"} track · started {formatDate(mock.started_at)}
                    {mock.completed_at && ` · finished ${formatDate(mock.completed_at)}`}
                  </p>
                </div>
                <span className="track-pill">{mock.completed_modules} of 4 sections done</span>
              </div>

              <div
                className="mock-progress"
                role="progressbar"
                aria-label="Full mock progress"
                aria-valuemin={0}
                aria-valuemax={4}
                aria-valuenow={mock.completed_modules}
                aria-valuetext={`${mock.completed_modules} of 4 sections finished`}
              >
                <div className="mock-progress-fill" style={{ width: `${percent}%` }} />
              </div>

              {justFinished && mock.status === "in_progress" && (
                <p className="info-banner" role="status">
                  {SKILL_META[justFinished as keyof typeof SKILL_META]?.label ?? "Section"} is done.{" "}
                  {mock.next_module ? `${SKILL_META[mock.next_module].label} is next.` : ""}
                </p>
              )}
              {mock.status === "abandoned" && (
                <p className="info-banner">You ended this mock before finishing it, so it has no results or certificate.</p>
              )}

              <ol className="mock-module-list">
                {mock.modules.map((module, index) => {
                  const meta = SKILL_META[module.module];
                  const Icon = meta.icon;
                  const finished = isModuleFinished(module.status);
                  const canOpen = mock.status === "in_progress" && module.is_next;
                  return (
                    <li key={module.module} className={`dashboard-card mock-module${module.is_next ? " mock-module-next" : ""}`}>
                      <span className="mock-module-state" aria-hidden="true">
                        {finished ? <CheckCircle2 size={22} /> : module.is_next ? <PlayCircle size={22} /> : <Circle size={22} />}
                      </span>
                      <div className="mock-module-body">
                        <h2>
                          <Icon size={17} aria-hidden="true" /> {index + 1}. {meta.label}
                        </h2>
                        <p className="admin-muted">
                          {module.test_title}
                          {module.duration_minutes ? ` · ${module.duration_minutes} min` : ""}
                        </p>
                        <p className="mock-module-status">
                          {MODULE_STATUS_LABEL[module.status]}
                          {module.status === "in_progress" && module.expires_at && (
                            <>
                              {" "}
                              · <Clock size={13} aria-hidden="true" /> ends {formatDateTime(module.expires_at)}
                            </>
                          )}
                          {finished && module.submitted_at && ` · ${formatDateTime(module.submitted_at)}`}
                        </p>
                      </div>
                      {canOpen && (
                        <button type="button" className="button button-primary" onClick={() => startModule(module)}>
                          {module.status === "in_progress" ? "Continue" : "Start"} {meta.label}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ol>

              {mock.status === "in_progress" && (
                <div className="mock-footer-actions">
                  <p className="admin-muted">
                    Sections run in order. Each is timed by the server, so you can close the page and come back to it here.
                  </p>
                  <button type="button" className="button button-secondary" onClick={() => void abandon()} disabled={busy}>
                    End this mock
                  </button>
                </div>
              )}

              {results && (
                <section className="dashboard-card mock-results-card" aria-labelledby="mock-results-heading">
                  <h2 id="mock-results-heading">Your results</h2>
                  <MockResultsTable
                    modules={results.modules}
                    overallBand={results.overall_band}
                    overallNote={results.overall_band_note}
                    bandNote={results.band_note}
                  />
                </section>
              )}

              {certificate && (
                <section className="dashboard-card mock-results-card" aria-labelledby="mock-certificate-heading">
                  <h2 id="mock-certificate-heading">
                    <Award size={19} aria-hidden="true" /> Your practice completion certificate
                  </h2>
                  <p>
                    Certificate ID <code>{certificate.code}</code> · issued {formatDate(certificate.issued_at)}.{" "}
                    <Link to={`/app/certificates/${certificate.id}`}>View certificate</Link>
                  </p>
                  <p className="admin-muted">It&rsquo;s an unofficial practice certificate, not an IELTS result.</p>
                  <CertificateActions certificate={certificate} onChange={(updated) => setCertificate({ ...certificate, ...updated })} />
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
