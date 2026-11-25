import { useMemo } from "react";
import { Activity, Info } from "lucide-react";
import type { SpeakingResult } from "../../lib/attemptTypes";
import { tierById, type TierId } from "../../lib/live/catalog";
import { speakingFeedback, type FeedbackTurn } from "../../lib/live/feedback";
import { getLocalSession } from "../../lib/live/sessionStore";

function seconds(value: number | null) {
  return value == null ? "-" : `${Math.round(value)} s`;
}

function modelName(id: string | null | undefined) {
  try {
    return id ? tierById(id as TierId).name : null;
  } catch {
    return id ?? null;
  }
}

/**
 * Results for a live-examiner session (FR-LIVE-10/11): rule-based practice
 * feedback (never a band) and the conversation. Right after the test the
 * full local session is available (transcript and replayable recordings,
 * even without consent to save); later, only what was saved.
 */
export function LiveResults({ attemptId, speaking }: { attemptId: string; speaking: SpeakingResult[] }) {
  const local = getLocalSession(attemptId);
  const partByPrompt = useMemo(() => new Map(speaking.map((s) => [s.speaking_prompt_id, s.part])), [speaking]);

  const turns: (FeedbackTurn & { question: string; audioUrl: string | null; promptId: string | null; sttModel: string | null })[] = useMemo(() => {
    if (local) return local.turns.filter((t) => t.part !== 0);
    return speaking.flatMap((item) =>
      (item.turns ?? []).map((t) => ({
        part: item.part as 1 | 2 | 3,
        kind: t.kind,
        durationSeconds: t.duration_seconds,
        longPauses: t.long_pauses,
        endedBy: t.ended_by,
        transcript: t.transcript,
        question: t.text,
        audioUrl: null,
        promptId: item.speaking_prompt_id,
        sttModel: t.stt_model,
      })),
    );
  }, [local, speaking]);

  const feedback = useMemo(() => speakingFeedback(turns), [turns]);
  const hasTranscripts = turns.some((t) => t.transcript);
  const savedTranscripts = speaking.some((s) => s.transcript);
  const models = local?.models;

  return (
    <>
      <section className="dashboard-card engine-result-card live-feedback" aria-labelledby="live-feedback-heading">
        <h2 id="live-feedback-heading">
          <Activity size={18} aria-hidden="true" /> Practice feedback
        </h2>
        <p className="info-banner" role="note">
          <Info size={15} aria-hidden="true" /> {feedback.limitations}
        </p>
        <dl className="writing-stats live-stats">
          <div>
            <dt>Answers</dt>
            <dd>{feedback.answers}</dd>
          </div>
          <div>
            <dt>Time speaking</dt>
            <dd>{seconds(feedback.speakingSeconds)}</dd>
          </div>
          <div>
            <dt>Part 1 average</dt>
            <dd>{seconds(feedback.part1AverageSeconds)}</dd>
          </div>
          <div>
            <dt>Part 2 talk</dt>
            <dd>{seconds(feedback.part2LongTurnSeconds)}</dd>
          </div>
          <div>
            <dt>Part 3 average</dt>
            <dd>{seconds(feedback.part3AverageSeconds)}</dd>
          </div>
          <div>
            <dt>Long pauses / min</dt>
            <dd>{feedback.longPausesPerMinute ?? "-"}</dd>
          </div>
          {feedback.wordsPerMinute != null && (
            <div>
              <dt>Words / min</dt>
              <dd>{feedback.wordsPerMinute}</dd>
            </div>
          )}
          {feedback.fillersPer100Words != null && (
            <div>
              <dt>Fillers / 100 words</dt>
              <dd>{feedback.fillersPer100Words}</dd>
            </div>
          )}
          {feedback.uniqueWordRatio != null && (
            <div>
              <dt>Different words</dt>
              <dd>{Math.round(feedback.uniqueWordRatio * 100)}%</dd>
            </div>
          )}
        </dl>
        <ul className="writing-observations">
          {feedback.observations.map((observation) => (
            <li key={observation}>{observation}</li>
          ))}
        </ul>
        {!hasTranscripts && (
          <p className="admin-muted">
            No transcript is available, so this feedback uses timing only.
            {local ? "" : " Transcripts are kept only if you chose to save them."}
          </p>
        )}
        {models && (
          <p className="admin-muted">
            Models used: hearing {modelName(models.stt) ?? "none (timing only)"}, voice {modelName(models.voice)}, turn-taking{" "}
            {modelName(models.turns)}, follow-ups {modelName(models.followups)}.
          </p>
        )}
      </section>

      <section className="dashboard-card engine-result-card" aria-labelledby="live-conversation-heading">
        <h2 id="live-conversation-heading">Your conversation</h2>
        {local && !savedTranscripts && hasTranscripts && (
          <p className="admin-muted">This transcript and the recordings are only on this device and disappear when you leave the page.</p>
        )}
        <ol className="live-transcript">
          {turns.map((turn, index) => (
            <li key={`${turn.promptId}-${index}`}>
              <p className="engine-question-prompt">
                {turn.promptId && partByPrompt.get(turn.promptId) ? `Part ${partByPrompt.get(turn.promptId)}: ` : ""}
                {turn.question}
              </p>
              {turn.endedBy === "no_speech" ? (
                <p className="admin-warning-text">No answer.</p>
              ) : (
                <>
                  <p>{turn.transcript ?? <span className="admin-muted">Answer recorded ({Math.round(turn.durationSeconds)} s), no transcript.</span>}</p>
                  <p className="admin-muted">
                    {Math.round(turn.durationSeconds)} s
                    {turn.longPauses ? ` · ${turn.longPauses} long pause${turn.longPauses === 1 ? "" : "s"}` : ""}
                    {turn.endedBy === "time" ? " · stopped at the time limit" : ""}
                    {turn.sttModel ? ` · transcribed by ${modelName(turn.sttModel)}` : ""}
                  </p>
                  {turn.audioUrl && <audio controls src={turn.audioUrl} preload="none" aria-label={`Your answer to: ${turn.question}`} />}
                </>
              )}
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
