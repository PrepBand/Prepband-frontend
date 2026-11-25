import { useMemo, useState } from "react";
import { ArrowRight, ChevronDown, Clock } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { DashboardSidebar } from "../components/dashboard/DashboardSidebar";
import { DashboardTopbar } from "../components/dashboard/DashboardTopbar";
import { SegmentedTabs } from "../components/dashboard/SegmentedTabs";
import { SKILL_META, SKILL_ORDER, type SkillKey, type Track } from "../data/practice";
import { useDashboardTheme } from "../lib/useDashboardTheme";
import { useProfile } from "../lib/useProfile";
import { useTestCatalog } from "../lib/useTestCatalog";

type SkillFilter = "all" | SkillKey;

type DisplaySet = {
  testId: string;
  skill: SkillKey;
  title: string;
  description: string;
  durationMinutes: number | null;
  level: string;
};

const MODULE_DESCRIPTION: Record<SkillKey, string> = {
  listening: "Audio with questions, marked automatically",
  reading: "Passage with questions, marked automatically",
  writing: "Timed task with word count and diagnostics",
  speaking: "Scripted prompts with recording and self-review",
};

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

/**
 * Every card comes from the published practice catalog (GET /tests,
 * kind = practice) and opens the real attempt engine in practice mode,
 * for all four modules.
 */
export function PracticePage() {
  const { theme } = useDashboardTheme();
  const { studyGoal } = useProfile();
  const { tests: realTests, loading: catalogLoading } = useTestCatalog();
  const location = useLocation();
  const navigate = useNavigate();
  const preselectedSkill = (location.state as { skill?: SkillKey } | null)?.skill;
  const [skillFilter, setSkillFilter] = useState<SkillFilter>(() =>
    isSkillKey(preselectedSkill) ? preselectedSkill : "all",
  );
  const [track, setTrack] = useState<Track>(() => (studyGoal?.ielts_type === "general" ? "general" : "academic"));

  const sets = useMemo<DisplaySet[]>(() => {
    const real: DisplaySet[] = realTests
      .filter((test) => test.kind === "practice" && isSkillKey(test.module) && (test.track === track || test.track === "both"))
      .map((test) => ({
        testId: test.id,
        skill: test.module as SkillKey,
        title: test.title,
        description: MODULE_DESCRIPTION[test.module as SkillKey],
        durationMinutes: test.duration_minutes,
        level: test.difficulty ?? "Published",
      }));

    const filtered = skillFilter === "all" ? real : real.filter((set) => set.skill === skillFilter);
    return filtered.sort((a, b) => SKILL_ORDER.indexOf(a.skill) - SKILL_ORDER.indexOf(b.skill));
  }, [realTests, skillFilter, track]);

  const handleStart = (set: DisplaySet) => {
    navigate(`/app/attempt/${set.testId}`, { state: { mode: "practice", returnTo: "/app/practice", returnLabel: "Back to Practice" } });
  };

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
              {catalogLoading ? "Loading…" : `${sets.length} focused practice ${sets.length === 1 ? "set" : "sets"} · Original Prepband content`}
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
                <div className="dashboard-card practice-card" key={set.testId}>
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
                      <Clock size={13} aria-hidden="true" /> {set.durationMinutes ?? "—"} min
                    </span>
                    <span>{track === "general" ? "General" : "Academic"}</span>
                  </div>

                  <button type="button" className="button button-secondary practice-cta" onClick={() => handleStart(set)}>
                    Start practice <ArrowRight size={15} aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>

          {!catalogLoading && sets.length === 0 && (
            <p className="info-banner">No practice sets match this filter yet.</p>
          )}
        </main>
      </div>

    </div>
  );
}
