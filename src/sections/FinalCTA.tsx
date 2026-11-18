import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export function FinalCTA() {
  return (
    <section className="final-cta">
      <div className="cta-pattern" aria-hidden="true" />
      <div className="cta-content">
        <h2>Make room for<br />a little progress.</h2>
        <p>Explore a calmer, more considered way to prepare.</p>
        <Link className="button button-light" to="/auth/signup">
          Create your free account <ArrowRight size={17} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
