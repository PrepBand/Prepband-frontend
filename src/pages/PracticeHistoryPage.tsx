import { useState } from "react";
import { ArrowRight, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DashboardSidebar } from "../components/dashboard/DashboardSidebar";
import { DashboardTopbar } from "../components/dashboard/DashboardTopbar";
import { SegmentedTabs } from "../components/dashboard/SegmentedTabs";
import type { SkillKey } from "../data/practice";
import { useDashboardTheme } from "../lib/useDashboardTheme";

type SkillFilter = "all" | SkillKey;

const SKILL_TABS: { value: SkillFilter; label: string }[] = [
  { value: "all", label: "All skills" },
  { value: "listening", label: "Listening" },
  { value: "reading", label: "Reading" },
  { value: "writing", label: "Writing" },
  { value: "speaking", label: "Speaking" },
];

export function PracticeHistoryPage() {
  const { theme } = useDashboardTheme();
  const navigate = useNavigate();
  const [skillFilter, setSkillFilter] = useState<SkillFilter>("all");

  return (
    <div className="dashboard-shell" data-theme={theme}>
      <DashboardSidebar />
      <div className="dashboard-content">
        <DashboardTopbar label="Practice history" />

        <main className="dashboard-main dashboard-main-shell">
          <div className="page-heading">
            <h1>Every practice tells a story.</h1>
            <p>Revisit your responses, reflect on feedback, and see how far you&rsquo;ve come.</p>
          </div>

          <div className="page-tabs-row">
            <SegmentedTabs
              options={SKILL_TABS}
              value={skillFilter}
              onChange={setSkillFilter}
              aria-label="Filter history by skill"
            />
          </div>

          <div className="dashboard-card stage-card">
            <span className="stage-icon" aria-hidden="true">
              <Clock size={26} />
            </span>
            <h2>A fresh page, ready for you.</h2>
            <p>Your completed practices will appear here.</p>
            <button
              type="button"
              className="button button-primary stage-cta"
              onClick={() =>
                navigate("/app/practice", skillFilter === "all" ? undefined : { state: { skill: skillFilter } })
              }
            >
              Start a practice <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
