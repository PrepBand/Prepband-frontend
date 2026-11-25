import { Link } from "react-router-dom";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand">
          <Logo />
          <p>Practice with purpose.<br />Move forward at your pace.</p>
        </div>
        <div className="footer-links">
          <div>
            <span className="footer-heading">EXPLORE</span>
            <Link to="/#how-it-works">How it works</Link>
            <Link to="/#our-approach">Our approach</Link>
            <Link to="/#faq">FAQ</Link>
          </div>
          <div>
            <span className="footer-heading">ACCOUNT</span>
            <Link to="/auth/login">Log in</Link>
            <Link to="/auth/signup">Sign up</Link>
          </div>
          <div>
            <span className="footer-heading">LEGAL</span>
            <Link to="/legal">Help & support</Link>
            <Link to="/privacy">Privacy policy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/cookies">Cookies &amp; storage</Link>
            <Link to="/about">About</Link>
            <Link to="/contact">Contact us</Link>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Prepband</span>
        <p>
          Prepband is an independent, unofficial preparation site. It is not an authorized platform or a
          government platform for IELTS preparation, and is not affiliated with, endorsed by, or certified
          by IELTS, the British Council, IDP, or Cambridge Assessment English. Practice scores and
          completion certificates are for personal study only and are never official results.
        </p>
      </div>
    </footer>
  );
}
