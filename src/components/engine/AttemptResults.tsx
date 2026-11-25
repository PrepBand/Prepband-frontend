import { useState } from "react";
import { CheckCircle2, Info, Loader2 } from "lucide-react";
import { api, describeError } from "../../lib/apiClient";
import { getLocalSession } from "../../lib/live/sessionStore";
import { LiveResults } from "../live/LiveResults";
import type { ResultsOut, SelfReview, WritingResult } from "../../lib/attemptTypes";
import {
  NOT_ASSESSED_EXPLANATION,
  SPEAKING_CHECKLIST,
  SPEAKING_RUBRIC,
  WRITING_CHECKLIST,
  WRITING_RUBRIC,
  type ChecklistItem,
  type RubricCriterion,
} from "../../data/rubrics";

function formatAnswer(value: unknown): string {
  if (value == null || value === "") return "(no answer)";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).join(", ");
  return String(value);
}

function clock(seconds: number | null) {
  if (seconds == null) return "-";
  const safe = Math.round(seconds);
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

/** Results for any module. Reading/Listening show objective marks and an
 * estimated band; Writing/Speaking are explicitly not_assessed and show
 * diagnostics, the rubric and a self-review instead (FR-RESULT-04). */
export function AttemptResults({ results, onReviewSaved }: { results: ResultsOut; onReviewSaved?: (review: SelfReview) => void }) {
  if (results.assessment_status === "not_assessed") {
    return <NotAssessedResults results={results} onReviewSaved={onReviewSaved} />;
  }
  return <ObjectiveResults results={results} />;
}

function ObjectiveResults({ results }: { results: ResultsOut }) {
  return (
    <>
      <div className="page-heading">
        <h1>Results.</h1>
        <p>
          Score: {results.raw_score} / {results.max_score}
          {results.estimated_band != null && <> · Estimated band {results.estimated_band.toFixed(1)}</>} · Status: {results.status}
        </p>
        <p className="practice-level">Estimated band is an approximation, not an official IELTS score.</p>
      </div>

      {results.questions.map((question) => (
        <div className={`dashboard-card engine-result-card ${question.is_correct ? "is-correct" : "is-incorrect"}`} key={question.question_id}>
          <p className="engine-question-prompt">{question.prompt}</p>
          <p>Your answer: {formatAnswer(question.your_answer)}</p>
          <p>Correct answer: {formatAnswer(question.correct_answers)}</p>
          <p>
            {question.is_correct ? "Correct" : question.marks_awarded > 0 ? "Partly correct" : "Incorrect"} -{" "}
            {question.marks_awarded}/{question.marks_available}
          </p>
          {question.rationale && <p>{question.rationale}</p>}
        </div>
      ))}

      {results.media_transcripts.some((media) => media.transcript) && (
        <div className="dashboard-card engine-result-card">
          <h2>Transcript</h2>
          {results.media_transcripts
            .filter((media) => media.transcript)
            .map((media) => (
              <div key={media.media_asset_id} className="engine-transcript">
                {(media.transcript ?? "").split(/\n\s*\n/).map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            ))}
        </div>
      )}
    </>
  );
}

function NotAssessedResults({ results, onReviewSaved }: { results: ResultsOut; onReviewSaved?: (review: SelfReview) => void }) {
  const isWriting = results.module === "writing";
  const rubric = isWriting ? WRITING_RUBRIC : SPEAKING_RUBRIC;
  const checklist = isWriting ? WRITING_CHECKLIST : SPEAKING_CHECKLIST;
  const answered = results.speaking.filter((item) => item.completed).length;
  const spoken = results.speaking.reduce((sum, item) => sum + (item.duration_seconds ?? 0), 0);
  // Phase 5: answered with the live AI examiner (or still in its local session).
  const isLive = results.speaking.some((item) => item.response_mode === "live") || Boolean(getLocalSession(results.id));

  return (
    <>
      <div className="page-heading">
        <h1>{isWriting ? "Your writing, submitted." : "Speaking session complete."}</h1>
        <p>
          Status: {results.status} ·{" "}
          {isWriting
            ? `${results.writing.reduce((sum, item) => sum + item.word_count, 0)} words across ${results.writing.length} task${results.writing.length === 1 ? "" : "s"}`
            : `${answered} of ${results.speaking.length} prompts answered · ${clock(spoken)} spoken`}
        </p>
      </div>

      <p className="info-banner not-assessed-banner" role="note">
        <Info size={16} aria-hidden="true" /> {NOT_ASSESSED_EXPLANATION}
      </p>

      {isWriting && results.writing.map((task) => <WritingFeedback key={task.writing_prompt_id} task={task} />)}

      {!isWriting && isLive && <LiveResults attemptId={results.id} speaking={results.speaking} />}

      {!isWriting && !isLive && (
        <div className="dashboard-card engine-result-card">
          <h2>Your answers</h2>
          <ol className="speaking-result-list">
            {results.speaking.map((item) => (
              <li key={item.speaking_prompt_id}>
                <p className="engine-question-prompt">
                  Part {item.part}: {item.prompt}
                </p>
                {!item.completed ? (
                  <p className="admin-warning-text">Not answered.</p>
                ) : item.response_mode === "text" ? (
                  <p className="speaking-text-result">Typed answer (text mode): {item.text_response}</p>
                ) : (
                  <p className="admin-muted">Recorded answer, {clock(item.duration_seconds)}. The recording stayed on your device.</p>
                )}
                {item.part === 2 && item.completed && item.response_mode === "audio" && (item.duration_seconds ?? 0) < 60 && (
                  <p className="admin-muted">
                    Your long turn was under a minute. In the real test you can speak for up to two minutes, and using that time helps
                    you develop your answer.
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      <RubricCard rubric={rubric} title={isWriting ? "How Writing is judged" : "How Speaking is judged"} />
      <SelfReviewForm
        attemptId={results.id}
        rubric={rubric}
        checklist={checklist}
        initial={results.self_review}
        onSaved={onReviewSaved}
      />
    </>
  );
}

function WritingFeedback({ task }: { task: WritingResult }) {
  const d = task.diagnostics;
  return (
    <div className="dashboard-card engine-result-card writing-feedback">
      <h2>Task {task.task_number}</h2>
      <p className="admin-muted writing-feedback-prompt">{task.prompt.split("\n")[0]}</p>

      <div className="writing-essay">
        {task.body.trim() ? (
          task.body.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)
        ) : (
          <p className="admin-warning-text">No text was submitted for this task.</p>
        )}
      </div>

      {d && (
        <>
          <h3>Diagnostics</h3>
          <dl className="writing-stats">
            <div className={d.meets_minimum ? "is-met" : "is-under"}>
              <dt>Words</dt>
              <dd>
                {d.word_count} / {d.min_words} minimum
              </dd>
            </div>
            <div>
              <dt>Paragraphs</dt>
              <dd>{d.paragraph_count}</dd>
            </div>
            <div>
              <dt>Sentences</dt>
              <dd>{d.sentence_count}</dd>
            </div>
            <div>
              <dt>Average sentence</dt>
              <dd>{d.average_sentence_length} words</dd>
            </div>
            <div>
              <dt>Vocabulary variety</dt>
              <dd>{Math.round(d.unique_word_ratio * 100)}% different words</dd>
            </div>
            <div>
              <dt>Linking words</dt>
              <dd>{d.linking_words_used.length ? d.linking_words_used.join(", ") : "none found"}</dd>
            </div>
            {d.letter && (
              <div>
                <dt>Letter format</dt>
                <dd>
                  {d.letter.has_greeting ? "greeting ✓" : "no greeting"} · {d.letter.has_sign_off ? "sign-off ✓" : "no sign-off"}
                </dd>
              </div>
            )}
          </dl>
          {d.observations.length > 0 && (
            <ul className="writing-observations">
              {d.observations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
          <p className="admin-muted">{d.limitations}</p>
        </>
      )}

      {task.examiner_notes && (
        <>
          <h3>What a strong answer covers</h3>
          <p>{task.examiner_notes}</p>
        </>
      )}
    </div>
  );
}

function RubricCard({ rubric, title }: { rubric: RubricCriterion[]; title: string }) {
  return (
    <div className="dashboard-card engine-result-card">
      <h2>{title}</h2>
      <div className="rubric-grid">
        {rubric.map((criterion) => (
          <div key={criterion.key} className="rubric-item">
            <h3>{criterion.title}</h3>
            <p>{criterion.summary}</p>
            <ul>
              {criterion.ask.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function SelfReviewForm({
  attemptId,
  rubric,
  checklist,
  initial,
  onSaved,
}: {
  attemptId: string;
  rubric: RubricCriterion[];
  checklist: ChecklistItem[];
  initial: SelfReview | null;
  onSaved?: (review: SelfReview) => void;
}) {
  const [ratings, setRatings] = useState<Record<string, number>>(initial?.ratings ?? {});
  const [ticked, setTicked] = useState<string[]>(initial?.checklist ?? []);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const saved = await api.put<SelfReview>(`/attempts/${attemptId}/self-review`, {
        ratings,
        checklist: ticked,
        notes: notes.trim() || null,
      });
      setMessage({ kind: "success", text: "Self-review saved." });
      onSaved?.(saved);
    } catch (err) {
      setMessage({ kind: "error", text: describeError(err, "Couldn't save your self-review.") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-card engine-result-card self-review">
      <h2>Your self-review</h2>
      <p className="admin-muted">
        Rate yourself against each criterion (1 = needs a lot of work, 9 = very strong). This is your own reflection, not a band score,
        and it's saved to your history so you can compare next time.
      </p>
      <div className="self-review-ratings">
        {rubric.map((criterion) => (
          <label key={criterion.key} className="self-review-row">
            <span>{criterion.title}</span>
            <select
              className="form-input"
              value={ratings[criterion.key] ?? ""}
              onChange={(event) => {
                const value = event.target.value;
                setRatings((current) => {
                  const next = { ...current };
                  if (value) next[criterion.key] = Number(value);
                  else delete next[criterion.key];
                  return next;
                });
              }}
            >
              <option value="">Not rated</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <fieldset className="self-review-checklist">
        <legend>Checklist</legend>
        {checklist.map((item) => (
          <label key={item.key} className="engine-option">
            <input
              type="checkbox"
              checked={ticked.includes(item.key)}
              onChange={(event) => setTicked(event.target.checked ? [...ticked, item.key] : ticked.filter((key) => key !== item.key))}
            />
            {item.label}
          </label>
        ))}
      </fieldset>
      <label className="admin-field">
        <span>Notes for next time</span>
        <textarea className="form-input" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </label>
      {message && (
        <p className={`form-banner form-banner-${message.kind}`} role={message.kind === "error" ? "alert" : "status"}>
          {message.kind === "success" && <CheckCircle2 size={16} aria-hidden="true" />} {message.text}
        </p>
      )}
      <button type="button" className="button button-primary self-review-save" onClick={save} disabled={saving}>
        {saving && <Loader2 size={16} className="spin" aria-hidden="true" />} Save self-review
      </button>
    </div>
  );
}
