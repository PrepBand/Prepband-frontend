import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Footer } from "../components/layout/Footer";
import { Header } from "../components/layout/Header";

export function NotFoundPage() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header />
      <main id="main" className="dashboard-main" style={{ textAlign: "center" }}>
        <h1>404 — this page doesn&rsquo;t exist.</h1>
        <p>
          The link might be out of date, or the page may have moved. Head back to the homepage to
          keep practicing.
        </p>
        <Link className="button button-primary" to="/">
          Back to home <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </main>
      <Footer />
    </>
  );
}
