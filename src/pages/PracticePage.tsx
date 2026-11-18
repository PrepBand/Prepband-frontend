import { useMemo, useState } from "react";
import { ArrowRight, ChevronDown, Clock } from "lucide-react";
import { useLocation } from "react-router-dom";
import { ComingSoonModal } from "../components/dashboard/ComingSoonModal";
import { DashboardSidebar } from "../components/dashboard/DashboardSidebar";
import { DashboardTopbar } from "../components/dashboard/DashboardTopbar";
import { SegmentedTabs } from "../components/dashboard/SegmentedTabs";
import { SKILL_META, SKILL_ORDER, practiceSetsForTrack, type SkillKey, type Track } from "../data/practice";
import { useDashboardTheme } from "../lib/useDashboardTheme";
import { useProfile } from "../lib/useProfile";

type SkillFilter = "all" | SkillKey;

const SKILL_TABS: { value: SkillFilter; label: string }[] = [
  { value: "all", label: "All skills" },
  { value: "listening", label: "Listening" },
  { value: "reading", label: "Reading" },
  { value: "writing", label: "Writing" },
  { value: "speaking", label: "Speaking" },
];

function isSkillKey(value: unknown): value is SkillKey {
  return value === "listening" || value === "reading" || value === "writing" || value === "speaking";
}

export function PracticePage() {
  const { theme } = useDashboardTheme();
  const { studyGoal } = useProfile();
  const location = useLocation();
  const preselectedSkill = (location.state as { skill?: SkillKey } | null)?.skill;
  const [skillFilter, setSkillFilter] = useState<SkillFilter>(() =>
    isSkillKey(preselectedSkill) ? preselectedSkill : "all",
  );
  const [track, setTrack] = useState<Track>(() => (studyGoal?.ielts_type === "general" ? "general" : "academic"));
  const [activeSet, setActiveSet] = useState<{ title: string; skill: SkillKey } | null>(null);

  const sets = useMemo(() => {
    const forTrack = practiceSetsForTrack(track);
    const bySkill = skillFilter === "all" ? forTrack : forTrack.filter((set) => set.skill === skillFilter);
    return [...bySkill].sort((a, b) => SKILL_ORDER.indexOf(a.skill) - SKILL_ORDER.indexOf(b.skill));
  }, [skillFilter, track]);

  return (
    <div className="dashboard-shell" data-theme={theme}>
      <DashboardSidebar />
      <div className="dashboard-content">
        <DashboardTopbar label="Practice" />

        <main className="dashboard-main dashboard-main-shell">
          <div className="page-heading">
            <h1>A little practice goes a long way.</h1>
            <p>Choose a skill, find your focus, and take the next step.</p>
          </div>

          <div className="page-tabs-row">
            <SegmentedTabs
              options={SKILL_TABS}
              value={skillFilter}
              onChange={setSkillFilter}
              aria-label="Filter practice by skill"
            />
          </div>

          <div className="practice-meta-row">
            <span className="practice-meta-text">
              {sets.length} focused practice {sets.length === 1 ? "set" : "sets"} · Original Prepband content
            </span>
            <div className="select-field">
              <select value={track} onChange={(event) => setTrack(event.target.value as Track)} aria-label="Study track">
                <option value="academic">Academic</option>
                <option value="general">General</option>
              </select>
              <ChevronDown size={15} aria-hidden="true" />
            </div>
          </div>

          <div className="practice-grid">
            {sets.map((set) => {
              const meta = SKILL_META[set.skill];
              const Icon = meta.icon;
              return (
                <div className="dashboard-card practice-card" key={set.slug}>
                  <div className="practice-card-head">
                    <span className={`practice-tag ${meta.tone}`}>
                      <Icon size={14} aria-hidden="true" /> {meta.label}
                    </span>
                    <span className="practice-level">{set.level}</span>
                  </div>

                  <h3>{set.title}</h3>
                  <p>{set.description}</p>

                  <div className="practice-meta">
                    <span>
                      <Clock size={13} aria-hidden="true" /> {set.durationMinutes} min
                    </span>
                    <span>{track === "general" ? "General" : "Academic"}</span>
                  </div>

                  <button
                    type="button"
                    className="button button-secondary practice-cta"
                    onClick={() => setActiveSet({ title: set.title, skill: set.skill })}
                  >
                    Start practice <ArrowRight size={15} aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>

          <p className="info-banner">
            Focused practice sets are shorter than a full IELTS examination. Listening and Reading receive objective
            scores; Writing and Speaking receive diagnostics and self-review.
          </p>
        </main>
      </div>

      <ComingSoonModal
        open={activeSet != null}
        title={activeSet ? activeSet.title : ""}
        description="We're finishing the full Listening, Reading, Writing and Speaking engine described in the project scope. This practice session will be ready soon."
        onClose={() => setActiveSet(null)}
      />
    </div>
  );
}
