import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  BookOpenText,
  Headphones,
  Mic2,
  PenLine,
} from "lucide-react";
import { ComingSoonModal } from "../components/dashboard/ComingSoonModal";
import { DashboardSidebar } from "../components/dashboard/DashboardSidebar";
import { DashboardTopbar } from "../components/dashboard/DashboardTopbar";
import { SKILL_META, SKILL_ORDER, type SkillKey } from "../data/practice";
import { useDashboardTheme } from "../lib/useDashboardTheme";
import { useProfile } from "../lib/useProfile";

const STEP_DESCRIPTIONS: Record<SkillKey, string> = {
  listening: "An original audio announcement and five questions.",
  reading: "A reading passage with five comprehension questions.",
  writing: "Two prompts with saved drafts and word counts.",
  speaking: "Three speaking parts with recording and self-review.",
};

export function MockTestsPage() {
  const { theme } = useDashboardTheme();
  const { studyGoal } = useProfile();
  const [activeStep, setActiveStep] = useState<SkillKey>("listening");
  const [modalOpen, setModalOpen] = useState(false);

  const trackLabel = studyGoal?.ielts_type === "general" ? "General" : "Academic";
  const activeMeta = SKILL_META[activeStep];

  return (
    <div className="dashboard-shell" data-theme={theme}>
      <DashboardSidebar />
      <div className="dashboard-content">
        <DashboardTopbar label="Mock tests" />

        <main className="dashboard-main dashboard-main-shell">
          <div className="page-heading">
            <h1>Bring your skills together.</h1>
            <p>A guided space to practice the rhythm of a four-skill exam.</p>
          </div>

          <div className="mock-steps" role="tablist" aria-label="Mock test sections">
            {SKILL_ORDER.map((skill, index) => (
              <button
                key={skill}
                type="button"
                role="tab"
                aria-selected={skill === activeStep}
                className={`mock-step${skill === activeStep ? " mock-step-active" : ""}`}
                onClick={() => setActiveStep(skill)}
              >
                {index + 1}. {SKILL_META[skill].label}
              </button>
            ))}
          </div>

          <div className="dashboard-next-step">
            <div className="dashboard-next-step-copy">
              <h2>Your next chapter deserves a rehearsal.</h2>
              <p>
                {trackLabel} track · guided mock preview. Move through Listening, Reading, Writing and Speaking. Your
                place is saved between sections.
              </p>
              <button type="button" className="button button-primary dashboard-hero-cta" onClick={() => setModalOpen(true)}>
                Continue with {activeMeta.label} <ArrowRight size={16} aria-hidden="true" />
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

          <p className="info-banner">
            This design preview uses short original practice sets rather than a complete timed IELTS exam. No overall
            IELTS band is calculated. A full-length exam requires the production question bank described in your scope.
          </p>

          <div className="practice-grid mock-grid">
            {SKILL_ORDER.map((skill, index) => {
              const meta = SKILL_META[skill];
              const Icon = meta.icon;
              const isCurrent = skill === activeStep;
              return (
                <div
                  key={skill}
                  className="dashboard-card practice-card mock-skill-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveStep(skill)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setActiveStep(skill);
                    }
                  }}
                >
                  <span className={`skill-icon ${meta.tone}`}>
                    <Icon size={20} strokeWidth={1.9} aria-hidden="true" />
                  </span>
                  <h3>{meta.label}</h3>
                  <p>{STEP_DESCRIPTIONS[skill]}</p>
                  <span className={`mock-card-badge ${isCurrent ? "is-current" : "is-upcoming"}`}>
                    {isCurrent ? "Up next" : `Step ${index + 1}`}
                  </span>
                </div>
              );
            })}
          </div>
        </main>
      </div>

      <ComingSoonModal
        open={modalOpen}
        title={`${activeMeta.label} mock section`}
        description={`We're finishing the full ${activeMeta.label} mock experience described in the project scope. Check back soon to continue your rehearsal.`}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
