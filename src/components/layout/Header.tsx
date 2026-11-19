import { useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../lib/AuthProvider";
import { Logo } from "./Logo";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { session } = useAuth();

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="site-header" id="top">
      <div className="nav-wrap">
        <Logo />
        <button
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          className="menu-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          type="button"
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
        <nav aria-label="Main navigation" className={menuOpen ? "main-nav is-open" : "main-nav"}>
          <Link to="/#how-it-works" onClick={closeMenu}>How it works</Link>
          <Link to="/#our-approach" onClick={closeMenu}>Our approach</Link>
          <Link to="/#faq" onClick={closeMenu}>FAQ</Link>
          {session ? (
            <Link className="nav-cta" to="/app/dashboard" onClick={closeMenu}>
              Go to dashboard <ArrowRight size={16} aria-hidden="true" />
            </Link>
          ) : (
            <>
              <Link to="/auth/login" onClick={closeMenu}>Log in</Link>
              <Link className="nav-cta" to="/auth/signup" onClick={closeMenu}>
                Sign up free <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </>
          )}
        </nav>
      </div>
      {menuOpen && (
        <button
          type="button"
          className="nav-backdrop"
          aria-label="Close navigation menu"
          onClick={closeMenu}
        />
      )}
    </header>
  );
}
