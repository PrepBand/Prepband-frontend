/// <reference lib="webworker" />
/**
 * Speech-to-text worker for the two Transformers.js tiers (Whisper base.en
 * and Moonshine base). Runs off the main thread so transcription never
 * freezes the examiner's animation or timers. Audio arrives as 16 kHz
 * mono Float32 and never leaves the device.
 */
import { pipeline, type AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";

type LoadMessage = { type: "load"; model: string; device: "webgpu" | "wasm" };
type TranscribeMessage = { type: "transcribe"; id: number; audio: Float32Array };
type InMessage = LoadMessage | TranscribeMessage;

let asr: AutomaticSpeechRecognitionPipeline | null = null;

const post = (message: unknown) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(message);

self.onmessage = async (event: MessageEvent<InMessage>) => {
  const message = event.data;
  if (message.type === "load") {
    try {
      // q4 decoder on WebGPU, q8 everywhere on WASM: the usual
      // Transformers.js settings for these models in the browser.
      const dtype =
        message.device === "webgpu"
          ? ({ encoder_model: "fp32", decoder_model_merged: "q4" } as const)
          : ("q8" as const);
      asr = (await pipeline("automatic-speech-recognition", message.model, {
        device: message.device,
        dtype,
        progress_callback: (progress: { status?: string; progress?: number; file?: string }) => {
          if (progress.status === "progress") post({ type: "progress", progress: progress.progress ?? 0, file: progress.file });
        },
      })) as AutomaticSpeechRecognitionPipeline;
      // One tiny warm-up run compiles the model so the first answer is fast.
      await asr(new Float32Array(16000));
      post({ type: "ready" });
    } catch (error) {
      post({ type: "error", error: error instanceof Error ? error.message : String(error) });
    }
    return;
  }
  if (message.type === "transcribe") {
    if (!asr) {
      post({ type: "result", id: message.id, error: "Model not loaded" });
      return;
    }
    try {
      const output = await asr(message.audio);
      const text = Array.isArray(output) ? output.map((o) => o.text).join(" ") : output.text;
      post({ type: "result", id: message.id, text: text.trim() });
    } catch (error) {
      post({ type: "result", id: message.id, error: error instanceof Error ? error.message : String(error) });
    }
  }
};
