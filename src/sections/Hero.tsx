import { ArrowRight, Check, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { ScoreCard } from "./ScoreCard";

export function Hero() {
  return (
    <section className="hero-section">
      <div className="hero-grid">
        <div className="hero-copy">
          <h1>
            Small steps.
            <br />
            <span>Big next chapters.</span>
          </h1>
          <p className="hero-description">
            Build confidence for IELTS, one skill at a time.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/auth/signup">
              Start practicing free <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <a className="button button-secondary" href="#how-it-works">
              <span className="play-button">
                <Play size={11} fill="currentColor" aria-hidden="true" />
              </span>
              See how it works
            </a>
            <span className="honesty-chip">Not affiliated with IELTS</span>
          </div>
          <div className="hero-reassurance">
            <span className="reassurance-check">
              <Check size={13} strokeWidth={3} />
            </span>
            <span>Designed for steady, self-paced practice</span>
            <span className="reassurance-separator">·</span>
            <span>No paid AI required</span>
          </div>
        </div>
        <ScoreCard />
      </div>
      <div className="hero-bottom">
        <div className="skill-ribbon" aria-label="Listening, Reading, Writing and Speaking">
          <span>Listening</span>
          <i />
          <span>Reading</span>
          <i />
          <span>Writing</span>
          <i />
          <span>Speaking</span>
        </div>
      </div>
    </section>
  );
}
