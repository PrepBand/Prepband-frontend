import { describe, expect, it, vi } from "vitest";
import { encodeWav, resample, rms } from "./audio";
import { tierOrder, withStallTimeout, type Capabilities } from "./capabilities";
import { tiersFor, TIERS } from "./catalog";
import { speakingFeedback, type FeedbackTurn } from "./feedback";
import { parseChoice } from "./followUps";
import { trimSilence } from "./turnTaking";
import { wordErrorRate } from "./wer";

const desktop: Capabilities = { webgpu: true, memoryGb: 16, mobile: false, mediaDevices: true, speechSynthesis: true, speechRecognition: true, audioWorklet: true };
const lowEnd: Capabilities = { ...desktop, webgpu: false, memoryGb: 2, mobile: true };

describe("model catalog", () => {
  it("has exactly one main model and three fallbacks for every job", () => {
    for (const job of ["stt", "voice", "turns", "followups"] as const) {
      expect(tiersFor(job).map((t) => t.rank)).toEqual([1, 2, 3, 4]);
    }
    expect(TIERS).toHaveLength(16);
    expect(tiersFor("stt").map((t) => t.id)).toEqual(["whisper", "moonshine", "vosk", "webspeech"]);
    expect(tiersFor("voice").map((t) => t.id)).toEqual(["kokoro", "piper", "browser-voice", "captions"]);
    expect(tiersFor("followups").map((t) => t.id)).toEqual(["qwen", "smollm", "llama", "script"]);
  });

  it("orders tiers by device", () => {
    expect(tierOrder("stt", desktop)).toEqual(["whisper", "moonshine", "vosk", "webspeech"]);
    expect(tierOrder("stt", lowEnd)[0]).toBe("moonshine");
    expect(tierOrder("voice", lowEnd)[0]).toBe("piper");
    // No WebGPU: the language models can't run, the script chooses.
    expect(tierOrder("followups", lowEnd)).toEqual(["script"]);
    expect(tierOrder("followups", desktop)).toEqual(["qwen", "smollm", "llama", "script"]);
  });
});

describe("follow-up model guardrail", () => {
  it("accepts only a listed number", () => {
    expect(parseChoice("2", 3)).toBe(1);
    expect(parseChoice(" 1.", 3)).toBe(0);
    expect(parseChoice("0", 3)).toBeNull();
    expect(parseChoice("7", 3)).toBe("invalid");
    expect(parseChoice("Why not ask about their family?", 3)).toBe("invalid");
  });
});

describe("audio helpers", () => {
  it("resamples to the target rate", () => {
    const input = new Float32Array(48000).fill(0.5);
    const out = resample(input, 48000, 16000);
    expect(out.length).toBe(16000);
    expect(out[100]).toBeCloseTo(0.5);
  });

  it("encodes a valid 16-bit WAV", async () => {
    const blob = encodeWav(new Float32Array([0, 0.5, -0.5, 1]), 16000);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("RIFF");
    expect(String.fromCharCode(...bytes.slice(8, 12))).toBe("WAVE");
    expect(bytes.length).toBe(44 + 8);
    expect(blob.type).toBe("audio/wav");
  });

  it("trims leading and trailing silence", () => {
    const audio = new Float32Array(16000 * 3);
    for (let i = 16000; i < 32000; i += 1) audio[i] = Math.sin(i / 5) * 0.3;
    const trimmed = trimSilence(audio, 16000);
    expect(trimmed.length).toBeGreaterThan(16000);
    expect(trimmed.length).toBeLessThan(16000 * 1.8);
    expect(rms(trimmed)).toBeGreaterThan(0.1);
    expect(trimSilence(new Float32Array(16000), 16000).length).toBe(0);
  });
});

describe("speaking feedback", () => {
  const turn = (over: Partial<FeedbackTurn>): FeedbackTurn => ({
    part: 1,
    kind: "question",
    durationSeconds: 20,
    longPauses: 0,
    endedBy: "silence",
    transcript: null,
    ...over,
  });

  it("works from timings alone and never produces a band", () => {
    const result = speakingFeedback([turn({ durationSeconds: 5 }), turn({ durationSeconds: 4 }), turn({ part: 2, durationSeconds: 45 })]);
    expect(result.wordsPerMinute).toBeNull();
    expect(result.part2LongTurnSeconds).toBe(45);
    expect(result.observations.join(" ")).toMatch(/Part 2 talk lasted about 45 seconds/);
    expect(result.observations.join(" ")).toMatch(/Part 1 answers were very short/);
    expect(JSON.stringify(result)).not.toMatch(/band \d/i);
    expect(result.limitations).toMatch(/not an IELTS band/);
  });

  it("adds word-based signals from transcripts", () => {
    const transcript = "um I think uh that travel is um really important because uh you know it opens your mind";
    const result = speakingFeedback([turn({ part: 3, durationSeconds: 10, transcript })]);
    expect(result.wordsSpoken).toBe(14);
    expect(result.wordsPerMinute).toBe(84);
    expect(result.fillerCount).toBe(5);
    expect(result.observations.join(" ")).toMatch(/Filler sounds/);
  });

  it("counts unanswered questions but not the warm-up", () => {
    const result = speakingFeedback([turn({ endedBy: "no_speech", durationSeconds: 0 }), turn({ part: 0, endedBy: "no_speech", durationSeconds: 0 })]);
    expect(result.unanswered).toBe(1);
    expect(result.answers).toBe(0);
  });
});

describe("word error rate", () => {
  it("is 0 for a perfect transcript and counts edits otherwise", () => {
    expect(wordErrorRate("I live in Lahore.", "i live in lahore")).toBe(0);
    expect(wordErrorRate("I live in a big city", "I live in big city")).toBeCloseTo(1 / 6);
    expect(wordErrorRate("hello there", "hello there friend")).toBe(0.5);
    expect(wordErrorRate("", "anything")).toBeNull();
  });
});

describe("model download timeouts", () => {
  it("keeps waiting while a slow download makes progress", async () => {
    vi.useFakeTimers();
    const result = withStallTimeout(
      (touch) =>
        new Promise<string>((resolve) => {
          // 10 minutes of slow progress, a report every 30 s, then done.
          let elapsed = 0;
          const tick = setInterval(() => {
            elapsed += 30_000;
            touch();
            if (elapsed >= 600_000) {
              clearInterval(tick);
              resolve("loaded");
            }
          }, 30_000);
        }),
      60_000,
      15 * 60_000,
      "Loading",
    );
    await vi.advanceTimersByTimeAsync(600_000);
    await expect(result).resolves.toBe("loaded");
    vi.useRealTimers();
  });

  it("gives up when progress stops", async () => {
    vi.useFakeTimers();
    const result = withStallTimeout(() => new Promise<string>(() => undefined), 60_000, 15 * 60_000, "Loading");
    const check = expect(result).rejects.toThrow(/stopped making progress/);
    await vi.advanceTimersByTimeAsync(61_000);
    await check;
    vi.useRealTimers();
  });

  it("still has an overall cap", async () => {
    vi.useFakeTimers();
    const result = withStallTimeout(
      (touch) => {
        setInterval(touch, 10_000);
        return new Promise<string>(() => undefined);
      },
      60_000,
      5 * 60_000,
      "Loading",
    );
    const check = expect(result).rejects.toThrow(/longer than 5 minutes/);
    await vi.advanceTimersByTimeAsync(5 * 60_000 + 1000);
    await check;
    vi.useRealTimers();
  });
});
