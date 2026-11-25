import { encodeWav } from "./audio";
import { KokoroEngine } from "./tts";

/**
 * Admin-side generation of pre-recorded examiner lines with Kokoro, the
 * main voice model, in the admin's own browser. The resulting WAV is
 * uploaded to R2 and played first during live sessions, so students hear
 * the natural voice without downloading the model.
 */

let engine: KokoroEngine | null = null;
let loading: Promise<KokoroEngine> | null = null;

async function getEngine(onProgress?: (fraction: number | null) => void): Promise<KokoroEngine> {
  if (engine) return engine;
  if (!loading) {
    loading = (async () => {
      const nav = navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } };
      const webgpu = Boolean(nav.gpu && (await nav.gpu.requestAdapter().catch(() => null)));
      const next = new KokoroEngine(webgpu);
      await next.load((fraction) => onProgress?.(fraction));
      engine = next;
      return next;
    })().catch((error) => {
      loading = null;
      throw error;
    });
  }
  return loading;
}

export async function generateExaminerClip(text: string, onProgress?: (fraction: number | null) => void): Promise<File> {
  const kokoro = await getEngine(onProgress);
  const { samples, sampleRate } = await kokoro.synthesize(text);
  return new File([encodeWav(samples, sampleRate)], "examiner-line.wav", { type: "audio/wav" });
}
