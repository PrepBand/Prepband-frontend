/**
 * Phase 5 model catalog (FR-LIVE-05/06): every AI job the live examiner
 * does has exactly four tiers, one main model and three fallbacks, all
 * free and open. The session never depends on any single tier; the last
 * tier of every job needs no download at all.
 *
 * Sizes are approximate first-download sizes; browsers cache them after.
 */

export type JobId = "stt" | "voice" | "turns" | "followups";

export type TierId =
  // Hearing the student (speech-to-text)
  | "whisper"
  | "moonshine"
  | "vosk"
  | "webspeech"
  // The examiner's voice (text-to-speech)
  | "kokoro"
  | "piper"
  | "browser-voice"
  | "captions"
  // Knowing when the student has finished (turn-taking)
  | "silero"
  | "energy"
  | "time-limit"
  | "button"
  // Choosing the next follow-up
  | "script"
  | "qwen"
  | "smollm"
  | "llama";

export type Tier = {
  id: TierId;
  job: JobId;
  rank: 1 | 2 | 3 | 4;
  name: string;
  detail: string;
  licence: string;
  downloadMb: number;
  /** Runs entirely on the student's device. */
  onDevice: boolean;
};

export const TIERS: Tier[] = [
  { id: "whisper", job: "stt", rank: 1, name: "Whisper base.en", detail: "OpenAI's open speech model, via Transformers.js", licence: "MIT", downloadMb: 80, onDevice: true },
  { id: "moonshine", job: "stt", rank: 2, name: "Moonshine base", detail: "Fast open model built for short spoken answers", licence: "MIT", downloadMb: 65, onDevice: true },
  { id: "vosk", job: "stt", rank: 3, name: "Vosk small English", detail: "Lightweight Kaldi recogniser (WASM)", licence: "Apache-2.0", downloadMb: 41, onDevice: true },
  { id: "webspeech", job: "stt", rank: 4, name: "Browser speech recognition", detail: "Built into the browser. Chrome and Edge send the audio to Google or Microsoft", licence: "Browser built-in", downloadMb: 0, onDevice: false },

  { id: "kokoro", job: "voice", rank: 1, name: "Kokoro-82M", detail: "Natural open voice model (British English voice)", licence: "Apache-2.0", downloadMb: 92, onDevice: true },
  { id: "piper", job: "voice", rank: 2, name: "Piper", detail: "Fast open voice model (British English voice)", licence: "MIT", downloadMb: 63, onDevice: true },
  { id: "browser-voice", job: "voice", rank: 3, name: "Browser voice", detail: "The browser's built-in speech synthesis", licence: "Browser built-in", downloadMb: 0, onDevice: true },
  { id: "captions", job: "voice", rank: 4, name: "Captions only", detail: "The examiner's words on screen, with reading time", licence: "-", downloadMb: 0, onDevice: true },

  { id: "silero", job: "turns", rank: 1, name: "Silero VAD", detail: "Open voice-activity model, notices when you stop talking", licence: "MIT", downloadMb: 2, onDevice: true },
  { id: "energy", job: "turns", rank: 2, name: "Silence detector", detail: "Measures your microphone level instead of using a model", licence: "-", downloadMb: 0, onDevice: true },
  { id: "time-limit", job: "turns", rank: 3, name: "Answer time limit", detail: "Moves on when the answer's time is up", licence: "-", downloadMb: 0, onDevice: true },
  { id: "button", job: "turns", rank: 4, name: "“I’ve finished” button", detail: "Always on screen", licence: "-", downloadMb: 0, onDevice: true },

  { id: "qwen", job: "followups", rank: 1, name: "Qwen2.5 1.5B Instruct", detail: "Small open language model (WebLLM, needs WebGPU)", licence: "Apache-2.0", downloadMb: 1630, onDevice: true },
  { id: "smollm", job: "followups", rank: 2, name: "SmolLM2 1.7B Instruct", detail: "Small open language model (WebLLM, needs WebGPU)", licence: "Apache-2.0", downloadMb: 1775, onDevice: true },
  { id: "llama", job: "followups", rank: 3, name: "Llama 3.2 1B Instruct", detail: "Small open language model (WebLLM, needs WebGPU)", licence: "Llama 3.2 Community", downloadMb: 880, onDevice: true },
  { id: "script", job: "followups", rank: 4, name: "Examiner script", detail: "Picks follow-ups by rule from the questions admins wrote", licence: "-", downloadMb: 0, onDevice: true },
];

export const JOB_LABEL: Record<JobId, string> = {
  stt: "Hearing you",
  voice: "Examiner voice",
  turns: "Knowing when you've finished",
  followups: "Choosing follow-up questions",
};

export function tiersFor(job: JobId): Tier[] {
  return TIERS.filter((tier) => tier.job === job).sort((a, b) => a.rank - b.rank);
}

export function tierById(id: TierId): Tier {
  return TIERS.find((tier) => tier.id === id)!;
}

// --- model locations ------------------------------------------------------

export const MODEL_IDS = {
  whisper: "onnx-community/whisper-base.en",
  moonshine: "onnx-community/moonshine-base-ONNX",
  kokoro: "onnx-community/Kokoro-82M-v1.0-ONNX",
  kokoroVoice: "bf_emma",
  piperVoice: "en_GB-alba-medium",
  qwen: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
  smollm: "SmolLM2-1.7B-Instruct-q4f16_1-MLC",
  llama: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
} as const;

/** Vosk's model is a 41 MB archive; override with VITE_VOSK_MODEL_URL to self-host it. */
export const VOSK_MODEL_URL =
  (import.meta.env.VITE_VOSK_MODEL_URL as string | undefined) ??
  "https://ccoreilly.github.io/vosk-browser/models/vosk-model-small-en-us-0.15.tar.gz";

/** Silero VAD's model and worklet, and the ONNX runtime it uses, version-pinned. */
export const VAD_ASSET_BASE = "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.31/dist/";
export const ORT_WASM_BASE = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/";
