import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, Check, CircleStop, Loader2, Mic, RotateCcw, Sparkles } from "lucide-react";
import type { AttemptMode, SectionPublic, SpeakingResponseIn } from "../../lib/attemptTypes";
import { JOB_LABEL, tierById, tiersFor, type JobId, type TierId } from "../../lib/live/catalog";
import { toScriptPrompts, useLiveExaminer } from "../../lib/live/useLiveExaminer";
import { ExaminerAvatar } from "./ExaminerAvatar";

type Props = {
  sections: SectionPublic[];
  /** Prompts already answered (resuming after a refresh). */
  answered: ReadonlySet<string>;
  attemptId: string;
  mode: AttemptMode;
  onAnswer: (promptId: string, value: SpeakingResponseIn) => void;
  onFinish: () => void;
  /** Back to the mode choice (record-yourself or text mode). */
  onExit: () => void;
};

type JobState = { active: TierId | null; loading: TierId | null; progress?: number | null; note?: string; failures: { id: TierId; reason: string }[] };

const PART_TITLE: Record<number, string> = {
  0: "Introduction",
  1: "Part 1 · Interview",
  2: "Part 2 · Long turn",
  3: "Part 3 · Discussion",
};

function clock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function JobRow({ job, state, optional }: { job: JobId; state: JobState | null; optional?: boolean }) {
  const loading = state?.loading ? tierById(state.loading) : null;
  const active = state?.active ? tierById(state.active) : null;
  return (
    <li className="live-job">
      <div className="live-job-head">
        <strong>{JOB_LABEL[job]}</strong>
        {active && !loading && (
          <span className="live-job-ok">
            <Check size={14} aria-hidden="true" /> {active.name}
          </span>
        )}
        {loading && (
          <span className="live-job-loading">
            <Loader2 size={14} className="spin" aria-hidden="true" /> Loading {loading.name}
            {loading.downloadMb > 0 ? ` (about ${loading.downloadMb >= 1000 ? `${(loading.downloadMb / 1000).toFixed(1)} GB` : `${loading.downloadMb} MB`}, first time only)` : ""}
          </span>
        )}
        {!active && !loading && <span className="admin-muted">{optional ? "Off" : "Waiting"}</span>}
      </div>
      {loading && state?.progress != null && (
        <div className="live-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(state.progress * 100)}>
          <div style={{ width: `${Math.round(state.progress * 100)}%` }} />
        </div>
      )}
      {state?.note && loading && <p className="admin-muted live-job-note">{state.note}</p>}
      {state && state.failures.length > 0 && (
        <p className="admin-muted live-job-note">
          Switched to a fallback: {state.failures.map((f) => `${tierById(f.id).name} (${f.reason})`).join("; ")}
        </p>
      )}
    </li>
  );
}

/**
 * Phase 5: the live AI practice examiner. Setup (consent and downloads),
 * then a voice conversation through all three parts. Every job has a main
 * free model and three fallbacks; the examiner keeps going whichever
 * tiers are available.
 */
export function LiveExaminer({ sections, answered, attemptId, mode, onAnswer, onFinish, onExit }: Props) {
  const live = useLiveExaminer({ sections, answered, attemptId, mode, onAnswer, onFinish });
  const [saveTranscript, setSaveTranscript] = useState(false);
  const [allowCloud, setAllowCloud] = useState(false);
  const [enhanced, setEnhanced] = useState(false);
  const [notes, setNotes] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const meter = useRef<HTMLDivElement>(null);
  const answerClock = useRef<HTMLSpanElement>(null);
  const captionList = useRef<HTMLOListElement>(null);

  // Mic level meter and answer timer, updated without re-rendering.
  const { phase, micCapture, listenProgress } = live;
  useEffect(() => {
    if (phase !== "running") return;
    const mic = micCapture();
    const off = mic?.onFrame((level) => {
      if (meter.current) meter.current.style.width = `${Math.min(100, level * 900)}%`;
    });
    const timer = setInterval(() => {
      setNow(Date.now());
      const progress = listenProgress();
      if (answerClock.current) answerClock.current.textContent = progress ? clock(progress.elapsed) : "";
    }, 250);
    return () => {
      off?.();
      clearInterval(timer);
    };
  }, [phase, micCapture, listenProgress]);

  // Keep the newest line in view inside the scrolling caption list.
  const captionCount = live.captions.length;
  useEffect(() => {
    const list = captionList.current;
    if (list && captionCount > 0) list.scrollTop = list.scrollHeight;
  }, [captionCount]);

  const webgpu = live.caps?.webgpu ?? false;
  const voiceReady = Boolean(live.voiceStatus?.active);
  const examinerLine = [...live.captions].reverse().find((c) => c.who === "examiner");

  if (live.phase === "setup" && toScriptPrompts(sections, answered).length === 0) {
    return (
      <div className="dashboard-card live-setup">
        <h2>Every question is answered</h2>
        <p>You&rsquo;ve answered all the speaking questions. Submit to see your feedback.</p>
        <button type="button" className="button button-primary" onClick={onFinish}>
          Finish speaking test
        </button>
      </div>
    );
  }

  if (live.phase === "setup" || live.phase === "error") {
    const mainModels = (["stt", "voice", "turns", "followups"] as JobId[]).map((job) => ({ job, tiers: tiersFor(job) }));
    return (
      <div className="dashboard-card live-setup">
        <h2>
          <Sparkles size={18} aria-hidden="true" /> Talk with the AI practice examiner
        </h2>
        <p>
          The examiner asks every question aloud, listens, waits until you&rsquo;ve finished and asks follow-ups, through all three
          parts with real timing. Just speak naturally.
        </p>
        {answered.size > 0 && (
          <p className="info-banner" role="status">
            Welcome back. The examiner will carry on with the {toScriptPrompts(sections, answered).length} question
            {toScriptPrompts(sections, answered).length === 1 ? "" : "s"} you haven&rsquo;t answered yet.
          </p>
        )}
        <p className="info-banner live-disclosure" role="note">
          This is an <strong>AI practice examiner, not a real person</strong> and not an official IELTS examiner. It doesn&rsquo;t give
          a band score: you get practice feedback on timing, pauses and words instead.
        </p>

        <ul className="speaking-privacy">
          <li>Everything runs on your device with free, open models. Your recordings never leave this browser.</li>
          <li>
            The first time, your browser downloads the models (around 150&ndash;250 MB). After that they&rsquo;re cached. Wi-Fi
            recommended.
          </li>
          <li>Each job has a main model and three fallbacks, so the test keeps going on any device.</li>
        </ul>

        <details className="live-models">
          <summary>Which models are used</summary>
          <ul>
            {mainModels.map(({ job, tiers }) => (
              <li key={job}>
                <strong>{JOB_LABEL[job]}:</strong> {tiers.map((t, i) => `${i === 0 ? "" : "→ "}${t.name}`).join(" ")}
              </li>
            ))}
          </ul>
        </details>

        <fieldset className="live-options">
          <legend>Your choices</legend>
          <label>
            <input type="checkbox" checked={saveTranscript} onChange={(e) => setSaveTranscript(e.target.checked)} />
            <span>
              <strong>Save my transcript to my history</strong>
              <span className="admin-muted">Off: only timings are saved; you still see the transcript right after the test.</span>
            </span>
          </label>
          <label>
            <input type="checkbox" checked={allowCloud} onChange={(e) => setAllowCloud(e.target.checked)} />
            <span>
              <strong>Allow the browser&rsquo;s own speech recognition as a last resort</strong>
              <span className="admin-muted">
                Only used if all three on-device models fail. In Chrome and Edge it sends your audio to Google or Microsoft.
              </span>
            </span>
          </label>
          <label className={webgpu ? undefined : "is-disabled"}>
            <input type="checkbox" checked={enhanced} disabled={!webgpu} onChange={(e) => setEnhanced(e.target.checked)} />
            <span>
              <strong>Smarter follow-up questions</strong>
              <span className="admin-muted">
                {webgpu
                  ? "Downloads a small language model (about 1.6 GB) that picks the most natural follow-up from our question bank."
                  : "Needs a browser with WebGPU. The examiner script picks follow-ups instead."}
              </span>
            </span>
          </label>
        </fieldset>

        {live.error && (
          <p className="form-banner form-banner-error form-banner-text" role="alert">
            {live.error}
          </p>
        )}

        <div className="speaking-actions">
          <button
            type="button"
            className="button button-primary"
            disabled={!live.caps?.mediaDevices}
            onClick={() => void live.prepare({ saveTranscript, allowCloudRecognition: allowCloud, enhancedFollowUps: enhanced })}
          >
            <Mic size={16} aria-hidden="true" /> Allow microphone and get ready
          </button>
          <button type="button" className="button button-secondary" onClick={onExit}>
            <ArrowLeft size={16} aria-hidden="true" /> Other ways to practise
          </button>
        </div>
        {live.caps && !live.caps.mediaDevices && (
          <p className="admin-muted">This browser can&rsquo;t use a microphone, so the live examiner isn&rsquo;t available here.</p>
        )}
      </div>
    );
  }

  if (live.phase === "loading") {
    const voiceLoading = live.voiceStatus?.loading;
    return (
      <div className="dashboard-card live-setup" aria-live="polite">
        <h2>Getting the examiner ready</h2>
        <ul className="live-jobs">
          <JobRow job="voice" state={live.voiceStatus} />
          <JobRow job="turns" state={live.turnsStatus} />
          <JobRow job="stt" state={live.sttStatus} />
          <JobRow job="followups" state={live.followStatus} optional />
        </ul>
        <p className="admin-muted">
          You can start once the voice is ready. Speech recognition can keep loading during the introduction; until it&rsquo;s ready,
          your answers are timed but not transcribed.
        </p>
        <div className="speaking-actions">
          <button type="button" className="button button-primary" disabled={!voiceReady} onClick={() => void live.start()}>
            {voiceReady ? "Start the speaking test" : "Preparing the voice…"}
          </button>
          {(voiceLoading === "kokoro" || voiceLoading === "piper") && (
            <button type="button" className="button button-secondary" onClick={() => void live.skipVoiceTo("browser-voice")}>
              Don&rsquo;t wait, use the browser voice
            </button>
          )}
        </div>
      </div>
    );
  }

  if (live.phase === "saving" || live.phase === "finished") {
    return (
      <div className="dashboard-card live-setup" aria-live="polite">
        <p className="auth-status-row">
          <Loader2 size={18} className="spin" aria-hidden="true" /> Saving your answers…
        </p>
      </div>
    );
  }

  // --- running ----------------------------------------------------------------
  const elapsed = live.startedAt ? (now - live.startedAt) / 1000 : 0;
  const listening = live.activity === "listening";
  return (
    <div className="live-session">
      <div className="live-stage dashboard-card">
        <div className="live-stage-head">
          <span className="track-pill">{PART_TITLE[live.part]}</span>
          <span className="admin-muted">Test time {clock(elapsed)}</span>
        </div>

        <ExaminerAvatar activity={live.activity} level={live.voiceLevel} />

        <p className="live-current-line" aria-live="polite">
          {examinerLine?.text ?? "…"}
        </p>

        {live.cueCard && (
          <div className="live-cue-card">
            <p className="writing-task-label">Your cue card</p>
            <h3>{live.cueCard.prompt}</h3>
            {live.cueCard.bullets.length > 0 && (
              <>
                <p>You should say:</p>
                <ul>
                  {live.cueCard.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </>
            )}
            {live.cueCard.preparing && (
              <>
                <p className="speaking-timer" aria-live="polite">
                  Preparation: {clock(live.cueCard.prepLeft)} left
                </p>
                <label className="admin-field">
                  <span>Your notes (only on this screen)</span>
                  <textarea className="form-input" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </label>
                <button type="button" className="button button-primary" onClick={live.finishPreparation}>
                  I&rsquo;m ready to speak
                </button>
              </>
            )}
            {!live.cueCard.preparing && notes && <p className="admin-muted live-notes">Notes: {notes}</p>}
          </div>
        )}

        <div className={`live-listen${listening ? " is-active" : ""}`}>
          <div className="live-listen-status">
            <Mic size={16} aria-hidden="true" />
            <span>
              {listening ? (
                <>
                  Listening… <span ref={answerClock} />
                  {live.listenInfo ? ` / ${clock(live.listenInfo.maxSeconds)}` : ""}
                </>
              ) : live.activity === "speaking" ? (
                "The examiner is speaking"
              ) : live.activity === "preparing" ? (
                "Preparing"
              ) : (
                "One moment…"
              )}
            </span>
          </div>
          <div className="live-meter" aria-hidden="true">
            <div ref={meter} />
          </div>
          <div className="speaking-actions">
            <button type="button" className="button button-primary" disabled={!listening} onClick={live.requestFinishAnswer}>
              <Check size={16} aria-hidden="true" /> I&rsquo;ve finished
            </button>
            {live.listenInfo?.canAskAgain && (
              <button type="button" className="button button-secondary" onClick={live.requestAskAgain}>
                <RotateCcw size={16} aria-hidden="true" /> Ask me again
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-card live-captions">
        <h3>Conversation</h3>
        <ol ref={captionList}>
          {live.captions.map((caption) => (
            <li key={caption.id} className={`live-caption is-${caption.who}${caption.pending ? " is-pending" : ""}`}>
              <span className="live-caption-who">{caption.who === "examiner" ? "Examiner" : "You"}</span>
              <span>{caption.text}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="live-footer">
        <p className="admin-muted live-models-line">
          Hearing: {live.sttStatus?.active ? tierById(live.sttStatus.active).name : live.sttStatus?.loading ? `loading ${tierById(live.sttStatus.loading).name}` : "timing only"} ·
          Voice: {live.voiceStatus?.active ? tierById(live.voiceStatus.active).name : "-"} · Turn-taking:{" "}
          {live.turnsStatus.active ? tierById(live.turnsStatus.active).name : "-"} · Follow-ups:{" "}
          {live.followStatus ? tierById(live.followStatus.active).name : "Examiner script"}
        </p>
        <button
          type="button"
          className="button button-secondary"
          onClick={() => {
            if (window.confirm("End the speaking test now? Answers so far are saved and the test is submitted.")) live.endEarly();
          }}
        >
          <CircleStop size={16} aria-hidden="true" /> End test
        </button>
      </div>
      {live.error && (
        <p className="form-banner form-banner-error form-banner-text" role="alert">
          <AlertTriangle size={15} aria-hidden="true" /> {live.error}
        </p>
      )}
    </div>
  );
}
