import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { Footer } from "../components/layout/Footer";
import { Header } from "../components/layout/Header";
import { DashboardSidebar } from "../components/dashboard/DashboardSidebar";
import { DashboardTopbar } from "../components/dashboard/DashboardTopbar";
import { useAuth } from "../lib/AuthProvider";
import { useDashboardTheme } from "../lib/useDashboardTheme";

type Tab = "help" | "privacy" | "terms" | "cookies";

const tabs: { id: Tab; label: string }[] = [
  { id: "help", label: "Help & support" },
  { id: "privacy", label: "Privacy policy" },
  { id: "terms", label: "Terms" },
  { id: "cookies", label: "Cookie policy" },
];

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

export function LegalPage() {
  const [activeTab, setActiveTab] = useState<Tab>("help");
  const { session } = useAuth();
  const { theme } = useDashboardTheme();

  const content = (
    <>
      <h1>Help, privacy and policies.</h1>
      <p>Everything about how Prepband works, what we do with your data, and what to expect as a free, independent practice site.</p>

      <nav className="profile-tabs legal-tabs" aria-label="Legal sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`profile-tab${activeTab === tab.id ? " profile-tab-active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="dashboard-card profile-tab-card legal-content">
        {activeTab === "help" && (
          <>
            <h2>Help &amp; support</h2>
            <p>
              Prepband is a small, free, open-source project. If something looks broken, a page won&rsquo;t
              load, or a practice module you expected isn&rsquo;t available yet, that&rsquo;s most likely because
              it hasn&rsquo;t been built yet rather than a bug on your end, we&rsquo;re still early in building out
              Listening, Reading, Writing, Speaking and full mock exams.
            </p>
            <p>
              For anything else, account issues, feedback, or a question about how a feature works, reach
              us through the <Link to="/contact">Contact us</Link> page.
            </p>
          </>
        )}

        {activeTab === "privacy" && (
          <>
            <h2>Privacy policy</h2>
            <Disclaimer />
            <p>
              We collect only what&rsquo;s needed to run your account: your email address, the display name
              and study details you give us (track, target band, exam date), and basic practice activity
              once practice modules go live. Authentication and account storage are handled by Supabase;
              account emails (such as sign-up and password reset codes) are delivered through Resend.
            </p>
            <p>
              We don&rsquo;t sell your data, and we don&rsquo;t share it with advertisers. You can ask us to
              delete your account and associated data at any time from the <Link to="/contact">Contact us</Link>{" "}
              page.
            </p>
          </>
        )}

        {activeTab === "terms" && (
          <>
            <h2>Terms</h2>
            <Disclaimer />
            <p>
              Prepband is provided free of charge, as-is, for personal IELTS-style practice. Scores,
              feedback and completion certificates you see on Prepband are practice estimates, not official
              results, and carry no legal or academic standing with IELTS or any test center.
            </p>
            <p>
              Because Prepband runs on free-tier infrastructure, availability and usage limits can change
              without notice. We&rsquo;ll always try to communicate those limits honestly rather than promise
              uptime we can&rsquo;t guarantee.
            </p>
          </>
        )}

        {activeTab === "cookies" && (
          <>
            <h2>Cookie policy</h2>
            <Disclaimer />
            <p>
              Prepband doesn&rsquo;t use advertising or tracking cookies. The only browser storage we rely on
              is what Supabase&rsquo;s authentication library sets up automatically to keep you signed in
              between visits, there&rsquo;s no separate analytics or ad-tracking layer.
            </p>
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
