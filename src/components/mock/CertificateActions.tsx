import { useState } from "react";
import { Copy, Download, Loader2 } from "lucide-react";
import { api, describeError, downloadFile } from "../../lib/apiClient";
import type { CertificateOut } from "../../lib/attemptTypes";

/**
 * Download the PDF (generated on demand) and manage public verification
 * consent (FR-CERT-05/06). Off by default; turning it on adds a QR code
 * and link to the PDF that show only the ID, validity and issue date.
 */
export function CertificateActions({
  certificate,
  onChange,
}: {
  certificate: CertificateOut;
  onChange: (updated: CertificateOut) => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const revoked = certificate.revoked_at != null;

  const download = async () => {
    setDownloading(true);
    setError("");
    try {
      await downloadFile(`/certificates/${certificate.id}/pdf`, `prepband-certificate-${certificate.code}.pdf`);
    } catch (err) {
      setError(describeError(err, "Couldn't download the certificate."));
    } finally {
      setDownloading(false);
    }
  };

  const toggleVerification = async (enabled: boolean) => {
    setSaving(true);
    setError("");
    try {
      onChange(await api.patch<CertificateOut>(`/certificates/${certificate.id}`, { public_verification: enabled }));
    } catch (err) {
      setError(describeError(err, "Couldn't update verification."));
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async () => {
    if (!certificate.verification_url) return;
    try {
      await navigator.clipboard.writeText(certificate.verification_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy the link. Select it and copy it instead.");
    }
  };

  return (
    <div className="certificate-actions">
      <button type="button" className="button button-primary" onClick={() => void download()} disabled={downloading}>
        {downloading ? <Loader2 size={15} className="spin" aria-hidden="true" /> : <Download size={15} aria-hidden="true" />}
        {downloading ? "Preparing PDF…" : "Download PDF"}
      </button>

      {!revoked && (
        <label className="certificate-consent">
          <input
            type="checkbox"
            checked={certificate.public_verification}
            disabled={saving}
            onChange={(event) => void toggleVerification(event.target.checked)}
          />
          <span>
            <strong>Allow public verification</strong>
            <span className="admin-muted">
              Anyone with the certificate ID can confirm it is genuine, and the PDF gets a QR code. They see only the ID, whether
              it&rsquo;s valid and the issue date, never your name or scores.
            </span>
          </span>
        </label>
      )}

      {certificate.verification_url && (
        <div className="certificate-link-row">
          <code>{certificate.verification_url}</code>
          <button type="button" className="button button-secondary button-sm" onClick={() => void copyLink()}>
            <Copy size={14} aria-hidden="true" /> {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      )}

      {error && (
        <p className="form-banner form-banner-error form-banner-text" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
