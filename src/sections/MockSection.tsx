import { ArrowRight, Check, Clock3, Play, Sparkles } from "lucide-react";
import { skills } from "../data/content";

export function MockSection() {
  return (
    <section className="mock-section" id="how-it-works">
      <div className="mock-inner">
        <div className="mock-copy">
          <h2>When you're ready,<br />bring it <span>all together.</span></h2>
          <p>
            A guided mock takes you through Listening, Reading, Writing, and Speaking. Review your progress in one place, without pretending every skill can be reduced to a number.
          </p>
          <a className="text-link" href="#our-approach">See how scoring works <ArrowRight size={16} aria-hidden="true" /></a>
          <div className="mock-benefits">
            <span><Check size={15} /> Four-part guided flow</span>
            <span><Check size={15} /> Pick up where you left off</span>
            <span><Check size={15} /> One clear progress review</span>
          </div>
        </div>

        <div className="mock-visual" aria-label="Illustration of a four-part mock test">
          <div className="mock-visual-head">
            <div>
              <h3>A full mock, at your pace</h3>
            </div>
            <span className="mock-clock"><Clock3 size={15} /> Guided</span>
          </div>
          <div className="mock-timeline">
            {skills.map(({ name, icon: Icon }, index) => (
              <div className={`timeline-row ${index === 0 ? "timeline-active" : ""}`} key={name}>
                <span className={`timeline-icon timeline-${index}`}><Icon size={17} aria-hidden="true" /></span>
                <span className="timeline-name">{name}</span>
                <span className="timeline-status">{index === 0 ? "Start here" : "Up next"}</span>
                <span className={`timeline-check ${index === 0 ? "timeline-current" : ""}`}>
                  {index === 0 ? <Play size={10} fill="currentColor" /> : <span>{String(index + 1).padStart(2, "0")}</span>}
                </span>
              </div>
            ))}
          </div>
          <div className="mock-footnote"><Sparkles size={15} /> Your work is saved as you go.</div>
        </div>
      </div>
    </section>
  );
}
