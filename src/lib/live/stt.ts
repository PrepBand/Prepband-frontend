/**
 * Hearing the student (FR-LIVE-01/05): four speech-to-text tiers.
 *
 *   1. Whisper base.en   (Transformers.js, worker)
 *   2. Moonshine base    (Transformers.js, worker)
 *   3. Vosk small-en     (vosk-browser, its own worker)
 *   4. Browser speech recognition - only with explicit consent, because
 *      Chrome and Edge send the audio to Google/Microsoft (FR-LIVE-07)
 *
 * If every tier fails, the examiner still works: answers are judged by
 * timing alone and nothing is transcribed.
 */

import { MODEL_IDS, VOSK_MODEL_URL, type TierId } from "./catalog";
import { withStallTimeout, withTimeout } from "./capabilities";
import { STT_SAMPLE_RATE } from "./audio";

export type SttProgress = (fraction: number | null, note?: string) => void;

export interface SttEngine {
  readonly id: TierId;
  load(onProgress: SttProgress): Promise<void>;
  /** Called when the student starts answering (only browser recognition needs it). */
  beginTurn(): void;
  transcribe(audio: Float32Array): Promise<string>;
  dispose(): void;
}

// --- Whisper / Moonshine (worker) ---------------------------------------------

class TransformersEngine implements SttEngine {
  private worker: Worker | null = null;
  private nextId = 1;
  private pending = new Map<number, { resolve: (text: string) => void; reject: (error: Error) => void }>();

  constructor(
    readonly id: "whisper" | "moonshine",
    private readonly webgpu: boolean,
  ) {}

  load(onProgress: SttProgress): Promise<void> {
    this.worker = new Worker(new URL("./workers/asr.worker.ts", import.meta.url), { type: "module" });
    const files = new Map<string, number>();
    return new Promise<void>((resolve, reject) => {
      this.worker!.onerror = (event) => reject(new Error(event.message || "Speech worker failed to start"));
      this.worker!.onmessage = (event: MessageEvent) => {
        const data = event.data;
        if (data.type === "progress") {
          files.set(data.file ?? "", data.progress);
          const values = [...files.values()];
          onProgress(values.reduce((a, b) => a + b, 0) / values.length / 100);
        } else if (data.type === "ready") {
          this.worker!.onmessage = (e: MessageEvent) => this.handleResult(e.data);
          resolve();
        } else if (data.type === "error") {
          reject(new Error(data.error));
        }
      };
      this.worker!.postMessage({
        type: "load",
        model: this.id === "whisper" ? MODEL_IDS.whisper : MODEL_IDS.moonshine,
        device: this.webgpu ? "webgpu" : "wasm",
      });
    });
  }

  private handleResult(data: { type: string; id: number; text?: string; error?: string }) {
    if (data.type !== "result") return;
    const entry = this.pending.get(data.id);
    if (!entry) return;
    this.pending.delete(data.id);
    if (data.error) entry.reject(new Error(data.error));
    else entry.resolve(data.text ?? "");
  }

  beginTurn(): void {}

  transcribe(audio: Float32Array): Promise<string> {
    if (!this.worker) return Promise.reject(new Error("Not loaded"));
    const id = this.nextId++;
    return new Promise<string>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      const copy = audio.slice();
      this.worker!.postMessage({ type: "transcribe", id, audio: copy }, [copy.buffer]);
    });
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    this.pending.forEach((entry) => entry.reject(new Error("Disposed")));
    this.pending.clear();
  }
}

// --- Vosk ------------------------------------------------------------------------

type VoskModel = Awaited<ReturnType<typeof import("vosk-browser")["createModel"]>>;

class VoskEngine implements SttEngine {
  readonly id = "vosk" as const;
  private model: VoskModel | null = null;

  async load(onProgress: SttProgress): Promise<void> {
    onProgress(null, "Downloading the Vosk model (about 41 MB)");
    // vosk-browser reports no download progress: keep the stall timer alive
    // (the overall cap still applies).
    const heartbeat = setInterval(() => onProgress(null, "Downloading the Vosk model (about 41 MB)"), 10000);
    try {
      const { createModel } = await import("vosk-browser");
      this.model = await createModel(VOSK_MODEL_URL);
    } finally {
      clearInterval(heartbeat);
    }
  }

  beginTurn(): void {}

  transcribe(audio: Float32Array): Promise<string> {
    const model = this.model;
    if (!model) return Promise.reject(new Error("Not loaded"));
    return new Promise<string>((resolve) => {
      const recognizer = new model.KaldiRecognizer(STT_SAMPLE_RATE);
      const parts: string[] = [];
      let finalRequested = false;
      let idleTimer: ReturnType<typeof setTimeout> | null = null;
      const finish = () => {
        recognizer.remove();
        resolve(parts.join(" ").replace(/\s+/g, " ").trim());
      };
      recognizer.on("result", (message) => {
        const text = "result" in message ? (message.result as { text?: string }).text : "";
        if (text) parts.push(text);
        // Results arrive in order; the last one follows retrieveFinalResult.
        if (finalRequested) {
          if (idleTimer) clearTimeout(idleTimer);
          idleTimer = setTimeout(finish, 250);
        }
      });
      const chunk = STT_SAMPLE_RATE / 2;
      for (let i = 0; i < audio.length; i += chunk) {
        recognizer.acceptWaveformFloat(audio.slice(i, i + chunk), STT_SAMPLE_RATE);
      }
      finalRequested = true;
      recognizer.retrieveFinalResult();
      // Silence can produce no final event at all; don't wait forever.
      idleTimer = setTimeout(finish, 2500);
    });
  }

  dispose(): void {
    this.model?.terminate();
    this.model = null;
  }
}

// --- Browser speech recognition -----------------------------------------------------

type RecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

class WebSpeechEngine implements SttEngine {
  readonly id = "webspeech" as const;
  private recognition: RecognitionLike | null = null;
  private finals: string[] = [];
  private ended: Promise<void> = Promise.resolve();

  async load(): Promise<void> {
    const w = window as unknown as Record<string, new () => RecognitionLike>;
    if (!(w.SpeechRecognition || w.webkitSpeechRecognition)) throw new Error("This browser has no speech recognition");
  }

  beginTurn(): void {
    const w = window as unknown as Record<string, new () => RecognitionLike>;
    const Recognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    const recognition = new Recognition();
    recognition.lang = "en-GB";
    recognition.continuous = true;
    recognition.interimResults = false;
    this.finals = [];
    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        if (event.results[i].isFinal) this.finals.push(event.results[i][0].transcript);
      }
    };
    this.ended = new Promise<void>((resolve) => {
      recognition.onend = () => resolve();
      recognition.onerror = () => resolve();
    });
    this.recognition = recognition;
    try {
      recognition.start();
    } catch {
      this.recognition = null;
    }
  }

  async transcribe(): Promise<string> {
    if (!this.recognition) throw new Error("Recognition did not start");
    this.recognition.stop();
    await withTimeout(this.ended, 3000, "Browser speech recognition").catch(() => undefined);
    this.recognition = null;
    return this.finals.join(" ").trim();
  }

  dispose(): void {
    try {
      this.recognition?.stop();
    } catch {
      /* already stopped */
    }
    this.recognition = null;
  }
}

export function createSttEngine(id: TierId, webgpu: boolean): SttEngine {
  if (id === "whisper" || id === "moonshine") return new TransformersEngine(id, webgpu);
  if (id === "vosk") return new VoskEngine();
  return new WebSpeechEngine();
}

// --- the chain ----------------------------------------------------------------------

export type SttStatus = {
  active: TierId | null;
  loading: TierId | null;
  progress: number | null;
  note?: string;
  failures: { id: TierId; reason: string }[];
};

// Slow downloads are fine; stuck ones aren't (see withStallTimeout).
const LOAD_STALL_MS = 2 * 60 * 1000;
const LOAD_MAX_MS = 15 * 60 * 1000;

export class SttChain {
  private index = 0;
  private engine: SttEngine | null = null;
  private status: SttStatus = { active: null, loading: null, progress: null, failures: [] };
  private loadingPromise: Promise<void> | null = null;

  constructor(
    private readonly order: TierId[],
    private readonly webgpu: boolean,
    private readonly allowCloud: boolean,
    private readonly onStatus: (status: SttStatus) => void,
  ) {}

  /** Loads tiers in order until one works. Resolves either way. */
  start(): Promise<void> {
    if (!this.loadingPromise) this.loadingPromise = this.loadFrom(this.index);
    return this.loadingPromise;
  }

  private emit(update: Partial<SttStatus>) {
    this.status = { ...this.status, ...update };
    this.onStatus(this.status);
  }

  private async loadFrom(start: number): Promise<void> {
    for (let i = start; i < this.order.length; i += 1) {
      const id = this.order[i];
      if (id === "webspeech" && !this.allowCloud) {
        this.emit({ failures: [...this.status.failures, { id, reason: "Not allowed: it would send your audio to another company" }] });
        continue;
      }
      const engine = createSttEngine(id, this.webgpu);
      this.emit({ loading: id, progress: 0, note: undefined });
      try {
        await withStallTimeout(
          (touch) =>
            engine.load((progress, note) => {
              touch();
              this.emit({ progress, note });
            }),
          LOAD_STALL_MS,
          LOAD_MAX_MS,
          "Loading",
        );
        this.index = i;
        this.engine = engine;
        this.emit({ active: id, loading: null, progress: null, note: undefined });
        return;
      } catch (error) {
        engine.dispose();
        this.emit({ failures: [...this.status.failures, { id, reason: error instanceof Error ? error.message : String(error) }] });
      }
    }
    this.engine = null;
    this.emit({ active: null, loading: null, progress: null });
  }

  active(): TierId | null {
    return this.engine?.id ?? null;
  }

  beginTurn(): void {
    try {
      this.engine?.beginTurn();
    } catch {
      /* recognition just won't have text for this turn */
    }
  }

  /**
   * Transcribes one answer. On a crash or a timeout (1.5x the answer's
   * length plus a margin) the current tier is dropped and the next one
   * loads in the background; this answer is left untranscribed.
   */
  async transcribe(audio: Float32Array): Promise<{ text: string; model: TierId } | null> {
    const engine = this.engine;
    if (!engine) return null;
    if (engine.id !== "webspeech" && audio.length < STT_SAMPLE_RATE * 0.3) return null;
    const seconds = audio.length / STT_SAMPLE_RATE;
    try {
      const text = await withTimeout(engine.transcribe(audio), Math.max(6000, seconds * 1500 + 4000), engine.id);
      return { text, model: engine.id };
    } catch (error) {
      this.emit({ failures: [...this.status.failures, { id: engine.id, reason: error instanceof Error ? error.message : String(error) }] });
      if (this.engine === engine) {
        engine.dispose();
        this.engine = null;
        this.emit({ active: null });
        this.loadingPromise = this.loadFrom(this.index + 1);
      }
      return null;
    }
  }

  dispose(): void {
    this.engine?.dispose();
    this.engine = null;
  }
}
