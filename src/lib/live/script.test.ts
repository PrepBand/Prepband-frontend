import { describe, expect, it, vi } from "vitest";
// phrases.ts reaches the Supabase client through apiClient; CI has no
// Supabase env, so stub it (these tests never call the network).
vi.mock("../supabaseClient", async () => ({ supabase: (await import("../../test/supabaseMock")).supabaseMock }));
import { defaultPhrases } from "./phrases";
import { examinerScript, isRepeatRequest, isShortAnswer, type Answer, type ScriptPrompt, type Step } from "./script";

const phrases = defaultPhrases();

const prompts: ScriptPrompt[] = [
  { id: "p1a", part: 1, prompt: "Do you work or study?", bullets: null, prepSeconds: null, speakSeconds: null, followUps: [{ text: "Why did you choose that?", audioUrl: null }], audioUrl: "https://clip/p1a.wav" },
  { id: "p1b", part: 1, prompt: "Do you like music?", bullets: null, prepSeconds: null, speakSeconds: null, followUps: [], audioUrl: null },
  { id: "p2", part: 2, prompt: "Describe a place you enjoy visiting.", bullets: ["where it is", "why you like it"], prepSeconds: 60, speakSeconds: 120, followUps: [], audioUrl: null },
  { id: "p2r", part: 2, prompt: "Do you often go there?", bullets: null, prepSeconds: null, speakSeconds: 30, followUps: [], audioUrl: null },
  { id: "p3a", part: 3, prompt: "Why do people travel?", bullets: null, prepSeconds: null, speakSeconds: null, followUps: [{ text: "Has that changed?", audioUrl: null }, { text: "Is travel good for young people?", audioUrl: null }], audioUrl: null },
];

const good: Answer = { endedBy: "silence", speechSeconds: 25, transcript: "I study computer science at university because I really enjoy solving problems and building things every day" };

/** Runs the script, answering every listen step with answerFor(step). */
async function run(
  answerFor: (step: Extract<Step, { kind: "listen" }>, index: number) => Answer,
  options: { now?: () => number; choose?: (fallback: number | null) => number | null; warmUp?: boolean } = {},
) {
  const steps: Step[] = [];
  const script = examinerScript(prompts, phrases, {
    seed: 7,
    now: options.now ?? (() => 0),
    chooseFollowUp: async (_request, fallback) => (options.choose ? options.choose(fallback) : fallback),
    warmUp: options.warmUp,
  });
  let listens = 0;
  let result = await script.next();
  while (!result.done) {
    const step = result.value;
    steps.push(step);
    result = step.kind === "listen" ? await script.next(answerFor(step, listens++)) : await script.next();
  }
  return steps;
}

const says = (steps: Step[]) => steps.filter((s): s is Extract<Step, { kind: "say" }> => s.kind === "say").map((s) => s.text);
const listens = (steps: Step[]) => steps.filter((s): s is Extract<Step, { kind: "listen" }> => s.kind === "listen");

describe("examiner script", () => {
  it("runs the three-part structure in order and ends", async () => {
    const steps = await run(() => good);
    expect(steps.filter((s) => s.kind === "part").map((s) => (s as { part: number }).part)).toEqual([1, 2, 3]);
    expect(says(steps)[0]).toBe(phrases.greeting.text);
    expect(steps.at(-1)).toEqual({ kind: "end" });
    expect(says(steps).at(-1)).toBe(phrases.end.text);
    const cue = steps.find((s) => s.kind === "cue_card");
    expect(cue).toMatchObject({ promptId: "p2", prepSeconds: 60, bullets: ["where it is", "why you like it"] });
    // Every prompt gets a prompt_done so the driver can save it.
    expect(steps.filter((s) => s.kind === "prompt_done").map((s) => (s as { promptId: string }).promptId)).toEqual(["p1a", "p1b", "p2", "p2r", "p3a"]);
  });

  it("asks warm-up questions that are not saved against a prompt", async () => {
    const steps = await run(() => good);
    const warm = listens(steps).filter((l) => l.part === 0);
    expect(warm.map((l) => l.question)).toEqual([phrases.ask_name.text, phrases.ask_origin.text]);
    expect(warm.every((l) => l.promptId === null)).toBe(true);
    const noWarm = await run(() => good, { warmUp: false });
    expect(listens(noWarm).some((l) => l.part === 0)).toBe(false);
  });

  it("speaks prompts with their pre-generated clip", async () => {
    const steps = await run(() => good);
    const ask = steps.find((s) => s.kind === "say" && s.text === "Do you work or study?");
    expect(ask).toMatchObject({ audioUrl: "https://clip/p1a.wav" });
  });

  it("uses admin follow-ups, and a model may only choose among them", async () => {
    const steps = await run(() => good);
    expect(says(steps)).toContain("Why did you choose that?");
    // A chooser saying "no follow-up" means none is asked in Part 1.
    const none = await run(() => good, { choose: () => null });
    expect(says(none)).not.toContain("Why did you choose that?");
    expect(listens(none).some((l) => l.turn === "follow_up")).toBe(false);
  });

  it("says 'Take your time' after silence, then moves on after a second silence", async () => {
    const steps = await run((step) => (step.promptId === "p1b" ? { endedBy: "no_speech", speechSeconds: 0, transcript: null } : good));
    const texts = says(steps);
    const at = texts.indexOf("Do you like music?");
    expect(texts.slice(at + 1, at + 3)).toEqual([phrases.take_time.text, phrases.no_answer.text]);
  });

  it("repeats the question once when asked", async () => {
    let asked = false;
    const steps = await run((step) => {
      if (step.promptId === "p1b" && !asked) {
        asked = true;
        return { endedBy: "silence", speechSeconds: 2, transcript: "Sorry, could you repeat that?" };
      }
      return good;
    });
    const texts = says(steps);
    const first = texts.indexOf("Do you like music?");
    expect(texts[first + 1]).toBe(phrases.repeat_intro.text);
    expect(texts[first + 2]).toBe("Do you like music?");
    expect(listens(steps).find((l) => l.turn === "repeat")?.promptId).toBe("p1b");
  });

  it("asks for more after a very short Part 1 answer", async () => {
    const steps = await run((step) => (step.promptId === "p1b" && step.turn === "question" ? { endedBy: "silence", speechSeconds: 2, transcript: "Yes." } : good));
    expect(listens(steps).some((l) => l.promptId === "p1b" && l.turn === "more")).toBe(true);
  });

  it("interrupts the Part 2 long turn at the time limit", async () => {
    const steps = await run((step) => (step.promptId === "p2" ? { endedBy: "time", speechSeconds: 120, transcript: null } : good));
    const texts = says(steps);
    expect(texts[texts.indexOf(phrases.part2_start.text) + 1]).toBe(phrases.part2_stop.text);
    const longTurn = listens(steps).find((l) => l.promptId === "p2");
    expect(longTurn).toMatchObject({ maxSeconds: 120, part: 2 });
  });

  it("asks 'anything else?' when the Part 2 talk stops early", async () => {
    const steps = await run((step) => (step.promptId === "p2" && step.turn === "question" ? { endedBy: "silence", speechSeconds: 40, transcript: null } : good));
    const extra = listens(steps).find((l) => l.promptId === "p2" && l.turn === "more");
    expect(extra?.maxSeconds).toBe(80);
  });

  it("keeps Part 1 and Part 3 within the time budget", async () => {
    let clock = 0;
    const steps = await run(
      () => {
        clock += 300; // every answer takes five minutes
        return good;
      },
      { now: () => clock },
    );
    // Only the first Part 1 prompt is asked before the budget runs out.
    expect(steps.some((s) => s.kind === "say" && s.text === "Do you like music?")).toBe(false);
    expect(steps.at(-1)).toEqual({ kind: "end" });
  });

  it("gives Part 3 follow-ups from the admin list before generic probes", async () => {
    const steps = await run(() => good, { choose: () => 0 });
    const part3Says = says(steps).slice(says(steps).indexOf(phrases.part3_intro.text));
    expect(part3Says).toContain("Has that changed?");
    expect(part3Says).toContain("Is travel good for young people?");
  });

  it("works with no prompts for some parts", async () => {
    const steps: Step[] = [];
    const script = examinerScript(prompts.filter((p) => p.part === 3), phrases, { seed: 1, now: () => 0, chooseFollowUp: async (_r, f) => f });
    let r = await script.next();
    while (!r.done) {
      steps.push(r.value);
      r = r.value.kind === "listen" ? await script.next(good) : await script.next();
    }
    expect(steps.filter((s) => s.kind === "part")).toEqual([{ kind: "part", part: 3 }]);
  });
});

describe("answer checks", () => {
  it("detects requests to repeat", () => {
    expect(isRepeatRequest({ endedBy: "silence", speechSeconds: 2, transcript: "Pardon?" })).toBe(true);
    expect(isRepeatRequest({ endedBy: "silence", speechSeconds: 2, transcript: "Sorry, I didn't catch that" })).toBe(true);
    expect(isRepeatRequest({ endedBy: "silence", speechSeconds: 9, transcript: "I go there again and again because the beaches are lovely and quiet" })).toBe(false);
    expect(isRepeatRequest({ endedBy: "silence", speechSeconds: 2, transcript: null })).toBe(false);
  });

  it("judges short answers by words, or by time without a transcript", () => {
    expect(isShortAnswer({ endedBy: "silence", speechSeconds: 10, transcript: "Yes I do." }, 1)).toBe(true);
    expect(isShortAnswer({ endedBy: "silence", speechSeconds: 2, transcript: null }, 1)).toBe(true);
    expect(isShortAnswer({ endedBy: "silence", speechSeconds: 6, transcript: null }, 1)).toBe(false);
    expect(isShortAnswer({ endedBy: "time", speechSeconds: 1, transcript: null }, 3)).toBe(false);
  });
});
