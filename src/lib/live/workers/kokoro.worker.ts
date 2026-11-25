/// <reference lib="webworker" />
/**
 * Kokoro-82M examiner voice, generated off the main thread. Used live for
 * lines without a pre-generated clip, and in the admin panel to make
 * those clips.
 */
import { KokoroTTS } from "kokoro-js";

type InMessage =
  | { type: "load"; model: string; device: "webgpu" | "wasm" }
  | { type: "speak"; id: number; text: string; voice: string };

let tts: KokoroTTS | null = null;
const post = (message: unknown, transfer: Transferable[] = []) =>
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(message, transfer);

self.onmessage = async (event: MessageEvent<InMessage>) => {
  const message = event.data;
  if (message.type === "load") {
    try {
      tts = await KokoroTTS.from_pretrained(message.model, {
        dtype: message.device === "webgpu" ? "fp32" : "q8",
        device: message.device,
        progress_callback: (progress: { status?: string; progress?: number; file?: string }) => {
          if (progress.status === "progress") post({ type: "progress", progress: progress.progress ?? 0, file: progress.file });
        },
      });
      post({ type: "ready" });
    } catch (error) {
      post({ type: "error", error: error instanceof Error ? error.message : String(error) });
    }
    return;
  }
  if (message.type === "speak") {
    if (!tts) {
      post({ type: "audio", id: message.id, error: "Voice not loaded" });
      return;
    }
    try {
      const audio = await tts.generate(message.text, { voice: message.voice as never });
      // Kokoro is mono; newer Transformers.js types allow one array per channel.
      const raw = Array.isArray(audio.audio) ? audio.audio[0] : audio.audio;
      const samples = new Float32Array(raw);
      post({ type: "audio", id: message.id, samples, sampleRate: audio.sampling_rate }, [samples.buffer]);
    } catch (error) {
      post({ type: "audio", id: message.id, error: error instanceof Error ? error.message : String(error) });
    }
  }
};
