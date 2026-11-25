import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "./apiClient";
import {
  clearDraft,
  confirmSaved,
  createSeq,
  draftKey,
  pendingChanges,
  pruneOldDrafts,
  rememberChange,
  type DraftEntry,
} from "./draftStore";
import type {
  AttemptMode,
  AttemptOut,
  AttemptWithResponses,
  MockModuleStart,
  ResultsOut,
  SkillModule,
  SpeakingResponseIn,
  TestDetail,
} from "./attemptTypes";

type SaveStatus = "idle" | "saving" | "saved" | "error";

const AUTOSAVE_DEBOUNCE_MS = 600;
// Essays autosave less eagerly than single answers - every keystroke
// doesn't need its own request.
const WRITING_DEBOUNCE_MS = 1500;

type PendingSave = { timer: ReturnType<typeof setTimeout>; run: () => Promise<void> };

type Saved = { client_seq?: number | null };

/** Speaking answers kept on this device: typed answers only. Recordings
 * never are, and live transcripts may not have consent to be kept. */
function keepSpeakingLocally(value: SpeakingResponseIn): boolean {
  return value.response_mode === "text";
}

/**
 * Drives one test-taking session end to end: starts or resumes the
 * server-owned attempt, loads the test's safe content, keeps local answer
 * state in sync with debounced autosave, ticks a countdown from the
 * server's own expires_at (never the other way around), and switches to
 * results once the attempt is submitted or the server reconciles it as
 * expired.
 *
 * Handles every module: objective answers (Reading/Listening), essay
 * drafts (Writing, FR-WRITE-03) and speaking answer metadata (Speaking,
 * FR-SPEAK-06). Pending saves are flushed before submit, so the last few
 * keystrokes are never lost.
 *
 * Every change gets a number that only goes up and is sent with the save,
 * so a retried old save can't overwrite a newer one on the server. Until
 * the server confirms a change, a copy stays on this device (draftStore)
 * and is restored if the tab closes first.
 */
export type AttemptSource =
  | { kind: "test"; testId: string; mode: AttemptMode }
  | { kind: "mock"; mockId: string; module: SkillModule };

export function useAttemptSession(source: AttemptSource) {
  // A primitive key so the start effect only re-runs when the source really changes.
  const sourceKey =
    source.kind === "test" ? `test:${source.testId}:${source.mode}` : `mock:${source.mockId}:${source.module}`;
  const [test, setTest] = useState<TestDetail | null>(null);
  const [attempt, setAttempt] = useState<AttemptOut | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [essays, setEssays] = useState<Record<string, string>>({});
  const [speaking, setSpeaking] = useState<Record<string, SpeakingResponseIn>>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [results, setResults] = useState<ResultsOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  /** How many unsaved changes were put back from this device on load. */
  const [restoredCount, setRestoredCount] = useState(0);

  const pending = useRef<Record<string, PendingSave>>({});
  const reconciling = useRef(false);
  const seq = useRef(createSeq());

  /** Debounces one save per key; a newer change replaces the queued one. */
  const schedule = useCallback(
    (attemptId: string, key: string, delay: number, changeSeq: number, send: () => Promise<Saved>) => {
      const existing = pending.current[key];
      if (existing) clearTimeout(existing.timer);
      setSaveStatus("saving");
      let tries = 0;
      const run = async (): Promise<void> => {
        delete pending.current[key];
        try {
          const saved = await send();
          confirmSaved(attemptId, key, Math.max(changeSeq, saved?.client_seq ?? 0));
          if (Object.keys(pending.current).length === 0) setSaveStatus("saved");
        } catch (err) {
          setSaveStatus("error");
          // A rejected answer (4xx) won't succeed by retrying. A network blip
          // or a waking server will: retry the same save (unless a newer
          // change replaced it), since a live-examiner answer has no "next
          // change" that would save it again.
          const retryable = !(err instanceof ApiError) || err.status === 0 || err.status >= 500 || err.status === 429 || err.status === 409;
          const finished = err instanceof ApiError && err.status === 409 && /no longer accepting/i.test(err.message);
          if (retryable && !finished && tries < 4 && !pending.current[key]) {
            tries += 1;
            pending.current[key] = { timer: setTimeout(run, 2000 * 2 ** (tries - 1)), run };
          }
        }
      };
      pending.current[key] = { timer: setTimeout(run, delay), run };
    },
    [],
  );

  const sendAnswer = useCallback(
    (attemptId: string, questionId: string, value: unknown, changeSeq: number, delay: number) =>
      schedule(attemptId, draftKey("q", questionId), delay, changeSeq, () =>
        api.put<Saved>(`/attempts/${attemptId}/responses/${questionId}`, { response: value, client_seq: changeSeq }),
      ),
    [schedule],
  );

  const sendEssay = useCallback(
    (attemptId: string, promptId: string, body: string, changeSeq: number, delay: number) =>
      schedule(attemptId, draftKey("w", promptId), delay, changeSeq, () =>
        api.put<Saved>(`/attempts/${attemptId}/writing/${promptId}`, { body, client_seq: changeSeq }),
      ),
    [schedule],
  );

  const sendSpeaking = useCallback(
    (attemptId: string, promptId: string, value: SpeakingResponseIn, changeSeq: number, delay: number) =>
      schedule(attemptId, draftKey("s", promptId), delay, changeSeq, () =>
        api.put<Saved>(`/attempts/${attemptId}/speaking/${promptId}`, { ...value, client_seq: changeSeq }),
      ),
    [schedule],
  );

  const loadResults = useCallback(async (attemptId: string) => {
    const resultsOut = await api.get<ResultsOut>(`/attempts/${attemptId}/results`);
    setResults(resultsOut);
  }, []);

  useEffect(() => {
    let active = true;

    async function init() {
      setLoading(true);
      setError("");
      try {
        const [kind, first, second] = sourceKey.split(":");
        // Full-mock modules start through /mocks so they stay linked to
        // the mock and run against the version it pinned (FR-MOCK-03).
        const startedId =
          kind === "mock"
            ? (await api.post<MockModuleStart>(`/mocks/${first}/modules/${second}/start`)).attempt_id
            : (await api.post<AttemptOut>("/attempts", { test_id: first, mode: second })).id;
        // Content always comes from the attempt's own version, so a
        // republish mid-attempt never changes what the student sees.
        const [testDetail, full] = await Promise.all([
          api.get<TestDetail>(`/attempts/${startedId}/content`),
          api.get<AttemptWithResponses>(`/attempts/${startedId}`),
        ]);
        if (!active) return;
        setTest(testDetail);
        setAttempt(full);

        if (full.status === "in_progress") {
          // FR-TEST-05 / FR-WRITE-03: restore everything saved so far.
          const answersNow: Record<string, unknown> = Object.fromEntries(full.responses.map((r) => [r.question_id, r.response]));
          const essaysNow: Record<string, string> = Object.fromEntries(
            (full.writing_responses ?? []).map((w) => [w.writing_prompt_id, w.body]),
          );
          const speakingNow: Record<string, SpeakingResponseIn> = Object.fromEntries(
            (full.speaking_responses ?? []).map((sp) => [
              sp.speaking_prompt_id,
              {
                response_mode: sp.response_mode,
                duration_seconds: sp.duration_seconds,
                text_response: sp.text_response,
                completed: sp.completed,
                // Live answers keep their record, so saving that answer
                // again can't wipe a transcript the student chose to keep.
                ...(sp.response_mode === "live"
                  ? {
                      save_transcript: sp.transcript != null || Boolean(sp.turns?.some((t) => t.transcript != null)),
                      transcript: sp.transcript,
                      stt_model: sp.stt_model,
                      turns: sp.turns,
                    }
                  : {}),
              },
            ]),
          );

          // Change numbers continue above anything the server holds.
          const serverSeq: Record<string, number> = {};
          full.responses.forEach((r) => (serverSeq[draftKey("q", r.question_id)] = r.client_seq ?? 0));
          (full.writing_responses ?? []).forEach((w) => (serverSeq[draftKey("w", w.writing_prompt_id)] = w.client_seq ?? 0));
          (full.speaking_responses ?? []).forEach((sp) => (serverSeq[draftKey("s", sp.speaking_prompt_id)] = sp.client_seq ?? 0));
          Object.values(serverSeq).forEach((value) => seq.current.raise(value));

          // Put back changes this device made that never reached the server.
          pruneOldDrafts();
          const restored: Array<[string, DraftEntry]> = Object.entries(pendingChanges(startedId)).filter(
            ([key, entry]) => entry.seq > (serverSeq[key] ?? 0),
          );
          for (const [key, entry] of restored) {
            seq.current.raise(entry.seq);
            const [kindOfChange, id] = [key.slice(0, 1), key.slice(2)];
            if (kindOfChange === "q") {
              answersNow[id] = entry.value;
              sendAnswer(startedId, id, entry.value, entry.seq, 0);
            } else if (kindOfChange === "w" && typeof entry.value === "string") {
              essaysNow[id] = entry.value;
              sendEssay(startedId, id, entry.value, entry.seq, 0);
            } else if (kindOfChange === "s" && entry.value && typeof entry.value === "object") {
              speakingNow[id] = entry.value as SpeakingResponseIn;
              sendSpeaking(startedId, id, entry.value as SpeakingResponseIn, entry.seq, 0);
            }
          }
          setRestoredCount(restored.length);
          setAnswers(answersNow);
          setEssays(essaysNow);
          setSpeaking(speakingNow);
        } else {
          clearDraft(full.id);
          await loadResults(full.id);
        }
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.message : "Failed to start this test.");
      } finally {
        if (active) setLoading(false);
      }
    }

    init();
    return () => {
      active = false;
    };
  }, [sourceKey, loadResults, sendAnswer, sendEssay, sendSpeaking]);

  // Ticks the visible countdown every second while in progress, and
  // reconciles with the server (which may flip the attempt to "expired")
  // once the deadline passes - the frontend clock is only ever a display.
  useEffect(() => {
    if (!attempt || attempt.status !== "in_progress" || !attempt.expires_at) return;

    const interval = setInterval(() => {
      setNow(Date.now());
      const remainingMs = new Date(attempt.expires_at!).getTime() - Date.now();
      if (remainingMs <= 0 && !reconciling.current) {
        reconciling.current = true;
        api
          .get<AttemptWithResponses>(`/attempts/${attempt.id}`)
          .then(async (fresh) => {
            setAttempt(fresh);
            if (fresh.status !== "in_progress") {
              clearDraft(fresh.id);
              await loadResults(fresh.id);
            }
          })
          .finally(() => {
            reconciling.current = false;
          });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [attempt, loadResults]);

  /** Sends every queued save now and waits for them. */
  const flushSaves = useCallback(async () => {
    const queued = Object.values(pending.current);
    queued.forEach((item) => clearTimeout(item.timer));
    await Promise.all(queued.map((item) => item.run()));
  }, []);

  const setAnswer = useCallback(
    (questionId: string, value: unknown) => {
      setAnswers((prev) => ({ ...prev, [questionId]: value }));
      if (!attempt) return;
      const changeSeq = seq.current.next();
      rememberChange(attempt.id, draftKey("q", questionId), value, changeSeq);
      sendAnswer(attempt.id, questionId, value, changeSeq, AUTOSAVE_DEBOUNCE_MS);
    },
    [attempt, sendAnswer],
  );

  const setEssay = useCallback(
    (promptId: string, body: string) => {
      setEssays((prev) => ({ ...prev, [promptId]: body }));
      if (!attempt) return;
      const changeSeq = seq.current.next();
      // Written straight away, not debounced: this is the copy that
      // survives the tab closing before the save goes out.
      rememberChange(attempt.id, draftKey("w", promptId), body, changeSeq);
      sendEssay(attempt.id, promptId, body, changeSeq, WRITING_DEBOUNCE_MS);
    },
    [attempt, sendEssay],
  );

  /** Speaking answers save immediately (they change rarely: on stop,
   * on "mark done", or as a text answer is typed). */
  const setSpeakingAnswer = useCallback(
    (promptId: string, value: SpeakingResponseIn) => {
      setSpeaking((prev) => ({ ...prev, [promptId]: value }));
      if (!attempt) return;
      const changeSeq = seq.current.next();
      if (keepSpeakingLocally(value)) rememberChange(attempt.id, draftKey("s", promptId), value, changeSeq);
      sendSpeaking(
        attempt.id,
        promptId,
        value,
        changeSeq,
        value.response_mode === "text" && !value.completed ? WRITING_DEBOUNCE_MS : 0,
      );
    },
    [attempt, sendSpeaking],
  );

  const submit = useCallback(async () => {
    if (!attempt) return;
    setLoading(true);
    setError("");
    try {
      await flushSaves();
      const submitted = await api.post<AttemptOut>(`/attempts/${attempt.id}/submit`);
      clearDraft(submitted.id);
      setAttempt(submitted);
      await loadResults(submitted.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit.");
    } finally {
      setLoading(false);
    }
  }, [attempt, flushSaves, loadResults]);

  // Best effort: send queued saves if the tab is being hidden or closed.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void flushSaves();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [flushSaves]);

  const secondsRemaining =
    attempt?.status === "in_progress" && attempt.expires_at
      ? Math.max(0, Math.floor((new Date(attempt.expires_at).getTime() - now) / 1000))
      : null;

  return {
    test,
    attempt,
    answers,
    essays,
    speaking,
    saveStatus,
    results,
    setResults,
    loading,
    error,
    setAnswer,
    setEssay,
    setSpeakingAnswer,
    submit,
    secondsRemaining,
    restoredCount,
  };
}
