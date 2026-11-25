import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ComingSoonModal } from "../components/dashboard/ComingSoonModal";
import { DashboardSidebar } from "../components/dashboard/DashboardSidebar";
import { DashboardTopbar } from "../components/dashboard/DashboardTopbar";
import { SKILL_META, SKILL_ORDER, type SkillKey } from "../data/practice";
import { api, describeError } from "../lib/apiClient";
import type { MockOut, MockTrack } from "../lib/attemptTypes";
import { formatDate } from "../lib/fullMock";
import { useDashboardTheme } from "../lib/useDashboardTheme";
import { useProfile } from "../lib/useProfile";
import { useTestCatalog } from "../lib/useTestCatalog";

const STEP_DESCRIPTIONS: Record<SkillKey, string> = {
  listening: "An original recording with exam-style questions.",
  reading: "Timed passages with comprehension questions.",
  writing: "Task 1 and Task 2 with saved drafts and word counts.",
  speaking: "All three speaking parts with recording and self-review.",
};

const MOCK_STATUS_LABEL: Record<MockOut["status"], string> = {
  in_progress: "In progress",
  completed: "Completed",
  abandoned: "Ended early",
};

/**
 * FR-TEST-10: a clear split between the full four-section mock (one
 * guided, linked attempt that ends in consolidated results and a
 * certificate) and single-section mocks (one timed exam-mode section on
 * its own).
 */
export function MockTestsPage() {
  const { theme } = useDashboardTheme();
  const { studyGoal } = useProfile();
  const { tests: catalog } = useTestCatalog();
  const navigate = useNavigate();

  const profileTrack: MockTrack = studyGoal?.ielts_type === "general" ? "general" : "academic";
  const [track, setTrack] = useState<MockTrack | null>(null);
  const activeTrack = track ?? profileTrack;

  const [mocks, setMocks] = useState<MockOut[] | null>(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [modalSkill, setModalSkill] = useState<SkillKey | null>(null);

  useEffect(() => {
    api
      .get<MockOut[]>("/mocks")
      .then(setMocks)
      .catch((err) => setError(describeError(err, "Couldn't load your mock tests.")));
  }, []);

  const openMock = mocks?.find((mock) => mock.status === "in_progress") ?? null;
  const pastMocks = (mocks ?? []).filter((mock) => mock.status !== "in_progress");

  const mockTestBySkill = useMemo(() => {
    const map: Partial<Record<SkillKey, string>> = {};
    for (const test of catalog) {
      if (test.kind !== "mock") continue;
      if (test.track !== activeTrack && test.track !== "both") continue;
      if (!map[test.module as SkillKey]) map[test.module as SkillKey] = test.id;
    }
    return map;
  }, [catalog, activeTrack]);
  const missingForFullMock = SKILL_ORDER.filter((skill) => !mockTestBySkill[skill]);

  const startFullMock = async () => {
    setStarting(true);
    setError("");
    try {
      const mock = await api.post<MockOut>("/mocks", { track: activeTrack });
      navigate(`/app/full-mock/${mock.id}`);
    } catch (err) {
      setError(describeError(err, "Couldn't start the full mock."));
      setStarting(false);
    }
  };

  const startSection = (skill: SkillKey) => {
    const testId = mockTestBySkill[skill];
    if (testId) {
      navigate(`/app/attempt/${testId}`, { state: { mode: "exam", returnTo: "/app/mock-tests", returnLabel: "Back to Mock tests" } });
    } else {
      setModalSkill(skill);
    }
  };

  return (
    <div className="dashboard-shell" data-theme={theme}>
      <DashboardSidebar />
      <div className="dashboard-content">
        <DashboardTopbar label="Mock tests" />

        <main className="dashboard-main dashboard-main-shell">
          <div className="page-heading">
            <h1>Bring your skills together.</h1>
            <p>Take all four sections in one sitting, or rehearse a single section under exam timing.</p>
          </div>

          {error && (
            <p className="form-banner form-banner-error form-banner-text" role="alert">
              {error}
            </p>
          )}

          <section className="dashboard-card full-mock-card" aria-labelledby="full-mock-heading">
            <div className="full-mock-card-head">
              <div>
                <h2 id="full-mock-heading">Full mock test</h2>
                <p>
                  Listening, Reading, Writing and Speaking in order, each timed in exam mode. Finish all four to see your combined
                  results and get an unofficial practice completion certificate.
                </p>
              </div>
            </div>

            {mocks === null && !error && (
              <p className="auth-status-row">
                <Loader2 size={16} className="spin" aria-hidden="true" /> Checking for a mock in progress…
              </p>
            )}

            {openMock && (
              <div className="full-mock-resume">
                <div>
                  <strong>
                    You have a {openMock.track === "academic" ? "Academic" : "General Training"} mock in progress.
                  </strong>
                  <p className="admin-muted">
                    {openMock.completed_modules} of 4 sections done
                    {openMock.next_module ? ` · ${SKILL_META[openMock.next_module].label} is next` : ""}.
                  </p>
                </div>
                <Link className="button button-primary" to={`/app/full-mock/${openMock.id}`}>
                  Continue full mock <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            )}

            {mocks !== null && !openMock && (
              <div className="full-mock-start">
                <label className="full-mock-track">
                  <span>Track</span>
                  <select value={activeTrack} onChange={(event) => setTrack(event.target.value as MockTrack)}>
                    <option value="academic">Academic</option>
                    <option value="general">General Training</option>
                  </select>
                </label>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => void startFullMock()}
                  disabled={starting || missingForFullMock.length > 0}
                >
                  {starting ? "Starting…" : "Start full mock"} <ArrowRight size={16} aria-hidden="true" />
                </button>
                {missingForFullMock.length > 0 && (
                  <p className="admin-muted full-mock-missing">
                    Not available for this track yet: no{" "}
                    {missingForFullMock.map((skill) => SKILL_META[skill].label).join(", ")} mock is published.
                  </p>
                )}
              </div>
            )}

            {pastMocks.length > 0 && (
              <div className="full-mock-history">
                <h3>Your past full mocks</h3>
                <ul>
                  {pastMocks.map((mock) => (
                    <li key={mock.id}>
                      <span>
                        {mock.track === "academic" ? "Academic" : "General Training"} · {formatDate(mock.started_at)} ·{" "}
                        {MOCK_STATUS_LABEL[mock.status]}
                      </span>
                      <Link to={`/app/full-mock/${mock.id}`}>{mock.status === "completed" ? "View results" : "View"}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <div className="page-heading section-subheading">
            <h2>Single-section mocks</h2>
            <p>One timed section in exam mode. These count toward your history and progress, not toward a certificate.</p>
          </div>

          <div className="practice-grid mock-grid">
            {SKILL_ORDER.map((skill) => {
              const meta = SKILL_META[skill];
              const Icon = meta.icon;
              const ready = Boolean(mockTestBySkill[skill]);
              return (
                <div
                  key={skill}
                  className="dashboard-card practice-card mock-skill-card"
                  role="button"
                  tabIndex={0}
                  aria-label={`${meta.label} single-section mock${ready ? "" : " (not published yet)"}`}
                  onClick={() => startSection(skill)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      startSection(skill);
                    }
                  }}
                >
                  <span className={`skill-icon ${meta.tone}`}>
                    <Icon size={20} strokeWidth={1.9} aria-hidden="true" />
                  </span>
                  <h3>{meta.label}</h3>
                  <p>{STEP_DESCRIPTIONS[skill]}</p>
                  <span className={`mock-card-badge ${ready ? "is-current" : "is-upcoming"}`}>{ready ? "Ready" : "Not published yet"}</span>
                </div>
              );
            })}
          </div>
        </main>
      </div>

      <ComingSoonModal
        open={modalSkill !== null}
        title={`${modalSkill ? SKILL_META[modalSkill].label : ""} mock section`}
        description={`No ${modalSkill ? SKILL_META[modalSkill].label : ""} mock test is published for your track yet. Check back soon.`}
        onClose={() => setModalSkill(null)}
      />
    </div>
  );
}
