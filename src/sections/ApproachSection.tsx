import { AudioLines, Sparkles, Stamp } from "lucide-react";

export function ApproachSection() {
  return (
    <section className="section approach-section" id="our-approach">
      <div className="approach-heading">
        <h2>Helpful feedback.<br /><span>Honest about its limits.</span></h2>
        <p>Good preparation is about more than a number. Know what you can measure, and what you can keep working on.</p>
      </div>
      <div className="approach-grid">
        <article className="approach-card objective-card">
          <div className="approach-symbol"><AudioLines size={22} /></div>
          <h3>Listening & Reading, objectively scored</h3>
          <p>See correct, incorrect, and unanswered responses with a raw practice score. Any band conversion is clearly labeled as an estimate.</p>
          <div className="approach-status"><span className="status-dot green-dot" /> Answers you can check</div>
        </article>
        <article className="approach-card guided-card">
          <div className="approach-symbol"><Sparkles size={22} /></div>
          <h3>Writing & Speaking, guided self-review</h3>
          <p>Get practical diagnostics and a rubric to reflect on your work. No unverified automated band score, just a clear next step.</p>
          <div className="approach-status"><span className="status-dot amber-dot" /> Feedback, not a band score</div>
        </article>
        <aside className="practice-note">
          <span className="note-asterisk"><Stamp size={18} aria-hidden="true" /></span>
          <strong>Practice scores are not official IELTS results.</strong>
          <p>Prepband is an independent practice platform, not an IELTS test provider or certifying body.</p>
        </aside>
      </div>
    </section>
  );
}
