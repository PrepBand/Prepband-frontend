/**
 * The examiner script engine (FR-LIVE-03/04): a pure state machine that
 * runs the real IELTS speaking test shape and decides what the examiner
 * does next. No audio, no models, no React - the session driver feeds it
 * each answer and performs the steps it yields, so it is fully testable.
 *
 *   Warm-up   greeting, name, where you're from
 *   Part 1    4-5 min of short questions on familiar topics, with an
 *             occasional follow-up
 *   Part 2    cue card, 1 min preparation, up to 2 min talk (interrupted
 *             at the limit), then rounding-off questions
 *   Part 3    4-5 min discussion with follow-ups
 *
 * Natural behaviour: short acknowledgements, "Take your time" after a
 * long silence, repeating the question when asked, asking for more after
 * very short answers, "Thank you" when an answer hits its time limit.
 */

import type { Phrase, PhraseKey, Phrases } from "./phrases";
import type { FollowUpRequest } from "./followUps";
import type { EndedBy } from "./turnTaking";

export type Part = 1 | 2 | 3;

export type ScriptPrompt = {
  id: string;
  part: Part;
  prompt: string;
  bullets: string[] | null;
  prepSeconds: number | null;
  speakSeconds: number | null;
  followUps: { text: string; audioUrl: string | null }[];
  audioUrl: string | null;
};

export type TurnKind = "question" | "follow_up" | "repeat" | "more";

export type Step =
  | { kind: "part"; part: Part }
  | { kind: "say"; text: string; audioUrl: string | null; part: Part | 0 }
  | {
      kind: "listen";
      part: Part | 0;
      /** null for warm-up questions, which aren't saved. */
      promptId: string | null;
      turn: TurnKind;
      question: string;
      maxSeconds: number;
      endSilenceSeconds: number;
      noSpeechSeconds: number;
    }
  | { kind: "cue_card"; promptId: string; prompt: string; bullets: string[]; prepSeconds: number }
  | { kind: "prompt_done"; promptId: string }
  | { kind: "end" };

export type Answer = {
  endedBy: EndedBy;
  speechSeconds: number;
  transcript: string | null;
};

export type ScriptOptions = {
  seed: number;
  /** Seconds since some fixed point (injected so tests can control time). */
  now: () => number;
  chooseFollowUp: (request: FollowUpRequest, fallbackIndex: number | null) => Promise<number | null>;
  /** Part 1 and Part 3 length (real test: 4-5 minutes each). */
  partBudgetSeconds?: number;
  warmUp?: boolean;
};

export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function wordCount(text: string | null): number | null {
  if (text == null) return null;
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

const REPEAT_RE = /\b(repeat|again|pardon|say that|didn'?t (catch|hear|understand)|don'?t understand|what do you mean)\b/i;

export function isRepeatRequest(answer: Answer): boolean {
  const words = wordCount(answer.transcript);
  return words != null && words <= 10 && REPEAT_RE.test(answer.transcript ?? "");
}

export function isShortAnswer(answer: Answer, part: Part): boolean {
  if (answer.endedBy === "no_speech" || answer.endedBy === "time") return false;
  const words = wordCount(answer.transcript);
  if (words != null && words > 0) return words < (part === 1 ? 6 : 12);
  return answer.speechSeconds < (part === 1 ? 4 : 8);
}

const LIMITS = {
  warmUp: { maxSeconds: 20, endSilenceSeconds: 1.6, noSpeechSeconds: 8 },
  part1: { endSilenceSeconds: 2.2, noSpeechSeconds: 8 },
  part2: { endSilenceSeconds: 6, noSpeechSeconds: 15 },
  part3: { endSilenceSeconds: 2.6, noSpeechSeconds: 9 },
  followUp: { maxSeconds: 45, endSilenceSeconds: 2.4, noSpeechSeconds: 8 },
};

export async function* examinerScript(
  prompts: ScriptPrompt[],
  phrases: Phrases,
  options: ScriptOptions,
): AsyncGenerator<Step, void, Answer | undefined> {
  const rng = seededRandom(options.seed);
  const budget = options.partBudgetSeconds ?? 270;
  const byPart = (part: Part) => prompts.filter((p) => p.part === part);
  const part1 = byPart(1);
  const part2 = byPart(2);
  const part3 = byPart(3);
  let ackIndex = Math.floor(rng() * 4);

  const say = (phrase: Phrase, part: Part | 0): Step => ({ kind: "say", text: phrase.text, audioUrl: phrase.audioUrl, part });
  const sayKey = (key: PhraseKey, part: Part | 0) => say(phrases[key], part);
  const nextAck = (part: Part | 0): Step => {
    const key = (["ack_1", "ack_2", "ack_3", "ack_4"] as const)[ackIndex % 4];
    ackIndex += 1;
    return sayKey(key, part);
  };

  type Limits = { maxSeconds: number; endSilenceSeconds: number; noSpeechSeconds: number };

  /** Asks one question and returns the answer, handling silence and "can you repeat that?". */
  async function* ask(
    question: Phrase,
    part: Part | 0,
    promptId: string | null,
    turn: TurnKind,
    limits: Limits,
  ): AsyncGenerator<Step, Answer | null, Answer | undefined> {
    yield say(question, part);
    let promptedSilence = false;
    let repeated = false;
    let kind = turn;
    for (;;) {
      const answer = yield { kind: "listen", part, promptId, turn: kind, question: question.text, ...limits };
      if (!answer) return null;
      if (answer.endedBy === "no_speech") {
        if (!promptedSilence) {
          promptedSilence = true;
          yield sayKey("take_time", part);
          continue;
        }
        yield sayKey("no_answer", part);
        return null;
      }
      if (!repeated && isRepeatRequest(answer)) {
        repeated = true;
        kind = "repeat";
        yield sayKey("repeat_intro", part);
        yield say(question, part);
        continue;
      }
      return answer;
    }
  }

  /** Picks a follow-up: the script's own choice, which a model may override. */
  async function pickFollowUp(part: Part, question: string, answer: Answer, options_: Phrase[]): Promise<Phrase | null> {
    if (options_.length === 0) return null;
    const fallback = Math.floor(rng() * options_.length);
    const index = await options.chooseFollowUp(
      { part, question, transcript: answer.transcript, options: options_.map((o) => o.text) },
      fallback,
    );
    return index == null ? null : options_[index] ?? null;
  }

  // --- warm-up and Part 1 ---------------------------------------------------
  if (part1.length > 0) {
    yield { kind: "part", part: 1 };
    if (options.warmUp !== false) {
      yield sayKey("greeting", 0);
      yield* ask(phrases.ask_name, 0, null, "question", LIMITS.warmUp);
      yield* ask(phrases.ask_origin, 0, null, "question", LIMITS.warmUp);
    }
    yield sayKey("part1_intro", 1);
    const start = options.now();
    for (const [index, prompt] of part1.entries()) {
      if (index > 0 && options.now() - start > budget) break;
      if (index > 0 && rng() < 0.5) yield nextAck(1);
      const answer = yield* ask(
        { text: prompt.prompt, audioUrl: prompt.audioUrl },
        1,
        prompt.id,
        "question",
        { maxSeconds: prompt.speakSeconds ?? 45, ...LIMITS.part1 },
      );
      if (answer?.endedBy === "time") {
        yield sayKey("time_up", 1);
      } else if (answer && isShortAnswer(answer, 1)) {
        yield* ask(phrases.more, 1, prompt.id, "more", LIMITS.followUp);
      } else if (answer && prompt.followUps.length > 0 && options.now() - start < budget - 40) {
        const followUp = await pickFollowUp(1, prompt.prompt, answer, prompt.followUps);
        if (followUp) {
          if (rng() < 0.5) yield nextAck(1);
          yield* ask(followUp, 1, prompt.id, "follow_up", LIMITS.followUp);
        }
      }
      yield { kind: "prompt_done", promptId: prompt.id };
    }
  }

  // --- Part 2 ---------------------------------------------------------------
  const cue = part2.find((p) => p.bullets && p.bullets.length > 0) ?? part2[0];
  if (cue) {
    yield { kind: "part", part: 2 };
    yield sayKey("part2_intro", 2);
    yield {
      kind: "cue_card",
      promptId: cue.id,
      prompt: cue.prompt,
      bullets: cue.bullets ?? [],
      prepSeconds: cue.prepSeconds ?? 60,
    };
    yield sayKey("part2_start", 2);
    const total = cue.speakSeconds ?? 120;
    const longTurn = { maxSeconds: total, ...LIMITS.part2 };
    let answer = yield { kind: "listen", part: 2, promptId: cue.id, turn: "question", question: cue.prompt, ...longTurn };
    if (answer?.endedBy === "no_speech") {
      yield sayKey("take_time", 2);
      answer = yield { kind: "listen", part: 2, promptId: cue.id, turn: "question", question: cue.prompt, ...longTurn };
    }
    if (answer?.endedBy === "time") {
      yield sayKey("part2_stop", 2);
    } else if (answer && answer.endedBy !== "no_speech" && answer.speechSeconds < 60) {
      yield* ask(phrases.part2_more, 2, cue.id, "more", {
        maxSeconds: Math.max(20, total - answer.speechSeconds),
        endSilenceSeconds: 4,
        noSpeechSeconds: 8,
      });
    } else if (answer?.endedBy === "no_speech") {
      yield sayKey("move_on", 2);
    }
    yield { kind: "prompt_done", promptId: cue.id };

    // Rounding-off questions (the other Part 2 prompts), at most two.
    for (const prompt of part2.filter((p) => p.id !== cue.id).slice(0, 2)) {
      yield* ask({ text: prompt.prompt, audioUrl: prompt.audioUrl }, 2, prompt.id, "question", {
        maxSeconds: prompt.speakSeconds ?? 30,
        ...LIMITS.part1,
      });
      yield { kind: "prompt_done", promptId: prompt.id };
    }
  }

  // --- Part 3 ---------------------------------------------------------------
  if (part3.length > 0) {
    yield { kind: "part", part: 3 };
    yield sayKey("part3_intro", 3);
    const start = options.now();
    for (const [index, prompt] of part3.entries()) {
      if (index > 0 && options.now() - start > budget) break;
      if (index > 0 && rng() < 0.5) yield nextAck(3);
      const answer = yield* ask(
        { text: prompt.prompt, audioUrl: prompt.audioUrl },
        3,
        prompt.id,
        "question",
        { maxSeconds: prompt.speakSeconds ?? 60, ...LIMITS.part3 },
      );
      if (answer?.endedBy === "time") {
        yield sayKey("time_up", 3);
      } else if (answer) {
        // Admin-written follow-ups first, then the examiner's generic probes.
        const pool: Phrase[] = [...prompt.followUps, phrases.why, phrases.example];
        let latest: Answer | null = answer;
        const maxFollowUps = isShortAnswer(answer, 3) ? 1 : prompt.followUps.length > 1 ? 2 : 1;
        for (let asked = 0; asked < maxFollowUps && latest && options.now() - start < budget - 45; asked += 1) {
          const followUp = await pickFollowUp(3, prompt.prompt, latest, pool);
          if (!followUp) break;
          pool.splice(pool.indexOf(followUp), 1);
          if (rng() < 0.5) yield nextAck(3);
          latest = yield* ask(followUp, 3, prompt.id, "follow_up", { ...LIMITS.followUp, maxSeconds: 50 });
          if (latest?.endedBy === "time") {
            yield sayKey("time_up", 3);
            break;
          }
        }
      }
      yield { kind: "prompt_done", promptId: prompt.id };
    }
  }

  yield sayKey("end", 0);
  yield { kind: "end" };
}
