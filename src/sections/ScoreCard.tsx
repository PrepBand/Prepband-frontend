import { Headphones, BookOpen, PenLine, Mic2 } from "lucide-react";

const rows = [
  { name: "Listening", icon: Headphones, tone: "listening", band: "7.5", width: 83 },
  { name: "Reading", icon: BookOpen, tone: "reading", band: "7.0", width: 78 },
  { name: "Writing", icon: PenLine, tone: "writing", band: "7.0", width: 78 },
  { name: "Speaking", icon: Mic2, tone: "speaking", band: "8.0", width: 89 },
];

export function ScoreCard() {
  return (
    <div className="score-card-wrap" aria-hidden="true">
      <div className="score-card">
        <div className="score-card-head">
          <span className="score-card-label">SAMPLE RESULT</span>
          <span className="score-card-overall">
            7.5<small>Overall</small>
          </span>
        </div>
        <div className="score-rows">
          {rows.map(({ name, icon: Icon, tone, band, width }) => (
            <div className={`score-row ${tone}`} key={name}>
              <span className={`score-row-icon ${tone}`}>
                <Icon size={15} strokeWidth={2} aria-hidden="true" />
              </span>
              <span className="score-row-body">
                <span className="score-row-label">{name}</span>
                <span className="score-row-track">
                  <span className="score-row-fill" style={{ width: `${width}%` }} />
                </span>
              </span>
              <span className="score-row-band">{band}</span>
            </div>
          ))}
        </div>
        <div className="score-card-foot">Illustrative sample, not an official IELTS score.</div>
      </div>
    </div>
  );
}
