/**
 * Cleanup when a live session closes: the listener stops at once, and an
 * optional follow-up model still loading is stopped and freed.
 */
import { describe, expect, it, vi } from "vitest";

const terminated: string[] = [];
let resolveEngine: ((engine: unknown) => void) | null = null;
vi.mock("@mlc-ai/web-llm", () => ({
  CreateWebWorkerMLCEngine: () => new Promise((resolve) => (resolveEngine = resolve)),
}));
class FakeWorker {
  terminate() {
    terminated.push("worker");
  }
}
vi.stubGlobal("Worker", FakeWorker);

const { listenForAnswer } = await import("./turnTaking");
const { loadFollowUpChooser, scriptChooser } = await import("./followUps");

describe("live session cleanup", () => {
  it("cancel() settles the listener and stops calling the detector", async () => {
    vi.useFakeTimers();
    const mic = { sampleRate: 16000, startRecording: vi.fn(), stopRecording: vi.fn(() => new Float32Array(0)) };
    let destroyed = false;
    const detector = {
      isSpeaking: () => {
        if (destroyed) throw new Error("detector used after destroy");
        return false;
      },
    };
    const handle = listenForAnswer(mic as never, () => detector as never, { maxSeconds: 30, noSpeechSeconds: 10, endSilenceSeconds: 2 } as never);
    vi.advanceTimersByTime(300);
    handle.cancel();
    destroyed = true;
    // Ticks after cancel must not touch the destroyed detector.
    expect(() => vi.advanceTimersByTime(1000)).not.toThrow();
    const result = await handle.result;
    expect(result.endedBy).toBe("button");
    expect(mic.stopRecording).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("aborting a follow-up model mid-load stops its worker and frees a late engine", async () => {
    terminated.length = 0;
    const abort = new AbortController();
    const statuses: unknown[] = [];
    const loading = loadFollowUpChooser(["qwen", "script"], (s) => statuses.push(s), abort.signal);
    await vi.waitFor(() => expect(resolveEngine).not.toBeNull());
    abort.abort();
    // Resolves straight away with the script, without waiting for the load.
    await expect(loading).resolves.toBe(scriptChooser);
    expect(terminated).toContain("worker");
    const seen = statuses.length;
    // The engine finishing afterwards changes nothing.
    resolveEngine!({ unload: async () => {}, chat: { completions: { create: async () => ({ choices: [] }) } } });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(statuses.length).toBe(seen);
  });
});
