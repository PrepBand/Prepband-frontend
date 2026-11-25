import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, ShieldAlert, XCircle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Footer } from "../components/layout/Footer";
import { Header } from "../components/layout/Header";
import { ApiError, describeError, publicGet } from "../lib/apiClient";
import type { VerificationOut } from "../lib/attemptTypes";
import { formatDate } from "../lib/fullMock";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "found"; result: VerificationOut }
  | { kind: "not_found" }
  | { kind: "error"; message: string };

/**
 * FR-CERT-06: public, minimal verification. Shows only the certificate ID,
 * whether it's valid and its issue date - and only for certificates whose
 * holder opted in. Everything else looks like "not found" on purpose.
 */
export function VerifyCertificatePage() {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(code);
  const [state, setState] = useState<State>({ kind: "idle" });

  useEffect(() => {
    if (!code) {
      setState({ kind: "idle" });
      return;
    }
    setInput(code);
    setState({ kind: "loading" });
    publicGet<VerificationOut>(`/verify/${encodeURIComponent(code)}`)
      .then((result) => setState({ kind: "found", result }))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) setState({ kind: "not_found" });
        else setState({ kind: "error", message: describeError(err, "Verification is unavailable right now.") });
      });
  }, [code]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const cleaned = input.trim().toUpperCase();
    if (cleaned) navigate(`/verify/${cleaned}`);
  };

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main" className="dashboard-main verify-page">
        <h1>Verify a Prepband certificate</h1>
        <p>
          Enter the certificate ID printed on the PDF (for example <code>PB-7KQ2-M9XD-4HWT-Z3NC</code>). Prepband certificates are
          unofficial practice certificates. They are not IELTS results.
        </p>

        <form className="verify-form" onSubmit={submit}>
          <label htmlFor="certificate-code">Certificate ID</label>
          <div className="verify-form-row">
            <input
              id="certificate-code"
              className="form-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder="PB-XXXX-XXXX-XXXX-XXXX"
            />
            <button type="submit" className="button button-primary">
              Verify
            </button>
          </div>
        </form>

        <div aria-live="polite">
          {state.kind === "loading" && (
            <p className="auth-status-row">
              <Loader2 size={18} className="spin" aria-hidden="true" /> Checking…
            </p>
          )}
          {state.kind === "found" && (
            <div className={`dashboard-card verify-result verify-result-${state.result.status}`}>
              {state.result.status === "valid" ? <CheckCircle2 size={26} aria-hidden="true" /> : <XCircle size={26} aria-hidden="true" />}
              <div>
                <h2>{state.result.status === "valid" ? "Valid certificate" : "Revoked certificate"}</h2>
                <p>{state.result.statement}</p>
                <dl>
                  <dt>Certificate ID</dt>
                  <dd>
                    <code>{state.result.code}</code>
                  </dd>
                  <dt>Issued</dt>
                  <dd>{formatDate(state.result.issued_on)}</dd>
                </dl>
              </div>
            </div>
          )}
          {state.kind === "not_found" && (
            <div className="dashboard-card verify-result verify-result-unknown">
              <ShieldAlert size={26} aria-hidden="true" />
              <div>
                <h2>No public certificate with this ID</h2>
                <p>
                  Check the ID for typos. A genuine certificate can also be private: its holder decides whether it can be verified
                  publicly.
                </p>
              </div>
            </div>
          )}
          {state.kind === "error" && (
            <p className="form-banner form-banner-error form-banner-text" role="alert">
              {state.message}
            </p>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
