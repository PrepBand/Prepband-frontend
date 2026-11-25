import { tiersFor, type JobId, type TierId } from "./catalog";

/**
 * What this device can run, and which order to try the tiers in.
 * The main model stays first except where it is known to be too heavy
 * (no WebGPU on a low-memory or mobile device, where Moonshine is much
 * faster than Whisper), matching the Phase 5 "device check first" rule.
 */

export type Capabilities = {
  webgpu: boolean;
  memoryGb: number | null;
  mobile: boolean;
  mediaDevices: boolean;
  speechSynthesis: boolean;
  speechRecognition: boolean;
  audioWorklet: boolean;
};

type GpuNavigator = Navigator & {
  gpu?: { requestAdapter: () => Promise<unknown | null> };
  deviceMemory?: number;
};

export async function detectCapabilities(): Promise<Capabilities> {
  const nav = navigator as GpuNavigator;
  let webgpu = false;
  try {
    webgpu = Boolean(nav.gpu && (await nav.gpu.requestAdapter()));
  } catch {
    webgpu = false;
  }
  const w = window as unknown as Record<string, unknown>;
  return {
    webgpu,
    memoryGb: typeof nav.deviceMemory === "number" ? nav.deviceMemory : null,
    mobile: /Mobi|Android|iPhone|iPad/i.test(nav.userAgent),
    mediaDevices: Boolean(nav.mediaDevices?.getUserMedia),
    speechSynthesis: "speechSynthesis" in window,
    speechRecognition: Boolean(w.SpeechRecognition || w.webkitSpeechRecognition),
    audioWorklet: typeof AudioWorkletNode !== "undefined",
  };
}

// --- forced fallbacks (QA, FR-LIVE-05 exit test) ----------------------------

const DISABLED_KEY = "prepband.live.disabledTiers";

/** Tiers switched off on this browser from the admin Speech lab, to test fallbacks. */
export function disabledTiers(): Set<TierId> {
  try {
    const raw = window.localStorage.getItem(DISABLED_KEY);
    return new Set(raw ? (JSON.parse(raw) as TierId[]) : []);
  } catch {
    return new Set();
  }
}

export function setDisabledTiers(ids: TierId[]): void {
  window.localStorage.setItem(DISABLED_KEY, JSON.stringify(ids));
}

/** The order to try a job's tiers in on this device, minus disabled ones. */
export function tierOrder(job: JobId, caps: Capabilities): TierId[] {
  let ids = tiersFor(job).map((tier) => tier.id);
  const lowEnd = !caps.webgpu && (caps.mobile || (caps.memoryGb != null && caps.memoryGb <= 4));
  if (job === "stt" && lowEnd) ids = ["moonshine", "whisper", "vosk", "webspeech"];
  if (job === "voice" && lowEnd) ids = ["piper", "kokoro", "browser-voice", "captions"];
  // The language models need WebGPU; without it, follow-ups come from the script.
  if (job === "followups" && !caps.webgpu) ids = ["script"];
  const off = disabledTiers();
  // The last tier of every job is a safety net and can't be switched off.
  const safetyNet = ids[ids.length - 1];
  return ids.filter((id) => id === safetyNet || !off.has(id));
}

/**
 * Model downloads: fail when progress *stalls*, not when it's merely slow.
 * A 90 MB model on a slow connection can take many minutes and still be
 * the best choice; a download that stops reporting progress is stuck.
 * `run` receives a `touch` callback to call on every progress report.
 */
export function withStallTimeout<T>(
  run: (touch: () => void) => Promise<T>,
  stallMs: number,
  maxMs: number,
  what: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let stallTimer: ReturnType<typeof setTimeout>;
    const fail = (message: string) => {
      clearTimeout(stallTimer);
      clearTimeout(maxTimer);
      reject(new Error(message));
    };
    const touch = () => {
      clearTimeout(stallTimer);
      stallTimer = setTimeout(() => fail(`${what} stopped making progress`), stallMs);
    };
    const maxTimer = setTimeout(() => fail(`${what} took longer than ${Math.round(maxMs / 60000)} minutes`), maxMs);
    touch();
    run(touch).then(
      (value) => {
        clearTimeout(stallTimer);
        clearTimeout(maxTimer);
        resolve(value);
      },
      (error) => {
        clearTimeout(stallTimer);
        clearTimeout(maxTimer);
        reject(error);
      },
    );
  });
}

/** Rejects after `ms` so a stuck model load or inference moves to the next tier. */
export function withTimeout<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${what} timed out after ${Math.round(ms / 1000)}s`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
