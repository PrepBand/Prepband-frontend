import { ArrowRight, CalendarDays, Flag } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { DashboardSidebar } from "../components/dashboard/DashboardSidebar";
import { DashboardTopbar } from "../components/dashboard/DashboardTopbar";
import { SKILL_META } from "../data/practice";
import { buildStudyPlan, type FocusStatus, type PrepLevel } from "../lib/studyPlan";
import { useDashboardTheme } from "../lib/useDashboardTheme";
import { useProfile } from "../lib/useProfile";
import { useProgress } from "../lib/useProgress";

const STATUS_LABEL: Record<FocusStatus, string> = {
  behind: "Needs work",
  on_track: "On track",
  no_data: "No estimate yet",
  no_target: "No target set",
  practice_only: "Practise weekly",
};

function formatDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

/** A weekly plan from the exam date, targets and finished practice. */
export function StudyPlanPage() {
  const { theme } = useDashboardTheme();
  const navigate = useNavigate();
  const { studyGoal, targetScores, loading: profileLoading } = useProfile();
  const { progress, error } = useProgress();

  const plan = buildStudyPlan({
    examDate: studyGoal?.exam_date ?? null,
    preparationLevel: (studyGoal?.preparation_level as PrepLevel | undefined) ?? null,
    targets: {
      listening: targetScores?.listening ?? null,
      reading: targetScores?.reading ?? null,
      writing: targetScores?.writing ?? null,
      speaking: targetScores?.speaking ?? null,
      overall: targetScores?.overall ?? null,
    },
    progress,
  });

  return (
    <div className="dashboard-shell" data-theme={theme}>
      <DashboardSidebar />
      <div className="dashboard-content">
        <DashboardTopbar label="Study plan" />

        <main className="dashboard-main dashboard-main-shell">
          <div className="page-heading-row">
            <div className="page-heading">
              <h1>{profileLoading ? "Your study plan" : plan.headline}</h1>
              <p>
                Built from your exam date, target scores and the tests you&rsquo;ve finished. It updates every time you
                practise.
                {(plan.phase === "no_date" || plan.phase === "past") && !profileLoading && (
                  <>
                    {" "}
                    {plan.phase === "no_date" ? "Add" : "Update"} your exam date in <Link to="/app/profile">your profile</Link>{" "}
                    for dated milestones.
                  </>
                )}
              </p>
            </div>
            {plan.daysLeft != null && plan.daysLeft >= 0 && (
              <span className="track-pill">
                <CalendarDays size={14} aria-hidden="true" /> {plan.daysLeft} days left
              </span>
            )}
          </div>

          {error && (
            <p className="form-banner form-banner-error form-banner-text" role="alert">
              {error}
            </p>
          )}

          <section className="dashboard-card plan-card" aria-labelledby="plan-week">
            <h2 id="plan-week">This week: {plan.sessionsPerWeek} sessions</h2>
            <p>Roughly one focused session a day, 40-60 minutes each. Tap a skill to start practising it.</p>
            <ul className="plan-focus">
              {plan.focus.map((item) => {
                const meta = SKILL_META[item.module];
                const Icon = meta.icon;
                return (
                  <li key={item.module}>
                    <button
                      type="button"
                      className="plan-focus-row"
                      onClick={() => navigate("/app/practice", { state: { skill: item.module } })}
                    >
                      <Icon size={18} aria-hidden="true" />
                      <span className="plan-focus-text">
                        <strong>
                          {meta.label}: {item.sessionsPerWeek} {item.sessionsPerWeek === 1 ? "session" : "sessions"}
                        </strong>
                        <span className={`plan-status plan-status-${item.status}`}>{STATUS_LABEL[item.status]}</span>
                        <span className="plan-reason">{item.reason}</span>
                      </span>
                      <ArrowRight size={16} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <div className="plan-columns">
            <section className="dashboard-card plan-card" aria-labelledby="plan-mocks">
              <h2 id="plan-mocks">Full mocks</h2>
              <p>{plan.mockAdvice}</p>
              <Link className="button button-secondary button-sm" to="/app/mock-tests">
                Go to mock tests
              </Link>
            </section>

            <section className="dashboard-card plan-card" aria-labelledby="plan-dates">
              <h2 id="plan-dates">Key dates</h2>
              {plan.milestones.length === 0 ? (
                <p>Dates appear here once your exam date is set.</p>
              ) : (
                <ol className="plan-milestones">
                  {plan.milestones.map((m) => (
                    <li key={m.title}>
                      <Flag size={14} aria-hidden="true" />
                      <div>
                        <strong>
                          <time dateTime={m.date}>{formatDay(m.date)}</time>: {m.title}
                        </strong>
                        <p>{m.detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>

          <p className="practice-level">
            Listening and Reading use your latest estimated band, which is an approximation, not an official IELTS score.
            Writing and Speaking aren&rsquo;t scored, so the plan only keeps them in regular practice. Missed questions wait in{" "}
            <Link to="/app/review">Review mistakes</Link>.
          </p>
        </main>
      </div>
    </div>
  );
}
