import { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, Loader2 } from "lucide-react";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { api, describeError } from "../../lib/apiClient";
import type { AdminCertificate } from "../../lib/adminTypes";

/** FR-CERT-08: list issued practice certificates and revoke one (for
 * example after a reported misuse). Revocation is permanent, needs a
 * reason, and is recorded in the audit log. */
export function AdminCertificatesPage() {
  const [certificates, setCertificates] = useState<AdminCertificate[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [revoking, setRevoking] = useState<AdminCertificate | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(() => {
    api
      .get<AdminCertificate[]>("/admin/certificates")
      .then(setCertificates)
      .catch((err) => setError(describeError(err, "Failed to load certificates.")));
  }, []);

  useEffect(load, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!certificates || !needle) return certificates ?? [];
    return certificates.filter((c) =>
      [c.code, c.holder_name, c.holder_email ?? ""].some((value) => value.toLowerCase().includes(needle)),
    );
  }, [certificates, query]);

  const revoke = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!revoking) return;
    if (reason.trim().length < 3) {
      setFormError("Give a reason of at least 3 characters.");
      return;
    }
    setBusy(true);
    setFormError("");
    try {
      await api.post(`/admin/certificates/${revoking.id}/revoke`, { reason: reason.trim() });
      setRevoking(null);
      setReason("");
      load();
    } catch (err) {
      setFormError(describeError(err, "Failed to revoke the certificate."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminLayout title="Certificates">
      <div className="page-heading">
        <h1>Certificates.</h1>
        <p>Unofficial practice certificates issued for completed full mocks. A revoked certificate shows as revoked on its PDF and on public verification.</p>
      </div>

      {error && <p className="form-banner form-banner-error" role="alert">{error}</p>}

      <div className="admin-toolbar">
        <input
          className="form-input admin-search"
          type="search"
          placeholder="Search by ID, name or email"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search certificates"
        />
        {certificates && <span className="admin-muted">{filtered.length} of {certificates.length}</span>}
      </div>

      {revoking && (
        <form className="dashboard-card admin-card admin-form" onSubmit={revoke} aria-labelledby="revoke-heading">
          <h2 id="revoke-heading">Revoke {revoking.code}</h2>
          <p>
            Issued to {revoking.holder_name} on {new Date(revoking.issued_at).toLocaleDateString()}. This can&rsquo;t be undone.
          </p>
          <label className="admin-field admin-field-wide">
            <span>Reason (kept in the audit log)</span>
            <input className="form-input" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
          </label>
          {formError && <p className="form-banner form-banner-error" role="alert">{formError}</p>}
          <div className="admin-actions">
            <button type="submit" className="button button-primary admin-danger" disabled={busy}>
              {busy && <Loader2 size={16} className="spin" aria-hidden="true" />} Revoke certificate
            </button>
            <button type="button" className="button button-secondary" onClick={() => setRevoking(null)} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {!certificates && !error && (
        <p className="admin-muted">
          <Loader2 size={16} className="spin" aria-hidden="true" /> Loading…
        </p>
      )}

      {certificates && (
        <div className="dashboard-card admin-card admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Certificate ID</th>
                <th scope="col">Holder</th>
                <th scope="col">Track</th>
                <th scope="col">Issued</th>
                <th scope="col">Public check</th>
                <th scope="col">Status</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td><code>{c.code}</code></td>
                  <td>
                    {c.holder_name}
                    {c.holder_email && <span className="admin-muted"> · {c.holder_email}</span>}
                  </td>
                  <td>{c.track === "academic" ? "Academic" : "General Training"}</td>
                  <td>{new Date(c.issued_at).toLocaleDateString()}</td>
                  <td>{c.public_verification ? "On" : "Off"}</td>
                  <td>
                    {c.revoked_at ? (
                      <span className="admin-pill admin-pill-danger" title={c.revoked_reason ?? undefined}>
                        revoked {new Date(c.revoked_at).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="admin-pill admin-pill-success">valid</span>
                    )}
                  </td>
                  <td>
                    {!c.revoked_at && (
                      <button
                        type="button"
                        className="button button-secondary button-sm admin-danger"
                        onClick={() => {
                          setRevoking(c);
                          setReason("");
                          setFormError("");
                        }}
                      >
                        <Ban size={14} aria-hidden="true" /> Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="admin-muted">
                    {certificates.length === 0 ? "No certificates issued yet." : "No certificates match."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
