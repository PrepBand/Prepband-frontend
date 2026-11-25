import { ArrowRight, Lock, RefreshCw, ServerCrash, CloudOff } from "lucide-react";
import { Link } from "react-router-dom";
import { Footer } from "../components/layout/Footer";
import { Header } from "../components/layout/Header";

export type StatusKind = "forbidden" | "error" | "unavailable";

const COPY: Record<StatusKind, { code: string; title: string; body: string; icon: typeof Lock }> = {
  forbidden: {
    code: "403",
    title: "You don’t have access to this page.",
    body: "This area is for a different kind of account. If you think you should be able to see it, log in with the right account or contact us.",
    icon: Lock,
  },
  error: {
    code: "500",
    title: "Something went wrong on our side.",
    body: "The page hit an unexpected error. Your saved answers are stored on the server and aren’t affected. Try reloading; if it keeps happening, let us know.",
    icon: ServerCrash,
  },
  unavailable: {
    code: "503",
    title: "Prepband is temporarily unavailable.",
    body: "Our free hosting may be asleep, restarting or over its monthly limit. Wait a minute and try again. Nothing you saved has been lost.",
    icon: CloudOff,
  },
};

/** FR-PUB-02's 403, 500 and service-unavailable pages. Also rendered by
 * AppErrorBoundary when a screen crashes. */
export function StatusPage({ kind }: { kind: StatusKind }) {
  const copy = COPY[kind];
  const Icon = copy.icon;
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header />
      <main id="main" className="dashboard-main status-page">
        <Icon size={36} aria-hidden="true" className="status-page-icon" />
        <p className="status-page-code" aria-hidden="true">{copy.code}</p>
        <h1>{copy.title}</h1>
        <p>{copy.body}</p>
        <div className="status-page-actions">
          {kind !== "forbidden" && (
            <button type="button" className="button button-secondary" onClick={() => window.location.reload()}>
              <RefreshCw size={16} aria-hidden="true" /> Try again
            </button>
          )}
          <Link className="button button-primary" to="/">
            Back to home <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
