import { useCallback, useEffect, useRef, useState } from "react";
import type { SectionPublic, SpeakingResponseIn } from "../attemptTypes";
import { encodeWav, MicCapture, openMicrophone, STT_SAMPLE_RATE, stopStream } from "./audio";
import { detectCapabilities, disabledTiers, tierOrder, withTimeout, type Capabilities } from "./capabilities";
import type { TierId } from "./catalog";
import { loadFollowUpChooser, scriptChooser, type FollowUpChooser, type FollowUpStatus } from "./followUps";
import { loadPhrases, type Phrases } from "./phrases";
import { examinerScript, type Answer, type Part, type ScriptPrompt, type Step } from "./script";
import { saveLocalSession, type LocalTurn } from "./sessionStore";
import { reportClientEvent } from "../clientEvents";
import { SttChain, type SttStatus } from "./stt";
import { createEnergyDetector, createSileroDetector, createTimeLimitDetector, listenForAnswer, type ListenHandle, type SpeechDetector } from "./turnTaking";
import { VoiceChain, type VoiceStatus } from "./tts";

/**
 * Drives one live speaking session: loads each job's tiers, then walks
 * the examiner script - speaking lines, listening for answers, waiting
 * for the end of each turn, transcribing in the background - and saves
 * each prompt's answer as it finishes.
 */

export type LiveOptions = { saveTranscript: boolean; allowCloudRecognition: boolean; enhancedFollowUps: boolean };

export type Activity = "idle" | "speaking" | "listening" | "thinking" | "preparing";

export type Caption = { id: number; who: "examiner" | "you"; text: string; pending?: boolean };

export type TurnsStatus = { active: TierId | null; loading: TierId | null; failures: { id: TierId; reason: string }[] };

export type CueCard = { prompt: string; bullets: string[]; prepSeconds: number; prepLeft: number; preparing: boolean };

export type ListenInfo = { maxSeconds: number; canAskAgain: boolean };

export type Phase = "setup" | "loading" | "running" | "saving" | "finished" | "error";

const TRANSCRIPT_WAIT_MS = 1200;

export function toScriptPrompts(sections: SectionPublic[], answered: ReadonlySet<string> = new Set()): ScriptPrompt[] {
  return sections
    .flatMap((section) => section.speaking_prompts)
    // After a refresh, carry on with the prompts that aren't answered yet.
    .filter((p) => !answered.has(p.id))
    .sort((a, b) => a.part - b.part || a.display_order - b.display_order)
    .map((p) => ({
      id: p.id,
      part: p.part as Part,
      prompt: p.prompt,
      bullets: p.bullets,
      prepSeconds: p.prep_seconds,
      speakSeconds: p.speak_seconds,
      followUps: (p.follow_ups ?? []).map((f) => ({ text: f.text, audioUrl: f.audio_url })),
      audioUrl: p.audio_url ?? null,
    }));
}

function seedFrom(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return hash >>> 0;
}

export function useLiveExaminer({
  sections,
  answered,
  attemptId,
  mode,
  onAnswer,
  onFinish,
}: {
  sections: SectionPublic[];
  answered: ReadonlySet<string>;
  attemptId: string;
  mode: "practice" | "exam";
  onAnswer: (promptId: string, value: SpeakingResponseIn) => void;
  onFinish: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("setup");
  const [error, setError] = useState("");
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [sttStatus, setSttStatus] = useState<SttStatus | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus | null>(null);
  const [turnsStatus, setTurnsStatus] = useState<TurnsStatus>({ active: null, loading: null, failures: [] });
  const [followStatus, setFollowStatus] = useState<FollowUpStatus | null>(null);
  const [activity, setActivity] = useState<Activity>("idle");
  const [part, setPart] = useState<Part | 0>(0);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [cueCard, setCueCard] = useState<CueCard | null>(null);
  const [listenInfo, setListenInfo] = useState<ListenInfo | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  // Report each job that had to fall back to a lower tier, once it has
  // settled, so real-device failures show up in the server log.
  const reportedFallbacks = useRef(new Set<string>());
  useEffect(() => {
    const jobs: Array<[string, { active: string | null; loading: string | null; failures: { id: string; reason: string }[] } | null]> = [
      ["voice", voiceStatus],
      ["stt", sttStatus],
      ["turns", turnsStatus],
      ["followups", followStatus],
    ];
    for (const [job, status] of jobs) {
      if (!status || status.loading || status.failures.length === 0 || reportedFallbacks.current.has(job)) continue;
      reportedFallbacks.current.add(job);
      reportClientEvent("live_fallback", `${job} fell back to ${status.active ?? "none"}`, {
        details: {
          job,
          active: status.active,
          failed: status.failures.map((f) => f.id).join(","),
          reason: status.failures[0]?.reason.slice(0, 200) ?? null,
          webgpu: caps?.webgpu ?? null,
        },
      });
    }
  }, [voiceStatus, sttStatus, turnsStatus, followStatus, caps]);

  const micStream = useRef<MediaStream | null>(null);
  const mic = useRef<MicCapture | null>(null);
  const detector = useRef<SpeechDetector | null>(null);
  const voice = useRef<VoiceChain | null>(null);
  const stt = useRef<SttChain | null>(null);
  const chooser = useRef<FollowUpChooser>(scriptChooser);
  const phrases = useRef<Phrases | null>(null);
  const listenHandle = useRef<ListenHandle | null>(null);
  const askAgainRequested = useRef(false);
  const prepDone = useRef<(() => void) | null>(null);
  const cancelled = useRef(false);
  /** False once the examiner has closed: async setup and the running
   * session check it after every wait, so nothing outlives the page. */
  const alive = useRef(true);
  const followAbort = useRef<AbortController | null>(null);
  const captionId = useRef(0);
  const options = useRef<LiveOptions>({ saveTranscript: false, allowCloudRecognition: false, enhancedFollowUps: false });

  useEffect(() => {
    void detectCapabilities().then(setCaps);
  }, []);

  const addCaption = useCallback((who: Caption["who"], text: string, pending = false) => {
    const id = ++captionId.current;
    setCaptions((list) => [...list, { id, who, text, pending }]);
    return id;
  }, []);

  const updateCaption = useCallback((id: number, text: string) => {
    setCaptions((list) => list.map((c) => (c.id === id ? { ...c, text, pending: false } : c)));
  }, []);

  /** Tier 1/2 of turn-taking; tiers 3 (time limit) and 4 (button) live in listenForAnswer. */
  const getDetector = useCallback((): SpeechDetector => {
    if (detector.current?.failed() && mic.current) {
      const reason = "Stopped working during the session";
      setTurnsStatus((s) => ({ ...s, active: "energy", failures: [...s.failures, { id: detector.current!.id, reason }] }));
      detector.current.destroy();
      detector.current = createEnergyDetector(mic.current);
    }
    return detector.current!;
  }, []);

  const release = useCallback(() => {
    // Settle the listener now, before its detector and mic go away.
    listenHandle.current?.cancel();
    listenHandle.current = null;
    followAbort.current?.abort();
    followAbort.current = null;
    chooser.current.dispose();
    chooser.current = scriptChooser;
    detector.current?.destroy();
    detector.current = null;
    mic.current?.close();
    mic.current = null;
    stopStream(micStream.current);
    micStream.current = null;
    voice.current?.dispose();
    voice.current = null;
    stt.current?.dispose();
    stt.current = null;
  }, []);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      cancelled.current = true;
      prepDone.current?.();
      release();
    };
  }, [release]);

  /** Step 1: microphone, then load every job's tiers (with fallbacks). */
  const prepare = useCallback(
    async (chosen: LiveOptions) => {
      options.current = chosen;
      setPhase("loading");
      setError("");
      const capabilities = caps ?? (await detectCapabilities());
      if (!alive.current) return;
      setCaps(capabilities);
      let stream: MediaStream;
      try {
        stream = await openMicrophone();
      } catch {
        if (!alive.current) return;
        setError("We couldn't use your microphone. Allow microphone access for this site, or choose another way to practise.");
        setPhase("error");
        return;
      }
      // Permission granted after the student left: release it straight away.
      if (!alive.current) {
        stopStream(stream);
        return;
      }
      micStream.current = stream;
      mic.current = new MicCapture(stream);
      await mic.current.resume();
      if (!alive.current) return release();

      // Examiner voice (needs to be ready before starting).
      voice.current = new VoiceChain(tierOrder("voice", capabilities), capabilities.webgpu, setVoiceStatus);
      const voiceReady = voice.current.start();

      // Speech recognition loads in the background; answers before it's
      // ready are judged on timing alone.
      stt.current = new SttChain(tierOrder("stt", capabilities), capabilities.webgpu, chosen.allowCloudRecognition, setSttStatus);
      void stt.current.start();

      // Turn-taking: Silero VAD, else the energy detector.
      const turnOrder = tierOrder("turns", capabilities);
      if (turnOrder[0] === "silero" && !disabledTiers().has("silero")) {
        setTurnsStatus({ active: null, loading: "silero", failures: [] });
        try {
          const silero = await withTimeout(createSileroDetector(stream), 30000, "Silero VAD");
          if (!alive.current) {
            silero.destroy();
            return release();
          }
          detector.current = silero;
          setTurnsStatus({ active: "silero", loading: null, failures: [] });
        } catch (err) {
          if (!alive.current) return release();
          const energyOff = disabledTiers().has("energy");
          detector.current = energyOff ? createTimeLimitDetector() : createEnergyDetector(mic.current);
          setTurnsStatus({
            active: energyOff ? "time-limit" : "energy",
            loading: null,
            failures: [{ id: "silero", reason: err instanceof Error ? err.message : String(err) }],
          });
        }
      } else if (!disabledTiers().has("energy")) {
        detector.current = createEnergyDetector(mic.current);
        setTurnsStatus({ active: "energy", loading: null, failures: [] });
      } else {
        // Both detectors switched off in the Speech lab: answers end at their
        // time limit or with the "I've finished" button.
        detector.current = createTimeLimitDetector();
        setTurnsStatus({ active: "time-limit", loading: null, failures: [] });
      }

      // Optional follow-up models (opt-in, WebGPU only).
      const followOrder = tierOrder("followups", capabilities);
      if (chosen.enhancedFollowUps && followOrder.length > 1) {
        const abort = new AbortController();
        followAbort.current = abort;
        void loadFollowUpChooser(followOrder, setFollowStatus, abort.signal).then((c) => {
          if (abort.signal.aborted) return c.dispose();
          chooser.current.dispose();
          chooser.current = c;
        });
      } else {
        setFollowStatus({ active: "script", loading: null, progress: null, failures: [] });
      }

      phrases.current = await loadPhrases();
      await voiceReady;
      if (!alive.current) release();
    },
    [caps, release],
  );

  /** Use a lighter voice now instead of waiting for a download. */
  const skipVoiceTo = useCallback(async (id: TierId) => {
    await voice.current?.skipTo(id);
  }, []);

  const requestFinishAnswer = useCallback(() => listenHandle.current?.finish(), []);

  const requestAskAgain = useCallback(() => {
    askAgainRequested.current = true;
    listenHandle.current?.finish();
  }, []);

  const finishPreparation = useCallback(() => prepDone.current?.(), []);

  /** Step 2: run the examiner. */
  const start = useCallback(async () => {
    if (!mic.current || !voice.current || !stt.current || !phrases.current) return;
    setPhase("running");
    setStartedAt(Date.now());
    cancelled.current = false;
    const turnsByPrompt = new Map<string, LocalTurn[]>();
    const pendingTranscripts = new Map<LocalTurn, Promise<void>>();
    const allTurns: LocalTurn[] = [];
    const saves: Promise<void>[] = [];
    const saved = new Set<string>();

    const savePrompt = (promptId: string) => {
      if (saved.has(promptId)) return;
      saved.add(promptId);
      const turns = turnsByPrompt.get(promptId) ?? [];
      const save = (async () => {
        // Give background transcriptions a fair chance to finish first.
        await Promise.all(turns.map((t) => pendingTranscripts.get(t) ?? Promise.resolve()));
        const spoken = turns.filter((t) => t.endedBy !== "no_speech");
        const models = spoken.map((t) => t.sttModel).filter(Boolean) as string[];
        const transcriptText = spoken
          .map((t) => t.transcript)
          .filter((t): t is string => Boolean(t))
          .join("\n");
        onAnswer(promptId, {
          response_mode: "live",
          duration_seconds: Math.round(spoken.reduce((sum, t) => sum + t.durationSeconds, 0) * 10) / 10,
          text_response: null,
          completed: spoken.length > 0,
          save_transcript: options.current.saveTranscript,
          transcript: transcriptText || null,
          stt_model: models[0] ?? null,
          turns: turns.slice(0, 20).map((t) => ({
            kind: t.kind,
            text: t.question.slice(0, 500),
            duration_seconds: Math.round(t.durationSeconds * 10) / 10,
            long_pauses: t.longPauses,
            ended_by: t.endedBy,
            transcript: t.transcript ? t.transcript.slice(0, 5000) : null,
            stt_model: t.sttModel,
          })),
        });
      })();
      saves.push(save);
    };

    const script = examinerScript(toScriptPrompts(sections, answered), phrases.current, {
      seed: seedFrom(attemptId),
      now: () => performance.now() / 1000,
      chooseFollowUp: (request, fallback) => chooser.current.choose(request, fallback),
      // No introduction again when resuming after a refresh.
      warmUp: answered.size === 0,
    });

    const say = async (text: string, audioUrl: string | null) => {
      addCaption("examiner", text);
      setActivity("speaking");
      await voice.current?.say(text, audioUrl);
      setActivity("idle");
    };

    try {
      let result = await script.next();
      while (!result.done && !cancelled.current) {
        const step: Step = result.value;
        if (step.kind === "part") {
          setPart(step.part);
          if (step.part !== 2) setCueCard(null);
          result = await script.next();
        } else if (step.kind === "say") {
          await say(step.text, step.audioUrl);
          result = await script.next();
        } else if (step.kind === "cue_card") {
          setActivity("preparing");
          setCueCard({ prompt: step.prompt, bullets: step.bullets, prepSeconds: step.prepSeconds, prepLeft: step.prepSeconds, preparing: true });
          await new Promise<void>((resolve) => {
            const began = Date.now();
            const timer = setInterval(() => {
              const left = Math.max(0, step.prepSeconds - Math.floor((Date.now() - began) / 1000));
              setCueCard((card) => (card ? { ...card, prepLeft: left } : card));
              if (left <= 0) done();
            }, 250);
            const done = () => {
              clearInterval(timer);
              prepDone.current = null;
              resolve();
            };
            prepDone.current = done;
          });
          setCueCard((card) => (card ? { ...card, preparing: false } : card));
          setActivity("idle");
          result = await script.next();
        } else if (step.kind === "listen") {
          // Let the examiner's voice fade before listening (no echo).
          await new Promise((resolve) => setTimeout(resolve, 250));
          if (!alive.current) return;
          let listened = null as Awaited<ListenHandle["result"]> | null;
          for (;;) {
            askAgainRequested.current = false;
            setActivity("listening");
            setListenInfo({ maxSeconds: step.maxSeconds, canAskAgain: mode === "practice" });
            stt.current?.beginTurn();
            const handle = listenForAnswer(mic.current!, getDetector, step);
            listenHandle.current = handle;
            listened = await handle.result;
            // Closed mid-answer: everything is released; stop quietly.
            if (!alive.current) return;
            listenHandle.current = null;
            setListenInfo(null);
            if (askAgainRequested.current && mode === "practice") {
              // Practice only: discard this answer and hear the question again.
              await stt.current?.transcribe(listened.audio).catch(() => null);
              await say(step.question, null);
              if (!alive.current) return;
              continue;
            }
            break;
          }
          setActivity("thinking");

          const turn: LocalTurn = {
            part: step.part,
            kind: step.turn,
            durationSeconds: listened.speechSeconds,
            longPauses: listened.longPauses,
            endedBy: listened.endedBy,
            transcript: null,
            promptId: step.promptId,
            question: step.question,
            sttModel: null,
            audioUrl: listened.audio.length ? URL.createObjectURL(encodeWav(listened.audio, STT_SAMPLE_RATE)) : null,
          };
          allTurns.push(turn);
          if (step.promptId) turnsByPrompt.set(step.promptId, [...(turnsByPrompt.get(step.promptId) ?? []), turn]);

          const captionKey =
            listened.endedBy === "no_speech" ? null : addCaption("you", `(answer recorded, ${Math.round(listened.speechSeconds)}s)`, true);
          const transcription = (listened.endedBy === "no_speech" ? Promise.resolve(null) : stt.current!.transcribe(listened.audio)).then(
            (out) => {
              if (out) {
                turn.transcript = out.text;
                turn.sttModel = out.model;
              }
              if (captionKey != null) {
                updateCaption(captionKey, out?.text ? out.text : `(answer recorded, ${Math.round(listened!.speechSeconds)}s, no transcript)`);
              }
            },
          );
          pendingTranscripts.set(turn, transcription);
          // The script reacts to the words only if they arrive quickly;
          // otherwise it decides on timing and the transcript fills in later.
          await Promise.race([transcription, new Promise((resolve) => setTimeout(resolve, TRANSCRIPT_WAIT_MS))]);
          const answer: Answer = { endedBy: listened.endedBy, speechSeconds: listened.speechSeconds, transcript: turn.transcript };
          result = await script.next(answer);
        } else if (step.kind === "prompt_done") {
          savePrompt(step.promptId);
          result = await script.next();
        } else {
          result = await script.next();
        }
      }
    } catch (err) {
      if (!alive.current) return;
      setError(err instanceof Error ? err.message : String(err));
    }
    // Left the page (not "End test"): never save or submit after closing.
    if (!alive.current) return;

    setActivity("idle");
    setPhase("saving");
    // A prompt the session ended in the middle of still gets saved.
    for (const promptId of turnsByPrompt.keys()) savePrompt(promptId);
    await Promise.all(saves);
    await Promise.all([...pendingTranscripts.values()]);
    saveLocalSession(attemptId, {
      turns: allTurns,
      models: {
        stt: stt.current?.active() ?? null,
        voice: voice.current?.active() ?? null,
        turns: detector.current?.id ?? null,
        followups: chooser.current.id,
      },
    });
    release();
    setPhase("finished");
    onFinish();
  }, [addCaption, answered, attemptId, getDetector, mode, onAnswer, onFinish, release, sections, updateCaption]);

  const voiceLevel = useCallback(() => voice.current?.level() ?? 0, []);
  const listenProgress = useCallback(() => listenHandle.current?.progress() ?? null, []);
  const micCapture = useCallback(() => mic.current, []);

  /** Ends the test early (asked to confirm in the UI). */
  const endEarly = useCallback(() => {
    cancelled.current = true;
    voice.current?.stop();
    listenHandle.current?.finish();
    prepDone.current?.();
  }, []);

  return {
    phase,
    error,
    caps,
    sttStatus,
    voiceStatus,
    turnsStatus,
    followStatus,
    activity,
    part,
    captions,
    cueCard,
    listenInfo,
    startedAt,
    prepare,
    start,
    skipVoiceTo,
    requestFinishAnswer,
    requestAskAgain,
    finishPreparation,
    endEarly,
    voiceLevel,
    listenProgress,
    micCapture,
  };
}
