import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { DashboardSidebar } from "../components/dashboard/DashboardSidebar";
import { DashboardTopbar } from "../components/dashboard/DashboardTopbar";
import { CertificateActions } from "../components/mock/CertificateActions";
import { MockResultsTable } from "../components/mock/MockResultsTable";
import { api, describeError } from "../lib/apiClient";
import type { CertificateDetail } from "../lib/attemptTypes";
import { formatDate } from "../lib/fullMock";
import { useDashboardTheme } from "../lib/useDashboardTheme";

const UNOFFICIAL_LABEL = "UNOFFICIAL IELTS-STYLE PRACTICE COMPLETION CERTIFICATE — NOT AN OFFICIAL IELTS RESULT";

/** A preview of exactly what the PDF says, built from the same server data. */
export function CertificateDetailPage() {
  const { theme } = useDashboardTheme();
  const { certificateId = "" } = useParams();
  const [certificate, setCertificate] = useState<CertificateDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<CertificateDetail>(`/certificates/${certificateId}`)
      .then(setCertificate)
      .catch((err) => setError(describeError(err, "Couldn't load this certificate.")));
  }, [certificateId]);

  return (
    <div className="dashboard-shell" data-theme={theme}>
      <DashboardSidebar />
      <div className="dashboard-content">
        <DashboardTopbar label="Certificate" />
        <main className="dashboard-main dashboard-main-shell">
          <Link to="/app/certificates" className="dashboard-section-link dashboard-section-link-button">
            ← Back to Certificates
          </Link>

          {!certificate && !error && (
            <p className="auth-status-row">
              <Loader2 size={18} className="spin" aria-hidden="true" /> Loading certificate…
            </p>
          )}
          {error && (
            <p className="form-banner form-banner-error form-banner-text" role="alert">
              {error}
            </p>
          )}

          {certificate && (
            <>
              <article className="dashboard-card certificate-preview" aria-label="Certificate preview">
                <p className="certificate-preview-label">{UNOFFICIAL_LABEL}</p>
                {certificate.revoked_at && (
                  <p className="form-banner form-banner-error form-banner-text">
                    Revoked on {formatDate(certificate.revoked_at)}
                    {certificate.revoked_reason ? `: ${certificate.revoked_reason}` : ""}. It is no longer valid.
                  </p>
                )}
                <h1>Practice completion certificate</h1>
                <p className="admin-muted">This confirms that</p>
                <p className="certificate-preview-name">{certificate.holder_name}</p>
                <p>
                  completed a full four-module IELTS-style practice mock test (
                  {certificate.track === "academic" ? "Academic" : "General Training"} track) on Prepband, finished on{" "}
                  {formatDate(certificate.completed_at ?? certificate.issued_at)}.
                </p>
                <MockResultsTable
                  modules={certificate.modules}
                  overallBand={certificate.overall_band}
                  overallNote={certificate.overall_band_note}
                  linkToAttempts={false}
                />
                <p className="admin-muted">
                  Certificate ID <code>{certificate.code}</code> · issued {formatDate(certificate.issued_at)}
                </p>
                <p className="certificate-preview-disclaimer">
                  This is not an IELTS Test Report Form, not an IELTS result and not a qualification. Prepband is an independent
                  practice platform and is not affiliated with or endorsed by IELTS or its owners. The name shown comes from your
                  profile; change it there if it&rsquo;s wrong.
                </p>
              </article>

              <section className="dashboard-card mock-results-card" aria-labelledby="certificate-actions-heading">
                <h2 id="certificate-actions-heading">Download and share</h2>
                <CertificateActions certificate={certificate} onChange={(updated) => setCertificate({ ...certificate, ...updated })} />
                <p className="admin-muted">
                  <Link to={`/app/full-mock/${certificate.mock_attempt_id}`}>See the full mock results</Link>
                </p>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
