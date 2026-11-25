/**
 * The examiner's voice (FR-LIVE-01/05): four tiers.
 *
 *   1. Kokoro-82M    - natural open voice model (worker); pre-generated
 *                      Kokoro clips from the admin panel play first
 *   2. Piper         - fast open voice model (its own worker)
 *   3. Browser voice - speechSynthesis
 *   4. Captions only - the line on screen for a reading-time pause
 *
 * Every line is always shown as a caption too (FR-SPEAK-02 text fallback).
 * Model and clip audio go through one AnalyserNode so the examiner avatar
 * can move its mouth with the voice.
 */

import { MODEL_IDS, type TierId } from "./catalog";
import { withStallTimeout, withTimeout } from "./capabilities";

export type VoiceProgress = (fraction: number | null, note?: string) => void;

export interface VoiceEngine {
  readonly id: TierId;
  load(onProgress: VoiceProgress): Promise<void>;
  /** Raw samples for the line, or null when the engine plays it itself. */
  synthesize(text: string): Promise<{ samples: Float32Array; sampleRate: number } | Blob | null>;
  dispose(): void;
}

// --- Kokoro ------------------------------------------------------------------------

export class KokoroEngine implements VoiceEngine {
  readonly id = "kokoro" as const;
  private worker: Worker | null = null;
  private nextId = 1;
  private pending = new Map<number, (result: { samples?: Float32Array; sampleRate?: number; error?: string }) => void>();

  constructor(private readonly webgpu: boolean) {}

  load(onProgress: VoiceProgress): Promise<void> {
    this.worker = new Worker(new URL("./workers/kokoro.worker.ts", import.meta.url), { type: "module" });
    const files = new Map<string, number>();
    return new Promise<void>((resolve, reject) => {
      this.worker!.onerror = (event) => reject(new Error(event.message || "Voice worker failed to start"));
      this.worker!.onmessage = (event: MessageEvent) => {
        const data = event.data;
        if (data.type === "progress") {
          files.set(data.file ?? "", data.progress);
          const values = [...files.values()];
          onProgress(values.reduce((a, b) => a + b, 0) / values.length / 100);
        } else if (data.type === "ready") {
          this.worker!.onmessage = (e: MessageEvent) => {
            const reply = this.pending.get(e.data.id);
            if (reply) {
              this.pending.delete(e.data.id);
              reply(e.data);
            }
          };
          resolve();
        } else if (data.type === "error") {
          reject(new Error(data.error));
        }
      };
      this.worker!.postMessage({ type: "load", model: MODEL_IDS.kokoro, device: this.webgpu ? "webgpu" : "wasm" });
    });
  }

  synthesize(text: string): Promise<{ samples: Float32Array; sampleRate: number }> {
    if (!this.worker) return Promise.reject(new Error("Not loaded"));
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, (result) => {
        if (result.error || !result.samples || !result.sampleRate) reject(new Error(result.error ?? "No audio"));
        else resolve({ samples: result.samples, sampleRate: result.sampleRate });
      });
      this.worker!.postMessage({ type: "speak", id, text, voice: MODEL_IDS.kokoroVoice });
    });
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    this.pending.forEach((reply) => reply({ error: "Disposed" }));
    this.pending.clear();
  }
}

// --- Piper ---------------------------------------------------------------------------

class PiperEngine implements VoiceEngine {
  readonly id = "piper" as const;
  private session: { predict: (text: string) => Promise<Blob> } | null = null;

  async load(onProgress: VoiceProgress): Promise<void> {
    const piper = await import("@mintplex-labs/piper-tts-web");
    this.session = await piper.TtsSession.create({
      voiceId: MODEL_IDS.piperVoice,
      progress: (p: { loaded: number; total: number }) => onProgress(p.total ? p.loaded / p.total : null),
    });
    // Warm-up so the first real line isn't slow.
    await this.session.predict("Hello.");
  }

  synthesize(text: string): Promise<Blob> {
    if (!this.session) return Promise.reject(new Error("Not loaded"));
    return this.session.predict(text);
  }

  dispose(): void {
    this.session = null;
  }
}

// --- Browser voice and captions (no model) -------------------------------------------------

class BrowserVoiceEngine implements VoiceEngine {
  readonly id = "browser-voice" as const;
  async load(): Promise<void> {
    if (!("speechSynthesis" in window)) throw new Error("This browser has no speech synthesis");
  }
  async synthesize(): Promise<null> {
    return null;
  }
  dispose(): void {
    window.speechSynthesis?.cancel();
  }
}

class CaptionsEngine implements VoiceEngine {
  readonly id = "captions" as const;
  async load(): Promise<void> {}
  async synthesize(): Promise<null> {
    return null;
  }
  dispose(): void {}
}

export function createVoiceEngine(id: TierId, webgpu: boolean): VoiceEngine {
  if (id === "kokoro") return new KokoroEngine(webgpu);
  if (id === "piper") return new PiperEngine();
  if (id === "browser-voice") return new BrowserVoiceEngine();
  return new CaptionsEngine();
}

function pickBrowserVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  return voices.find((v) => v.lang === "en-GB") ?? voices.find((v) => v.lang.startsWith("en")) ?? null;
}

// --- the chain + playback --------------------------------------------------------------------

export type VoiceStatus = {
  active: TierId | null;
  loading: TierId | null;
  progress: number | null;
  note?: string;
  failures: { id: TierId; reason: string }[];
};

// Slow downloads are fine; stuck ones aren't (see withStallTimeout).
const LOAD_STALL_MS = 2 * 60 * 1000;
const LOAD_MAX_MS = 15 * 60 * 1000;

export class VoiceChain {
  private index = 0;
  private engine: VoiceEngine | null = null;
  private status: VoiceStatus = { active: null, loading: null, progress: null, failures: [] };
  readonly context: AudioContext;
  readonly analyser: AnalyserNode;
  private current: { stop: () => void } | null = null;
  /** True while browser speechSynthesis is talking (no analyser signal). */
  syntheticSpeaking = false;
  /** Engines still loading, so dispose() can stop them too. */
  private loadingEngines = new Set<VoiceEngine>();
  private disposed = false;

  constructor(
    private readonly order: TierId[],
    private readonly webgpu: boolean,
    private readonly onStatus: (status: VoiceStatus) => void,
  ) {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.context = new AudioCtx();
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.connect(this.context.destination);
  }

  private emit(update: Partial<VoiceStatus>) {
    if (this.disposed) return;
    this.status = { ...this.status, ...update };
    this.onStatus(this.status);
  }

  async start(): Promise<void> {
    await this.loadFrom(this.index);
  }

  /** Use a lower tier right away (the student chose not to wait for a download). */
  async skipTo(id: TierId): Promise<void> {
    const i = this.order.indexOf(id);
    if (i >= 0) await this.loadFrom(i);
  }

  private async loadFrom(start: number): Promise<void> {
    for (let i = start; i < this.order.length; i += 1) {
      if (this.disposed) return;
      const id = this.order[i];
      const engine = createVoiceEngine(id, this.webgpu);
      this.loadingEngines.add(engine);
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
        this.loadingEngines.delete(engine);
        // The session ended while this tier loaded: don't install it.
        if (this.disposed) {
          engine.dispose();
          return;
        }
        this.engine?.dispose();
        this.engine = engine;
        this.index = i;
        this.emit({ active: id, loading: null, progress: null });
        return;
      } catch (error) {
        this.loadingEngines.delete(engine);
        engine.dispose();
        this.emit({ failures: [...this.status.failures, { id, reason: error instanceof Error ? error.message : String(error) }] });
      }
    }
  }

  active(): TierId | null {
    return this.engine?.id ?? null;
  }

  async resume(): Promise<void> {
    if (this.context.state === "suspended") await this.context.resume();
  }

  /** Volume 0..1 for the avatar's mouth. */
  level(): number {
    if (this.syntheticSpeaking) return 0.35 + 0.3 * Math.abs(Math.sin(performance.now() / 90));
    const data = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (const v of data) sum += ((v - 128) / 128) ** 2;
    return Math.min(1, Math.sqrt(sum / data.length) * 4);
  }

  stop(): void {
    this.current?.stop();
    this.current = null;
    window.speechSynthesis?.cancel();
    this.syntheticSpeaking = false;
  }

  private playBuffer(buffer: AudioBuffer): Promise<void> {
    return new Promise<void>((resolve) => {
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.connect(this.analyser);
      source.onended = () => resolve();
      this.current = {
        stop: () => {
          try {
            source.stop();
          } catch {
            /* already stopped */
          }
          resolve();
        },
      };
      source.start();
    });
  }

  private async playClip(url: string): Promise<void> {
    const response = await withTimeout(fetch(url), 8000, "Clip download");
    if (!response.ok) throw new Error(`Clip ${response.status}`);
    const buffer = await this.context.decodeAudioData(await response.arrayBuffer());
    await this.playBuffer(buffer);
  }

  private speakWithBrowser(text: string): Promise<void> {
    return new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = pickBrowserVoice();
      if (voice) utterance.voice = voice;
      utterance.lang = voice?.lang ?? "en-GB";
      utterance.rate = 0.95;
      const done = () => {
        this.syntheticSpeaking = false;
        clearTimeout(guard);
        resolve();
      };
      // Some browsers never fire onend; don't hang the conversation.
      const guard = setTimeout(done, 2000 + text.split(/\s+/).length * 600);
      utterance.onend = done;
      utterance.onerror = done;
      this.syntheticSpeaking = true;
      this.current = { stop: done };
      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Says one examiner line. A pre-generated clip plays if there is one;
   * otherwise the active tier speaks it. A tier that fails mid-session is
   * dropped and the line is retried on the next tier.
   */
  async say(text: string, clipUrl?: string | null): Promise<void> {
    await this.resume();
    if (clipUrl) {
      try {
        await this.playClip(clipUrl);
        return;
      } catch {
        /* fall through to live synthesis */
      }
    }
    for (;;) {
      const engine = this.engine;
      if (!engine || engine.id === "captions") {
        // Reading time: ~3 words a second, at least 1.5 s.
        await new Promise((resolve) => setTimeout(resolve, Math.max(1500, text.split(/\s+/).length * 330)));
        return;
      }
      try {
        if (engine.id === "browser-voice") {
          await this.speakWithBrowser(text);
          return;
        }
        const output = await withTimeout(engine.synthesize(text), 20000, `${engine.id} voice`);
        if (output instanceof Blob) {
          await this.playBuffer(await this.context.decodeAudioData(await output.arrayBuffer()));
        } else if (output) {
          const buffer = this.context.createBuffer(1, output.samples.length, output.sampleRate);
          buffer.copyToChannel(new Float32Array(output.samples), 0);
          await this.playBuffer(buffer);
        }
        return;
      } catch (error) {
        this.emit({ failures: [...this.status.failures, { id: engine.id, reason: error instanceof Error ? error.message : String(error) }] });
        engine.dispose();
        this.engine = null;
        this.emit({ active: null });
        // Captions can't fail, so this always ends with a working tier.
        await this.loadFrom(this.index + 1);
      }
    }
  }

  dispose(): void {
    this.disposed = true;
    this.stop();
    this.loadingEngines.forEach((engine) => engine.dispose());
    this.loadingEngines.clear();
    this.engine?.dispose();
    this.engine = null;
    void this.context.close();
  }
}
