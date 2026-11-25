import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { DashboardSidebar } from "../components/dashboard/DashboardSidebar";
import { DashboardTopbar } from "../components/dashboard/DashboardTopbar";
import { AttemptResults } from "../components/engine/AttemptResults";
import { AudioPlayer } from "../components/engine/AudioPlayer";
import { QuestionRenderer } from "../components/engine/QuestionRenderer";
import { ReadingPassagePane } from "../components/engine/ReadingPassagePane";
import { SpeakingSession } from "../components/engine/SpeakingSession";
import { WritingTask } from "../components/engine/WritingTask";
import type { AttemptMode, SectionPublic } from "../lib/attemptTypes";
import { SKILL_ORDER, type SkillKey } from "../data/practice";
import { useAttemptSession, type AttemptSource } from "../lib/useAttemptSession";
import { useDashboardTheme } from "../lib/useDashboardTheme";
import { countWords } from "../lib/writingStats";

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

const SAVE_STATUS_LABEL: Record<string, string> = {
  idle: "",
  saving: "Saving…",
  saved: "Saved",
  error: "Couldn't reach the server - your answers are kept on this device and will be sent again",
};

const SKILL_LABEL: Record<SkillKey, string> = { listening: "Listening", reading: "Reading", writing: "Writing", speaking: "Speaking" };

type AttemptNavState ={ mode?: AttemptMode; returnTo?: string; returnLabel?: string };

/**
 * The attempt-taking experience for every module, reached from Practice
 * (practice mode) or Mock tests (exam mode). One engine
 * (useAttemptSession) with a per-module body: objective questions for
 * Reading/Listening, essay tasks for Writing, the scripted recorder for
 * Speaking. Results for all of them come from AttemptResults.
 */
export function AttemptPage() {
  const { theme } = useDashboardTheme();
  const { testId, mockId, module: mockModule } = useParams<{ testId?: string; mockId?: string; module?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const navState = (location.state as AttemptNavState | null) ?? {};
  const inFullMock = Boolean(mockId && mockModule);
  // Full-mock modules are always exam mode (FR-MOCK-03).
  const mode: AttemptMode = inFullMock || navState.mode === "exam" ? "exam" : "practice";
  const returnTo = inFullMock ? `/app/full-mock/${mockId}` : navState.returnTo ?? "/app/practice";
  const returnLabel = inFullMock ? "Back to your full mock" : navState.returnLabel ?? "Back to Practice";

  const source: AttemptSource =
    inFullMock && SKILL_ORDER.includes(mockModule as SkillKey)
      ? { kind: "mock", mockId: mockId!, module: mockModule as SkillKey }
      : { kind: "test", testId: testId ?? "", mode };
  const session = useAttemptSession(source);
  const { test, attempt, saveStatus, results, setResults, loading, error, submit, secondsRemaining, restoredCount } = session;

  // In a full mock, a finished module (submitted, or expired by the
  // server) goes back to the mock's progress page - consolidated results
  // come at the end, as in a real exam.
  const finishedInMock = inFullMock && attempt != null && attempt.status !== "in_progress";
  useEffect(() => {
    if (finishedInMock) navigate(`/app/full-mock/${mockId}`, { replace: true, state: { finished: mockModule } });
  }, [finishedInMock, mockId, mockModule, navigate]);

  const module = test?.module;
  const inProgress = !loading && test && attempt && attempt.status === "in_progress";

  const confirmAndSubmit = () => {
    // FR-TEST-07: confirm before an early submission.
    const message =
      module === "writing"
        ? "Submit your writing? You won't be able to edit it afterwards."
        : "Submit your answers? You won't be able to change them afterwards.";
    if (window.confirm(message)) void submit();
  };

  return (
    <div className="dashboard-shell" data-theme={theme}>
      <DashboardSidebar />
      <div className="dashboard-content">
        <DashboardTopbar label={test?.title ?? "Taking a test"} />

        <main className="dashboard-main dashboard-main-shell">
          <Link to={returnTo} className="dashboard-section-link dashboard-section-link-button">
            ← {returnLabel}
          </Link>

          {loading && <p>Loading…</p>}
          {error && <p className="form-banner form-banner-error form-banner-text">{error}</p>}

          {inProgress && (
            <>
              <div className="page-heading-row">
                <div className="page-heading">
                  <h1>{test.title}</h1>
                  <p>
                    {inFullMock ? `Full mock · ${mockModule ? SKILL_LABEL[mockModule as SkillKey] : ""}` : mode === "exam" ? "Exam mode" : "Practice mode"}
                    {SAVE_STATUS_LABEL[saveStatus] && ` · ${SAVE_STATUS_LABEL[saveStatus]}`}
                  </p>
                </div>
                {secondsRemaining != null && <span className="track-pill">{formatSeconds(secondsRemaining)} remaining</span>}
              </div>

              {restoredCount > 0 && (
                <p className="form-banner form-banner-success form-banner-text" role="status">
                  We put back {restoredCount === 1 ? "1 answer" : `${restoredCount} answers`} from this device that hadn't
                  reached the server yet. {restoredCount === 1 ? "It's" : "They're"} being saved now.
                </p>
              )}

              {module === "writing" ? (
                <WritingBody sections={test.sections} essays={session.essays} onChange={session.setEssay} />
              ) : module === "speaking" ? (
                <SpeakingSession
                  sections={test.sections}
                  attemptId={attempt.id}
                  mode={mode}
                  answers={session.speaking}
                  onAnswer={session.setSpeakingAnswer}
                  onFinish={() => void submit()}
                />
              ) : (
                <ObjectiveBody sections={test.sections} mode={mode} answers={session.answers} onChange={session.setAnswer} />
              )}

              {module !== "speaking" && (
                <button type="button" className="button button-primary engine-submit-button" onClick={confirmAndSubmit}>
                  Submit
                </button>
              )}
            </>
          )}

          {!loading && results && !inFullMock && (
            <>
              <AttemptResults results={results} onReviewSaved={(review) => setResults({ ...results, self_review: review })} />
              <Link to={returnTo} className="button button-secondary engine-submit-button">
                {returnLabel}
              </Link>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function ObjectiveBody({
  sections,
  mode,
  answers,
  onChange,
}: {
  sections: SectionPublic[];
  mode: AttemptMode;
  answers: Record<string, unknown>;
  onChange: (questionId: string, value: unknown) => void;
}) {
  return (
    <>
      {sections.map((section) => {
        const isReading = section.module === "reading" && section.passages.length > 0;
        return (
          <div className="dashboard-card engine-section" key={section.id}>
            {section.instructions && <p>{section.instructions}</p>}
            {section.media_assets.map(
              (media) => media.type === "audio" && media.public_url && <AudioPlayer key={media.id} src={media.public_url} mode={mode} />,
            )}
            {isReading ? (
              <ReadingPassagePane passages={section.passages} questions={section.questions} answers={answers} onAnswerChange={onChange} />
            ) : (
              section.questions.map((question) => (
                <QuestionRenderer key={question.id} question={question} value={answers[question.id]} onChange={(value) => onChange(question.id, value)} />
              ))
            )}
          </div>
        );
      })}
    </>
  );
}

/** Writing: one tab per task when there are two (FR-WRITE-01/02). */
function WritingBody({
  sections,
  essays,
  onChange,
}: {
  sections: SectionPublic[];
  essays: Record<string, string>;
  onChange: (promptId: string, body: string) => void;
}) {
  const tasks = sections.flatMap((section) =>
    section.writing_prompts.map((prompt) => ({ prompt, section })),
  );
  const [active, setActive] = useState(0);
  const current = tasks[active];

  if (!current) return <p className="info-banner">This writing test has no tasks yet.</p>;

  return (
    <div className="dashboard-card engine-section">
      {current.section.instructions && <p>{current.section.instructions}</p>}
      {tasks.length > 1 && (
        <div className="mock-steps writing-tabs" role="tablist" aria-label="Writing tasks">
          {tasks.map(({ prompt }, index) => (
            <button
              key={prompt.id}
              type="button"
              role="tab"
              aria-selected={index === active}
              className={`mock-step${index === active ? " mock-step-active" : ""}`}
              onClick={() => setActive(index)}
            >
              Task {prompt.task_number} · {countWords(essays[prompt.id] ?? "")} words
            </button>
          ))}
        </div>
      )}
      <WritingTask
        key={current.prompt.id}
        prompt={current.prompt}
        value={essays[current.prompt.id] ?? ""}
        onChange={(value) => onChange(current.prompt.id, value)}
        images={current.section.media_assets}
      />
    </div>
  );
}
