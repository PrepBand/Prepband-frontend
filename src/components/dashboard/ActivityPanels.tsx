import { ArrowRight, BookOpen, CalendarDays, Quote } from "lucide-react";

const CONSISTENCY_QUOTE = "Great things are done by a series of small things brought together.";

function getCurrentWeek() {
  const today = new Date();
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  return ["M", "T", "W", "T", "F", "S", "S"].map((label, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return {
      label,
      key: `${label}-${index}`,
      dayNumber: date.getDate(),
      isToday: date.toDateString() === today.toDateString(),
    };
  });
}

type LatestStepsCardProps = {
  onChoosePractice: () => void;
  onChooseMock: () => void;
};

export function LatestStepsCard({ onChoosePractice, onChooseMock }: LatestStepsCardProps) {
  return (
    <div className="dashboard-card latest-steps-card">
      <h2 id="latest-steps-heading" className="dashboard-section-title">
        Your latest steps
      </h2>

      <div className="latest-steps-row">
        <span className="latest-steps-icon">
          <BookOpen size={18} aria-hidden="true" />
        </span>
        <div>
          <strong>Your first small win is waiting.</strong>
          <p>Complete a practice and we&rsquo;ll keep your progress here.</p>
          <button type="button" className="skill-link latest-steps-link" onClick={onChoosePractice}>
            Choose a practice <ArrowRight size={13} aria-hidden="true" />
          </button>
        </div>
      </div>

      <button type="button" id="mock-banner" className="latest-steps-banner" onClick={onChooseMock}>
        <div>
          <strong>Ready to bring it all together?</strong>
          <p>Try a guided, four-skill mock.</p>
        </div>
        <ArrowRight size={18} aria-hidden="true" />
      </button>
    </div>
  );
}

export function WeekCalendarCard() {
  const week = getCurrentWeek();

  return (
    <div className="dashboard-card week-calendar-card">
      <div className="week-calendar-head">
        <h2 className="dashboard-section-title">Make room for small wins.</h2>
        <CalendarDays size={18} aria-hidden="true" />
      </div>
      <p className="week-calendar-subtitle">A little consistency goes a long way.</p>

      <div className="week-calendar-row">
        {week.map((day) => (
          <div className="week-calendar-day" key={day.key}>
            <span className="week-calendar-label">{day.label}</span>
            <span className={`week-calendar-number${day.isToday ? " week-calendar-number-active" : ""}`}>
              {day.dayNumber}
            </span>
          </div>
        ))}
      </div>

      <div className="week-calendar-quote">
        <Quote size={14} aria-hidden="true" />
        <p>{CONSISTENCY_QUOTE}</p>
      </div>
    </div>
  );
}
