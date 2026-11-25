import { useEffect, useState } from "react";
import { ArrowRight, Award, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { DashboardSidebar } from "../components/dashboard/DashboardSidebar";
import { DashboardTopbar } from "../components/dashboard/DashboardTopbar";
import { CertificateActions } from "../components/mock/CertificateActions";
import { api, describeError } from "../lib/apiClient";
import type { CertificateOut } from "../lib/attemptTypes";
import { formatDate } from "../lib/fullMock";
import { useDashboardTheme } from "../lib/useDashboardTheme";

/** FR-CERT-01..06: one unofficial certificate per completed full mock. */
export function CertificatesPage() {
  const { theme } = useDashboardTheme();
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState<CertificateOut[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<CertificateOut[]>("/certificates")
      .then(setCertificates)
      .catch((err) => setError(describeError(err, "Couldn't load your certificates.")));
  }, []);

  const replace = (updated: CertificateOut) =>
    setCertificates((current) => (current ?? []).map((item) => (item.id === updated.id ? updated : item)));

  return (
    <div className="dashboard-shell" data-theme={theme}>
      <DashboardSidebar />
      <div className="dashboard-content">
        <DashboardTopbar label="Certificates" />

        <main className="dashboard-main dashboard-main-shell">
          <div className="page-heading">
            <h1>A small celebration. A big commitment.</h1>
            <p>Your unofficial certificates recognise the full mock tests you&rsquo;ve completed. They are not IELTS results.</p>
          </div>

          {error && (
            <p className="form-banner form-banner-error form-banner-text" role="alert">
              {error}
            </p>
          )}
          {certificates === null && !error && (
            <p className="auth-status-row">
              <Loader2 size={18} className="spin" aria-hidden="true" /> Loading your certificates…
            </p>
          )}

          {certificates && certificates.length > 0 && (
            <ul className="certificate-list">
              {certificates.map((certificate) => (
                <li key={certificate.id} className="dashboard-card certificate-item">
                  <div className="certificate-item-head">
                    <span className="stage-icon certificate-icon" aria-hidden="true">
                      <Award size={22} />
                    </span>
                    <div>
                      <h2>
                        Full mock · {certificate.track === "academic" ? "Academic" : "General Training"}
                        {certificate.revoked_at && <span className="certificate-revoked"> Revoked</span>}
                      </h2>
                      <p className="admin-muted">
                        <code>{certificate.code}</code> · issued {formatDate(certificate.issued_at)}
                      </p>
                    </div>
                    <Link className="dashboard-section-link" to={`/app/certificates/${certificate.id}`}>
                      View details
                    </Link>
                  </div>
                  {certificate.revoked_at && (
                    <p className="form-banner form-banner-error form-banner-text">
                      This certificate was revoked on {formatDate(certificate.revoked_at)}
                      {certificate.revoked_reason ? `: ${certificate.revoked_reason}` : "."}
                    </p>
                  )}
                  <CertificateActions certificate={certificate} onChange={replace} />
                </li>
              ))}
            </ul>
          )}

          {certificates && certificates.length === 0 && (
            <div className="dashboard-card stage-card">
              <span className="stage-icon" aria-hidden="true">
                <Award size={28} />
              </span>
              <h2>Your effort deserves a moment.</h2>
              <p>Complete all four sections of a full mock test to get an unofficial practice completion certificate.</p>
              <button type="button" className="button button-primary stage-cta" onClick={() => navigate("/app/mock-tests")}>
                Go to mock tests <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
