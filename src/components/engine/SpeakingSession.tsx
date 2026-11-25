import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Keyboard, Mic, MicOff, RotateCcw, Sparkles, Square, Volume2 } from "lucide-react";
import type { AttemptMode, SectionPublic, SpeakingPromptPublic, SpeakingResponseIn } from "../../lib/attemptTypes";
import { LiveExaminer } from "../live/LiveExaminer";

type Props = {
  sections: SectionPublic[];
  /** Used by the live examiner to keep this attempt's local recordings. */
  attemptId: string;
  mode: AttemptMode;
  answers: Record<string, SpeakingResponseIn>;
  onAnswer: (promptId: string, value: SpeakingResponseIn) => void;
  onFinish: () => void;
};

type MicState = "idle" | "requesting" | "ready" | "denied" | "unsupported" | "error";
type Recording = { url: string; mimeType: string; seconds: number };
type Stage = "prep" | "ready" | "recording" | "done";

const PART_LABEL: Record<number, string> = {
  1: "Part 1 · Interview",
  2: "Part 2 · Long turn",
  3: "Part 3 · Discussion",
};

function pickMimeType(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  if (typeof MediaRecorder === "undefined") return "";
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function extensionFor(mimeType: string) {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

function clock(seconds: number) {
  const safe = Math.max(0, Math.round(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

const recordingSupported = () =>
  typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";

/**
 * FR-SPEAK-01..09: scripted three-part speaking session. Recordings stay
 * in this browser tab (spec 3.8 storage policy) - only metadata (mode,
 * duration, completion) and text-mode answers are saved to the server.
 * Follow-ups are fixed prompts from the question bank, never generated.
 */
export function SpeakingSession({ sections, attemptId, mode, answers, onAnswer, onFinish }: Props) {
  // Phase 5: the live AI examiner is the recommended way in; recording
  // answers yourself and text mode stay available (FR-SPEAK-09).
  const [liveMode, setLiveMode] = useState(false);
  // The prompts already answered when live mode opens: the examiner resumes
  // after them. Taken once on entry, so answers saved during the session
  // don't restart the examiner.
  const [answeredIds, setAnsweredIds] = useState<ReadonlySet<string>>(() => new Set());
  const enterLiveMode = () => {
    setAnsweredIds(new Set(Object.entries(answers).filter(([, a]) => a.completed).map(([id]) => id)));
    setLiveMode(true);
  };
  const prompts = useMemo(
    () => sections.flatMap((section) => section.speaking_prompts.map((prompt) => ({ prompt, instructions: section.instructions }))),
    [sections],
  );
  const firstUnanswered = prompts.findIndex(({ prompt }) => !answers[prompt.id]?.completed);
  const [index, setIndex] = useState(firstUnanswered === -1 ? 0 : firstUnanswered);
  const [micState, setMicState] = useState<MicState>(() => (recordingSupported() ? "idle" : "unsupported"));
  const [textMode, setTextMode] = useState(false);
  const [recordings, setRecordings] = useState<Record<string, Recording>>({});
  const [stage, setStage] = useState<Stage>("ready");
  const [elapsed, setElapsed] = useState(0);
  const [prepLeft, setPrepLeft] = useState(0);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const current = prompts[index];
  const prompt: SpeakingPromptPublic | undefined = current?.prompt;
  const answer = prompt ? answers[prompt.id] : undefined;
  const recording = prompt ? recordings[prompt.id] : undefined;
  const isLast = index === prompts.length - 1;
  const canGoBack = mode === "practice" && index > 0;
  const speechAvailable = typeof window !== "undefined" && "speechSynthesis" in window;

  // Release the microphone and object URLs when leaving the page.
  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (tickRef.current) clearInterval(tickRef.current);
      if (speechAvailable) window.speechSynthesis.cancel();
    },
    [speechAvailable],
  );
  useEffect(() => () => Object.values(recordings).forEach((r) => URL.revokeObjectURL(r.url)), [recordings]);

  // Reset the per-prompt stage whenever the prompt changes (or text mode
  // is switched). Answers and recordings are read from a ref: saving an
  // answer must not reset the stage of the prompt on screen.
  const latest = useRef({ answers, recordings });
  useEffect(() => {
    latest.current = { answers, recordings };
  });
  useEffect(() => {
    if (!prompt) return;
    if (tickRef.current) clearInterval(tickRef.current);
    setElapsed(0);
    if (latest.current.answers[prompt.id]?.completed || latest.current.recordings[prompt.id]) {
      setStage("done");
    } else if (prompt.prep_seconds && !textMode) {
      setStage("prep");
      setPrepLeft(prompt.prep_seconds);
    } else {
      setStage("ready");
    }
  }, [prompt, textMode]);

  const requestMic = async () => {
    setMicState("requesting");
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicState("ready");
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      setMicState(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "error");
    }
  };

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  const startRecording = useCallback(() => {
    if (!prompt || !streamRef.current) return;
    const mimeType = pickMimeType();
    const recorder = mimeType ? new MediaRecorder(streamRef.current, { mimeType }) : new MediaRecorder(streamRef.current);
    chunksRef.current = [];
    recorder.ondataavailable = (event) => event.data.size > 0 && chunksRef.current.push(event.data);
    const promptId = prompt.id;
    recorder.onstop = () => {
      if (tickRef.current) clearInterval(tickRef.current);
      const seconds = (Date.now() - startedAtRef.current) / 1000;
      const type = recorder.mimeType || mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type });
      setRecordings((prev) => {
        if (prev[promptId]) URL.revokeObjectURL(prev[promptId].url);
        return { ...prev, [promptId]: { url: URL.createObjectURL(blob), mimeType: type, seconds } };
      });
      setStage("done");
      onAnswer(promptId, { response_mode: "audio", duration_seconds: Math.round(seconds * 10) / 10, text_response: null, completed: true });
    };
    recorderRef.current = recorder;
    startedAtRef.current = Date.now();
    recorder.start();
    setStage("recording");
    setElapsed(0);
    const limit = prompt.part === 2 && prompt.speak_seconds ? prompt.speak_seconds : null;
    tickRef.current = setInterval(() => {
      const seconds = (Date.now() - startedAtRef.current) / 1000;
      setElapsed(seconds);
      // Part 2's long turn stops at its time limit, as in the real test.
      if (limit && seconds >= limit) stopRecording();
    }, 250);
  }, [onAnswer, prompt, stopRecording]);

  // Part 2 preparation countdown; recording starts automatically at zero.
  useEffect(() => {
    if (stage !== "prep") return;
    if (prepLeft <= 0) {
      if (micState === "ready") startRecording();
      else setStage("ready");
      return;
    }
    const timer = setTimeout(() => setPrepLeft((left) => left - 1), 1000);
    return () => clearTimeout(timer);
  }, [stage, prepLeft, micState, startRecording]);

  const readAloud = () => {
    if (!prompt || !speechAvailable) return;
    window.speechSynthesis.cancel();
    const text = [prompt.prompt, ...(prompt.bullets ? ["You should say:", ...prompt.bullets] : [])].join(". ");
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-GB";
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  };

  const goTo = (next: number) => {
    if (stage === "recording") stopRecording();
    if (speechAvailable) window.speechSynthesis.cancel();
    setIndex(next);
  };

  if (prompts.length === 0) {
    return <p className="info-banner">This speaking test has no prompts yet.</p>;
  }

  if (liveMode) {
    return (
      <LiveExaminer
        sections={sections}
        answered={answeredIds}
        attemptId={attemptId}
        mode={mode}
        onAnswer={onAnswer}
        onFinish={onFinish}
        onExit={() => setLiveMode(false)}
      />
    );
  }

  const useText = textMode || micState === "unsupported";
  const answeredCount = prompts.filter(({ prompt: p }) => answers[p.id]?.completed).length;

  // --- Mic gate: privacy notice before anything is requested (FR-SPEAK-03)
  if (!useText && micState !== "ready") {
    return (
      <div className="dashboard-card speaking-gate">
        <h2>
          <Mic size={18} aria-hidden="true" /> Before you start
        </h2>
        <ul className="speaking-privacy">
          <li>Your answers are recorded in this browser only. They are never uploaded or kept by Prepband.</li>
          <li>We save only which questions you answered and for how long, so your history is accurate.</li>
          <li>Recordings disappear if you refresh or close this tab. Use Download to keep one.</li>
        </ul>
        {micState === "denied" && (
          <p className="form-banner form-banner-error form-banner-text" role="alert">
            Microphone access was blocked. Click the lock or microphone icon in your browser&rsquo;s address bar, allow the
            microphone for this site, then try again. Or continue in text mode.
          </p>
        )}
        {micState === "error" && (
          <p className="form-banner form-banner-error form-banner-text" role="alert">
            We couldn&rsquo;t find a working microphone. Check one is connected and not in use by another app, then try again.
          </p>
        )}
        <div className="speaking-choice">
          <button type="button" className="button button-primary" onClick={enterLiveMode}>
            <Sparkles size={16} aria-hidden="true" /> Talk with the AI practice examiner
          </button>
          <p className="admin-muted">
            Recommended. A simulated examiner asks the questions aloud and listens to your answers, like the real test. Free models
            running on your device.
          </p>
        </div>
        <p className="admin-muted speaking-or">Or practise on your own:</p>
        <div className="speaking-actions">
          <button type="button" className="button button-secondary" onClick={requestMic} disabled={micState === "requesting"}>
            <Mic size={16} aria-hidden="true" />{" "}
            {micState === "idle" ? "Record answers yourself" : micState === "requesting" ? "Waiting for permission…" : "Try again"}
          </button>
          <button type="button" className="button button-secondary" onClick={() => setTextMode(true)}>
            <Keyboard size={16} aria-hidden="true" /> Use text mode instead
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="speaking-session">
      {useText && (
        <p className="info-banner speaking-text-note">
          <MicOff size={15} aria-hidden="true" />{" "}
          {micState === "unsupported"
            ? "Your browser can't record audio, so this is text-mode practice. "
            : "Text-mode practice. "}
          Typing an answer helps you plan ideas, but it isn&rsquo;t speaking practice, and fluency and pronunciation can&rsquo;t be reflected on.
        </p>
      )}

      <ol className="speaking-palette" aria-label="Speaking prompts">
        {prompts.map(({ prompt: p }, i) => (
          <li key={p.id}>
            <button
              type="button"
              className={`speaking-dot${i === index ? " is-current" : ""}${answers[p.id]?.completed ? " is-done" : ""}`}
              onClick={() => (mode === "practice" || i <= index ? goTo(i) : undefined)}
              disabled={mode === "exam" && i > index}
              aria-label={`Prompt ${i + 1}, Part ${p.part}${answers[p.id]?.completed ? ", answered" : ""}`}
              aria-current={i === index ? "step" : undefined}
            >
              {i + 1}
            </button>
          </li>
        ))}
      </ol>

      {prompt && (
        <div className="dashboard-card speaking-card">
          <p className="writing-task-label">
            {PART_LABEL[prompt.part]} · prompt {index + 1} of {prompts.length}
          </p>
          {current.instructions && (index === 0 || prompts[index - 1].prompt.part !== prompt.part) && (
            <p className="speaking-instructions">{current.instructions}</p>
          )}

          <div className={prompt.bullets ? "speaking-cue-card" : undefined}>
            <h2 className="speaking-prompt">{prompt.prompt}</h2>
            {prompt.bullets && (
              <>
                <p>You should say:</p>
                <ul>
                  {prompt.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {speechAvailable && (
            <button type="button" className="button button-secondary button-sm" onClick={readAloud}>
              <Volume2 size={14} aria-hidden="true" /> Read aloud
            </button>
          )}

          {useText ? (
            <div className="admin-field speaking-text-answer">
              <label htmlFor={`speak-text-${prompt.id}`}>Your answer (typed)</label>
              <textarea
                id={`speak-text-${prompt.id}`}
                className="form-input"
                rows={5}
                value={answer?.text_response ?? ""}
                spellCheck
                onChange={(event) =>
                  onAnswer(prompt.id, {
                    response_mode: "text",
                    duration_seconds: null,
                    text_response: event.target.value,
                    completed: event.target.value.trim().length > 0,
                  })
                }
              />
            </div>
          ) : (
            <div className="speaking-recorder">
              {stage === "prep" && (
                <>
                  <p className="speaking-timer" aria-live="polite">
                    Preparation: {clock(prepLeft)}
                  </p>
                  <label className="admin-field">
                    <span>Notes (only you see these; they aren&rsquo;t saved)</span>
                    <textarea
                      className="form-input"
                      rows={4}
                      value={notes[prompt.id] ?? ""}
                      onChange={(event) => setNotes({ ...notes, [prompt.id]: event.target.value })}
                    />
                  </label>
                  <button type="button" className="button button-primary" onClick={() => setPrepLeft(0)}>
                    <Mic size={16} aria-hidden="true" /> I&rsquo;m ready, start speaking
                  </button>
                </>
              )}

              {stage === "ready" && (
                <>
                  <p className="admin-muted">
                    {prompt.speak_seconds ? `Aim to speak for about ${clock(prompt.speak_seconds)}.` : "Answer in your own time."}
                  </p>
                  <button type="button" className="button button-primary" onClick={startRecording}>
                    <Mic size={16} aria-hidden="true" /> Start recording
                  </button>
                </>
              )}

              {stage === "recording" && (
                <>
                  <p className="speaking-timer is-recording" aria-live="polite">
                    <span className="speaking-rec-dot" aria-hidden="true" /> Recording {clock(elapsed)}
                    {prompt.speak_seconds ? ` / ${clock(prompt.speak_seconds)}` : ""}
                  </p>
                  <button type="button" className="button button-primary" onClick={stopRecording}>
                    <Square size={14} aria-hidden="true" /> Stop
                  </button>
                </>
              )}

              {stage === "done" && (
                <>
                  {recording ? (
                    <>
                      <audio controls src={recording.url} className="admin-audio" />
                      <p className="admin-muted">Recorded {clock(recording.seconds)}. Kept in this tab only.</p>
                    </>
                  ) : (
                    <p className="admin-muted">
                      Answered{answer?.duration_seconds ? ` (${clock(answer.duration_seconds)})` : ""}. The recording isn&rsquo;t
                      available after a refresh, because recordings are never uploaded.
                    </p>
                  )}
                  <div className="speaking-actions">
                    {recording && (
                      <a className="button button-secondary button-sm" href={recording.url} download={`prepband-speaking-${index + 1}.${extensionFor(recording.mimeType)}`}>
                        <Download size={14} aria-hidden="true" /> Download
                      </a>
                    )}
                    {mode === "practice" && (
                      <button type="button" className="button button-secondary button-sm" onClick={startRecording}>
                        <RotateCcw size={14} aria-hidden="true" /> Re-record
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="speaking-nav">
            <button type="button" className="button button-secondary" onClick={() => goTo(index - 1)} disabled={!canGoBack}>
              <ChevronLeft size={16} aria-hidden="true" /> Previous
            </button>
            {isLast ? (
              <button
                type="button"
                className="button button-primary"
                onClick={() => {
                  if (stage === "recording") stopRecording();
                  const unanswered = prompts.length - answeredCount;
                  if (unanswered > 0 && !window.confirm(`${unanswered} prompt(s) have no answer. Finish anyway?`)) return;
                  onFinish();
                }}
              >
                Finish speaking test
              </button>
            ) : (
              <button type="button" className="button button-primary" onClick={() => goTo(index + 1)} disabled={stage === "recording" || stage === "prep"}>
                Next <ChevronRight size={16} aria-hidden="true" />
              </button>
            )}
          </div>
          {mode === "exam" && <p className="admin-muted">Exam mode: one recording per answer and no going back, like the real test.</p>}
        </div>
      )}
    </div>
  );
}
