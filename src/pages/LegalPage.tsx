import { ShieldAlert } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Footer } from "../components/layout/Footer";
import { Header } from "../components/layout/Header";
import { DashboardSidebar } from "../components/dashboard/DashboardSidebar";
import { DashboardTopbar } from "../components/dashboard/DashboardTopbar";
import { useAuth } from "../lib/AuthProvider";
import { useDashboardTheme } from "../lib/useDashboardTheme";

type Tab = "help" | "privacy" | "terms" | "cookies";

const tabs: { id: Tab; label: string; path: string }[] = [
  { id: "help", label: "Help & support", path: "/legal" },
  { id: "privacy", label: "Privacy policy", path: "/privacy" },
  { id: "terms", label: "Terms", path: "/terms" },
  { id: "cookies", label: "Cookies & storage", path: "/cookies" },
];

/** Last reviewed date shown on the policies. Update it with any change. */
const REVIEWED = "25 November 2026";

function Disclaimer() {
  return (
    <p className="legal-disclaimer">
      <ShieldAlert size={16} aria-hidden="true" />
      Prepband is not an authorized platform or a government platform for IELTS preparation. It is an
      independent, unofficial preparation site only, not affiliated with, endorsed by, or certified by
      IELTS, the British Council, IDP, or Cambridge Assessment English.
    </p>
  );
}

function tabFromPath(pathname: string): Tab {
  return tabs.find((tab) => tab.path === pathname)?.id ?? "help";
}

/** FR-PUB-03: help, privacy, terms and cookie/storage information, one
 * route per policy so each can be linked to directly. This is a draft for
 * legal review (spec section 14 item 11), not legal advice. */
export function LegalPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = tabFromPath(location.pathname);
  const { session } = useAuth();
  const { theme } = useDashboardTheme();

  const content = (
    <>
      <h1>Help, privacy and policies.</h1>
      <p>How Prepband works, what we do with your data, and what to expect from a free, independent practice site.</p>

      <div className="profile-tabs legal-tabs" role="tablist" aria-label="Legal sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`legal-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls="legal-panel"
            tabIndex={activeTab === tab.id ? 0 : -1}
            className={`profile-tab${activeTab === tab.id ? " profile-tab-active" : ""}`}
            onClick={() => navigate(tab.path)}
            onKeyDown={(event) => {
              if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
              const index = tabs.findIndex((t) => t.id === activeTab);
              const next = tabs[(index + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
              navigate(next.path);
              requestAnimationFrame(() => document.getElementById(`legal-tab-${next.id}`)?.focus());
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        id="legal-panel"
        role="tabpanel"
        aria-labelledby={`legal-tab-${activeTab}`}
        className="dashboard-card profile-tab-card legal-content"
      >
        {activeTab === "help" && (
          <>
            <h2>Help &amp; support</h2>
            <p>
              Prepband is a small, free, open-source project. You can practise Listening, Reading, Writing and
              Speaking on their own, or sit a full four-part mock exam. Listening and Reading are marked
              automatically. Writing and Speaking get practice feedback but <strong>no band score</strong>, because we
              have no validated way to mark them yet.
            </p>
            <p>
              <strong>The first page load is slow?</strong> The server runs on free hosting that sleeps when nobody is
              using it. Waking it takes up to a minute; you&rsquo;ll see a notice while it happens, and nothing you
              saved is lost.
            </p>
            <p>
              <strong>Microphone not working?</strong> Allow microphone access for this site in your browser&rsquo;s
              address bar, or use the text answer option on the Speaking screen.
            </p>
            <p>
              For anything else, such as account issues, feedback or deleting your data, reach us through the{" "}
              <Link to="/contact">Contact us</Link> page.
            </p>
          </>
        )}

        {activeTab === "privacy" && (
          <>
            <h2>Privacy policy</h2>
            <p className="admin-muted">Last reviewed {REVIEWED}.</p>
            <Disclaimer />
            <h3>What we store</h3>
            <ul>
              <li>Your account: email address and a password managed by Supabase Auth (we never see or store the password itself).</li>
              <li>Your profile: display name, exam track, target band, exam date and the study details you choose to give.</li>
              <li>Your practice: answers, essays, timings, scores, self-reviews, mock exam results and certificates.</li>
              <li>Speaking: only the mode, length and completion of each answer, plus text answers you type. See below for transcripts.</li>
            </ul>
            <p>We don&rsquo;t ask for passport numbers, immigration records or other identity documents, and you shouldn&rsquo;t enter them.</p>

            <h3>Recordings and the AI practice examiner</h3>
            <ul>
              <li>
                <strong>Your voice recordings never leave your device.</strong> They stay in your browser for playback and
                are gone when you close the page. We don&rsquo;t upload or keep audio.
              </li>
              <li>
                The live AI practice examiner hears you with speech models that run <em>inside your browser</em>. The
                models are downloaded once from public model hosts (Hugging Face, jsDelivr, GitHub) and kept in your
                browser&rsquo;s cache.
              </li>
              <li>
                Only if every on-device model fails <strong>and you tick the box allowing it</strong>, the browser&rsquo;s own
                speech recognition is used. In Chrome and Edge that sends your audio to Google or Microsoft.
              </li>
              <li>
                Your transcript is saved to your history only if you choose that before the test. Otherwise only
                timings are saved. You can ask us to delete saved transcripts at any time.
              </li>
            </ul>

            <h3>Certificates</h3>
            <p>
              A practice certificate is private by default. If you turn on public verification, anyone with its ID can
              see that it exists, whether it&rsquo;s valid and when it was issued; nothing else. You can turn it off again.
            </p>

            <h3>Who processes your data</h3>
            <p>
              Supabase (database and sign-in), Render (our API server), Netlify (this website), Cloudflare R2 (test audio
              and profile photos) and Resend (sign-up and password emails). We don&rsquo;t sell your data or share it with
              advertisers, and there are no analytics or ad trackers.
            </p>

            <h3>Admins</h3>
            <p>
              Prepband admins can see account emails, names, roles and attempt counts, and every admin change is recorded in
              an audit log. Admins can&rsquo;t see your password.
            </p>

            <h3>How long we keep it, and deleting it</h3>
            <p>
              We keep your account and practice history until you ask us to delete them. Ask through the{" "}
              <Link to="/contact">Contact us</Link> page and we&rsquo;ll delete your account and everything linked to it.
            </p>
          </>
        )}

        {activeTab === "terms" && (
          <>
            <h2>Terms</h2>
            <p className="admin-muted">Last reviewed {REVIEWED}.</p>
            <Disclaimer />
            <p>
              Prepband is provided free of charge, as is, for personal IELTS-style practice. Scores, feedback and completion
              certificates on Prepband are practice estimates, not official results, and carry no legal or academic standing
              with IELTS or any test centre. A Prepband certificate must never be presented as an IELTS Test Report Form.
            </p>
            <p>
              The AI practice examiner is a computer program, not a real person or a qualified examiner, and it never gives
              you a band score.
            </p>
            <p>
              Because Prepband runs on free-tier hosting, it can be slow to wake, briefly unavailable, or limited when a free
              quota runs out. We don&rsquo;t promise any level of availability.
            </p>
            <p>
              Please don&rsquo;t try to break, overload or scrape the service, or access other people&rsquo;s data. Requests are
              rate-limited, and we may suspend accounts that misuse the service.
            </p>
          </>
        )}

        {activeTab === "cookies" && (
          <>
            <h2>Cookies &amp; storage</h2>
            <p className="admin-muted">Last reviewed {REVIEWED}.</p>
            <Disclaimer />
            <p>Prepband uses no advertising or tracking cookies. It keeps these things in your browser:</p>
            <ul>
              <li><strong>Sign-in session</strong>: set by Supabase&rsquo;s sign-in library to keep you logged in.</li>
              <li><strong>Theme</strong>: whether you chose light or dark mode.</li>
              <li><strong>Speech models</strong>: the downloaded examiner models, cached so they don&rsquo;t download again. Clear them in your browser&rsquo;s site settings.</li>
              <li><strong>Unsent answers</strong>: a copy of answers and essay text the server hasn&rsquo;t confirmed yet is saved on this device (browser local storage), so it isn&rsquo;t lost if the tab closes or the connection drops. Each copy is removed once the server confirms the save or you submit the test; copies from tests that are never reopened are deleted after 30 days. Closing the tab does not remove them. On a shared device, submit your test, or clear this site&rsquo;s data in your browser settings. Recordings are never stored this way.</li>
            </ul>
          </>
        )}
      </div>
    </>
  );

  if (session) {
    return (
      <>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <div className="dashboard-shell" data-theme={theme}>
          <DashboardSidebar />
          <div className="dashboard-content">
            <DashboardTopbar label="Legal" />
            <main id="main" className="dashboard-main dashboard-main-shell">
              {content}
            </main>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main" className="dashboard-main">
        {content}
      </main>
      <Footer />
    </>
  );
}
