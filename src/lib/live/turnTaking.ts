/**
 * Turn-taking (FR-LIVE-02): knowing when the student has finished.
 *
 *   1. Silero VAD   - open voice-activity model (MIT), in the browser
 *   2. Energy       - mic level against an adaptive noise floor
 *   3. Time limit   - every answer has a maximum length
 *   4. Button       - "I've finished", always on screen
 *
 * Tiers 3 and 4 are always active underneath tiers 1/2, so a turn always
 * ends even if both detectors fail.
 */

import { ORT_WASM_BASE, VAD_ASSET_BASE } from "./catalog";
import { resample, rms, STT_SAMPLE_RATE, type MicCapture } from "./audio";

export interface SpeechDetector {
  readonly id: "silero" | "energy" | "time-limit";
  isSpeaking(): boolean;
  /** True once the detector has failed and should be replaced. */
  failed(): boolean;
  destroy(): void;
}

/** Silero VAD via @ricky0123/vad-web, sharing our mic stream. */
export async function createSileroDetector(stream: MediaStream): Promise<SpeechDetector> {
  const { MicVAD } = await import("@ricky0123/vad-web");
  let speaking = false;
  const vad = await MicVAD.new({
    model: "v5",
    baseAssetPath: VAD_ASSET_BASE,
    onnxWASMBasePath: ORT_WASM_BASE,
    getStream: async () => stream,
    // Never stop the shared stream's tracks.
    pauseStream: async () => undefined,
    resumeStream: async (s: MediaStream) => s,
    positiveSpeechThreshold: 0.5,
    negativeSpeechThreshold: 0.35,
    redemptionMs: 450,
    minSpeechMs: 200,
    preSpeechPadMs: 150,
    startOnLoad: true,
    onSpeechStart: () => {
      speaking = true;
    },
    onSpeechEnd: () => {
      speaking = false;
    },
    onVADMisfire: () => {
      speaking = false;
    },
  });
  return {
    id: "silero",
    isSpeaking: () => speaking,
    failed: () => Boolean(vad.errored),
    destroy: () => void vad.destroy(),
  };
}

/** Fallback: speech = mic level well above a slowly adapting noise floor. */
export function createEnergyDetector(mic: MicCapture): SpeechDetector {
  let floor = 0.01;
  let speaking = false;
  let loudFrames = 0;
  let quietSince = 0;
  const unsubscribe = mic.onFrame((level) => {
    // The floor follows quiet levels quickly and loud ones very slowly.
    floor = level < floor ? floor * 0.8 + level * 0.2 : floor * 0.998 + level * 0.002;
    const threshold = Math.max(0.012, floor * 2.8);
    const now = performance.now();
    if (level > threshold) {
      loudFrames += 1;
      quietSince = 0;
      if (loudFrames >= 2) speaking = true;
    } else {
      loudFrames = 0;
      if (!quietSince) quietSince = now;
      if (speaking && now - quietSince > 350) speaking = false;
    }
  });
  return { id: "energy", isSpeaking: () => speaking, failed: () => false, destroy: unsubscribe };
}

/**
 * Tier 3 (time limit): no silence detection at all. Reports "speaking" the
 * whole time, so an answer ends only at its time limit or when the student
 * presses "I've finished" (tier 4, always on screen).
 */
export function createTimeLimitDetector(): SpeechDetector {
  return { id: "time-limit", isSpeaking: () => true, failed: () => false, destroy: () => undefined };
}

// --- one answer --------------------------------------------------------------

export type EndedBy = "silence" | "time" | "button" | "no_speech";

export type ListenOptions = {
  /** Hard limit for the answer (tier 3). */
  maxSeconds: number;
  /** How long a silence after speech counts as "finished". */
  endSilenceSeconds: number;
  /** Give up if the student hasn't started after this long. */
  noSpeechSeconds: number;
};

export type ListenResult = {
  /** 16 kHz mono, trimmed to the spoken part. */
  audio: Float32Array;
  speechSeconds: number;
  totalSeconds: number;
  endedBy: EndedBy;
  longPauses: number;
};

export type ListenHandle = {
  result: Promise<ListenResult>;
  /** Tier 4: the student pressed "I've finished". */
  finish: () => void;
  /** Stops listening right now (the session is closing): no more detector
   * calls after this returns. */
  cancel: () => void;
  /** Elapsed/remaining info for the UI. */
  progress: () => { elapsed: number; speaking: boolean; started: boolean };
};

const LONG_PAUSE_SECONDS = 1.5;

/** Trims leading and trailing near-silence (keeps 0.3 s of padding). */
export function trimSilence(audio: Float32Array, sampleRate: number): Float32Array {
  const frame = Math.floor(sampleRate * 0.03);
  const threshold = 0.008;
  let first = -1;
  let last = -1;
  for (let i = 0; i + frame <= audio.length; i += frame) {
    if (rms(audio.subarray(i, i + frame)) > threshold) {
      if (first < 0) first = i;
      last = i + frame;
    }
  }
  if (first < 0) return new Float32Array(0);
  const pad = Math.floor(sampleRate * 0.3);
  return audio.slice(Math.max(0, first - pad), Math.min(audio.length, last + pad));
}

export function listenForAnswer(mic: MicCapture, getDetector: () => SpeechDetector, options: ListenOptions): ListenHandle {
  const startedAt = performance.now();
  let firstSpeechAt: number | null = null;
  let lastSpeechAt: number | null = null;
  let silenceStartedAt: number | null = null;
  let longPauses = 0;
  let speakingNow = false;
  let finishRequested = false;
  let settled = false;
  let settleNow: () => void = () => {};

  mic.startRecording();

  const result = new Promise<ListenResult>((resolve) => {
    const settle = (endedBy: EndedBy) => {
      if (settled) return;
      settled = true;
      clearInterval(timer);
      const raw = mic.stopRecording();
      const audio = trimSilence(resample(raw, mic.sampleRate), STT_SAMPLE_RATE);
      const end = performance.now();
      const speechEnd = speakingNow ? end : lastSpeechAt ?? end;
      resolve({
        audio: endedBy === "no_speech" ? new Float32Array(0) : audio,
        speechSeconds: firstSpeechAt == null ? 0 : Math.max(0, (speechEnd - firstSpeechAt) / 1000),
        totalSeconds: (end - startedAt) / 1000,
        endedBy: firstSpeechAt == null && endedBy !== "button" ? "no_speech" : endedBy,
        longPauses,
      });
    };
    settleNow = () => settle("button");

    const timer = setInterval(() => {
      const now = performance.now();
      const elapsed = (now - startedAt) / 1000;
      speakingNow = getDetector().isSpeaking();

      if (speakingNow) {
        if (firstSpeechAt == null) firstSpeechAt = now;
        if (silenceStartedAt != null && firstSpeechAt != null && (now - silenceStartedAt) / 1000 >= LONG_PAUSE_SECONDS) {
          longPauses += 1;
        }
        silenceStartedAt = null;
        lastSpeechAt = now;
      } else if (firstSpeechAt != null && silenceStartedAt == null) {
        silenceStartedAt = now;
      }

      if (finishRequested) return settle("button");
      if (elapsed >= options.maxSeconds) return settle("time");
      if (firstSpeechAt == null && elapsed >= options.noSpeechSeconds) return settle("no_speech");
      if (firstSpeechAt != null && silenceStartedAt != null && (now - silenceStartedAt) / 1000 >= options.endSilenceSeconds) {
        return settle("silence");
      }
    }, 100);
  });

  return {
    result,
    finish: () => {
      finishRequested = true;
    },
    cancel: () => settleNow(),
    progress: () => ({ elapsed: (performance.now() - startedAt) / 1000, speaking: speakingNow, started: firstSpeechAt != null }),
  };
}
