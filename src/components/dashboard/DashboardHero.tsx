import { ArrowRight, BookOpen, BookOpenText, CalendarDays, CheckCircle2, Clock3, Headphones, Mic2, PenLine, Target } from "lucide-react";

type DashboardHeroProps = {
  firstName: string;
  targetBand: number | null;
  trackLabel: string | null;
  onPractice: () => void;
};

export function DashboardHero({ firstName, targetBand, trackLabel, onPractice }: DashboardHeroProps) {
  return (
    <>
      <div className="dashboard-hero-head">
        <div>
          <h1>A little closer, every day.</h1>
          <p>Welcome back, {firstName}. Let&rsquo;s make room for your next chapter.</p>
        </div>
        {targetBand != null && (
          <span className="target-pill">
            <Target size={14} aria-hidden="true" /> Target band {targetBand.toFixed(1)}
          </span>
        )}
      </div>

      <div className="dashboard-next-step">
        <div className="dashboard-next-step-copy">
          <h2>
            Small practice.
            <br />
            Meaningful progress.
          </h2>
          <p>Build your confidence, one skill at a time. A focused 15 minutes is a great place to start.</p>
          <button className="button button-primary dashboard-hero-cta" type="button" onClick={onPractice}>
            Let&rsquo;s practice <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="dashboard-orb-wrap" aria-hidden="true">
          <div className="dashboard-orb">
            <BookOpen size={30} strokeWidth={1.7} />
          </div>
          <span className="dashboard-orb-chip chip-orb-headphones">
            <Headphones size={16} />
          </span>
          <span className="dashboard-orb-chip chip-orb-reading">
            <BookOpenText size={16} />
          </span>
          <span className="dashboard-orb-chip chip-orb-pen">
            <PenLine size={16} />
          </span>
          <span className="dashboard-orb-chip chip-orb-mic">
            <Mic2 size={16} />
          </span>
        </div>
      </div>

      <div className="dashboard-stats" id="stats-heading">
        <div className="stat-tile">
          <Clock3 size={18} aria-hidden="true" />
          <strong>0 min</strong>
          <span>Every minute moves you forward</span>
        </div>
        <div className="stat-tile">
          <CheckCircle2 size={18} aria-hidden="true" />
          <strong>0</strong>
          <span>One step at a time</span>
        </div>
        <div className="stat-tile">
          <Target size={18} aria-hidden="true" />
          <strong>{targetBand != null ? targetBand.toFixed(1) : "—"}</strong>
          <span>{trackLabel ?? "Set your target in your profile"}</span>
        </div>
        <div className="stat-tile">
          <CalendarDays size={18} aria-hidden="true" />
          <strong>0 days</strong>
          <span>Make space for your goals</span>
        </div>
      </div>
    </>
  );
}
