import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Footer } from "../components/layout/Footer";
import { Header } from "../components/layout/Header";

/** FR-PUB-03 About page: what Prepband is, and just as plainly, what it isn't. */
export function AboutPage() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header />
      <main id="main" className="dashboard-main legal-content about-page">
        <h1>About Prepband.</h1>
        <p>
          Prepband is a free, open-source place to practise for an IELTS-style exam: Listening, Reading, Writing and
          Speaking, on their own or as a full four-part mock. It runs entirely on free hosting, so it costs you nothing
          and asks for no card.
        </p>

        <h2>What we promise</h2>
        <ul>
          <li><strong>Honest scores.</strong> Listening and Reading are marked against an answer key. Writing and Speaking get practice feedback, never an invented band.</li>
          <li><strong>Original material.</strong> Every passage, recording and question is written for Prepband.</li>
          <li><strong>Your voice stays with you.</strong> Recordings never leave your device, and the AI practice examiner runs in your browser.</li>
        </ul>

        <h2>What we are not</h2>
        <p className="legal-disclaimer">
          Prepband is not IELTS and is not affiliated with, endorsed by or certified by IELTS, the British Council, IDP or
          Cambridge Assessment English. Our certificates are unofficial practice records, never an IELTS result.
        </p>

        <p>
          Questions or feedback? <Link to="/contact">Get in touch</Link>, or read our{" "}
          <Link to="/privacy">privacy policy</Link> and <Link to="/terms">terms</Link>.
        </p>
        <Link className="button button-primary" to="/auth/signup">
          Start practising <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </main>
      <Footer />
    </>
  );
}
