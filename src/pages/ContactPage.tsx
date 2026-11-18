import { MessageSquare, Mail } from "lucide-react";
import { Footer } from "../components/layout/Footer";
import { Header } from "../components/layout/Header";

export function ContactPage() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main" className="dashboard-main">
        <h1>We&rsquo;d like to hear from you.</h1>
        <p>
          Prepband is a small, free, open-source project, not a company with a support team on standby, but
          every message gets read.
        </p>

        <div className="dashboard-card contact-card">
          <div className="contact-row">
            <span className="latest-steps-icon">
              <Mail size={18} aria-hidden="true" />
            </span>
            <div>
              <strong>Email</strong>
              <p>
                <a href="mailto:hello@prepband.app">hello@prepband.app</a>
              </p>
              <span className="contact-note">
                Placeholder inbox, swap this for a real monitored address before launch.
              </span>
            </div>
          </div>

          <div className="contact-row">
            <span className="latest-steps-icon">
              <MessageSquare size={18} aria-hidden="true" />
            </span>
            <div>
              <strong>Found a bug or have an idea?</strong>
              <p>Since Prepband is open-source, bug reports and feature requests are welcome as GitHub issues once the repository is public.</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
