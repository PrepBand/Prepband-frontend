/**
 * Phase 5 step 5.9 forced-failure run: every AI model is unavailable
 * (downloads fail, no Worker, no speechSynthesis, no WebGPU, cloud speech
 * not allowed) and the live examiner must still run a complete speaking
 * test on its last-resort tiers:
 *   voice      -> captions only
 *   hearing    -> none (answers are timed, not transcribed)
 *   follow-ups -> the examiner script
 *   turns      -> the "I've finished" button
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Every model package fails as if its download were blocked. (vi.mock is
// hoisted above the imports, so each factory has to be inline.)
vi.mock("@huggingface/transformers", () => {
  throw new Error("network blocked (forced-failure test)");
});
vi.mock("@mintplex-labs/piper-tts-web", () => {
  throw new Error("network blocked (forced-failure test)");
});
vi.mock("kokoro-js", () => {
  throw new Error("network blocked (forced-failure test)");
});
vi.mock("vosk-browser", () => {
  throw new Error("network blocked (forced-failure test)");
});
vi.mock("@mlc-ai/web-llm", () => {
  throw new Error("network blocked (forced-failure test)");
});

import { tiersFor } from "./catalog";
import { loadFollowUpChooser, scriptChooser } from "./followUps";
import { defaultPhrases } from "./phrases";
import { examinerScript, type ScriptPrompt, type Step } from "./script";
import { SttChain, type SttStatus } from "./stt";
import { VoiceChain, type VoiceStatus } from "./tts";
import { createTimeLimitDetector } from "./turnTaking";

class FakeAudioContext {
  state = "running";
  destination = {};
  createAnalyser() {
    return { fftSize: 0, connect() {}, getByteTimeDomainData() {} };
  }
  async resume() {}
}

const original = { window: globalThis.window, Worker: globalThis.Worker };

beforeAll(() => {
  // A browser with nothing: no Worker, no speechSynthesis, no WebGPU.
  (globalThis as unknown as { window: unknown }).window = { AudioContext: FakeAudioContext, localStorage: undefined };
  (globalThis as unknown as { Worker: unknown }).Worker = undefined;
});

afterAll(() => {
  (globalThis as unknown as { window: unknown }).window = original.window;
  (globalThis as unknown as { Worker: unknown }).Worker = original.Worker;
});

const prompts: ScriptPrompt[] = [
  { id: "p1", part: 1, prompt: "Do you work or study?", bullets: null, prepSeconds: null, speakSeconds: null, followUps: [{ text: "Why?", audioUrl: null }], audioUrl: null },
  { id: "p2", part: 2, prompt: "Describe a journey you remember.", bullets: ["where", "why"], prepSeconds: 60, speakSeconds: 120, followUps: [], audioUrl: null },
  { id: "p3", part: 3, prompt: "Why do people travel?", bullets: null, prepSeconds: null, speakSeconds: null, followUps: [{ text: "Has that changed?", audioUrl: null }], audioUrl: null },
];

describe("forced failure: every AI model unavailable", () => {
  it("falls back to captions for the examiner's voice", async () => {
    const statuses: VoiceStatus[] = [];
    const chain = new VoiceChain(tiersFor("voice").map((t) => t.id), false, (s) => statuses.push(s));
    await chain.start();
    expect(chain.active()).toBe("captions");
    expect(statuses.at(-1)?.failures.map((f) => f.id)).toEqual(["kokoro", "piper", "browser-voice"]);
  });

  it("carries on without speech recognition when no recogniser loads and cloud speech is not allowed", async () => {
    const statuses: SttStatus[] = [];
    const chain = new SttChain(tiersFor("stt").map((t) => t.id), false, false, (s) => statuses.push(s));
    await chain.start();
    expect(chain.active()).toBeNull();
    expect(statuses.at(-1)?.failures.map((f) => f.id)).toEqual(["whisper", "moonshine", "vosk", "webspeech"]);
    expect(await chain.transcribe(new Float32Array(16000))).toBeNull();
  });

  it("uses the examiner script when no follow-up model loads", async () => {
    const chooser = await loadFollowUpChooser(tiersFor("followups").map((t) => t.id), () => {});
    expect(chooser).toBe(scriptChooser);
  });

  it("still completes all three parts with button-ended, untranscribed answers", async () => {
    const steps: Step[] = [];
    const script = examinerScript(prompts, defaultPhrases(), {
      seed: 3,
      now: () => 0,
      chooseFollowUp: (request, fallback) => scriptChooser.choose(request, fallback),
    });
    let result = await script.next();
    while (!result.done) {
      const step = result.value;
      steps.push(step);
      result =
        step.kind === "listen"
          ? await script.next({ endedBy: "button", speechSeconds: 30, transcript: null })
          : await script.next();
    }
    expect(steps.filter((s) => s.kind === "part").map((s) => (s as { part: number }).part)).toEqual([1, 2, 3]);
    expect(steps.filter((s) => s.kind === "prompt_done").map((s) => (s as { promptId: string }).promptId)).toEqual(["p1", "p2", "p3"]);
    expect(steps.at(-1)).toEqual({ kind: "end" });
  });

  it("with both silence detectors off, answers end only by time limit or button", () => {
    const detector = createTimeLimitDetector();
    expect(detector.id).toBe("time-limit");
    expect(detector.isSpeaking()).toBe(true);
    expect(detector.failed()).toBe(false);
  });
});
