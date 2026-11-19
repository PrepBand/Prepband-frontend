import { useState } from "react";
import { ComingSoonModal } from "../components/dashboard/ComingSoonModal";
import { DashboardSidebar } from "../components/dashboard/DashboardSidebar";
import { DashboardTopbar } from "../components/dashboard/DashboardTopbar";
import { SKILL_META, SKILL_ORDER, type SkillKey } from "../data/practice";
import { useDashboardTheme } from "../lib/useDashboardTheme";

const STEP_DESCRIPTIONS: Record<SkillKey, string> = {
  listening: "An original audio announcement and five questions.",
  reading: "A reading passage with five comprehension questions.",
  writing: "Two prompts with saved drafts and word counts.",
  speaking: "Three speaking parts with recording and self-review.",
};

export function MockTestsPage() {
  const { theme } = useDashboardTheme();
  const [activeStep, setActiveStep] = useState<SkillKey>("listening");
  const [modalOpen, setModalOpen] = useState(false);

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
                  onClick={() => {
                    setActiveStep(skill);
                    setModalOpen(true);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setActiveStep(skill);
                      setModalOpen(true);
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
