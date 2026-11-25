/**
 * Rule-based speaking feedback (FR-LIVE-10). Counts and timings only:
 * never a band score, always labelled as practice feedback. Works with
 * timings alone when there is no transcript (no consent, or no speech
 * model could run), and adds word-based signals when there is one.
 */

import type { EndedBy } from "./turnTaking";

export type FeedbackTurn = {
  part: 0 | 1 | 2 | 3;
  kind: "question" | "follow_up" | "repeat" | "more";
  durationSeconds: number;
  longPauses: number;
  endedBy: EndedBy;
  transcript: string | null;
};

export type SpeakingFeedback = {
  answers: number;
  unanswered: number;
  speakingSeconds: number;
  part1AverageSeconds: number | null;
  part2LongTurnSeconds: number | null;
  part3AverageSeconds: number | null;
  longPausesPerMinute: number | null;
  /** Word-based (null without transcripts). */
  wordsSpoken: number | null;
  wordsPerMinute: number | null;
  fillerCount: number | null;
  fillersPer100Words: number | null;
  uniqueWordRatio: number | null;
  longWords: number | null;
  observations: string[];
  limitations: string;
};

const FILLER_RE = /\b(u+m+|u+h+|e+r+m*|a+h+|h+m+|you know|i mean)\b/gi;

function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z']+/g) ?? [];
}

function average(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

const round = (value: number | null, digits = 1) => (value == null ? null : Math.round(value * 10 ** digits) / 10 ** digits);

export function speakingFeedback(turns: FeedbackTurn[]): SpeakingFeedback {
  const answered = turns.filter((t) => t.endedBy !== "no_speech" && t.durationSeconds > 0);
  const speakingSeconds = answered.reduce((sum, t) => sum + t.durationSeconds, 0);
  const longPauses = answered.reduce((sum, t) => sum + t.longPauses, 0);

  const mainAnswers = (part: number) => answered.filter((t) => t.part === part && t.kind !== "repeat").map((t) => t.durationSeconds);
  const part1AverageSeconds = average(mainAnswers(1));
  const part3AverageSeconds = average(mainAnswers(3));
  const part2Turns = answered.filter((t) => t.part === 2);
  // The long turn plus any "anything else?" extension, but not rounding-off answers.
  const part2LongTurnSeconds = part2Turns.length
    ? part2Turns.filter((t, i) => i === 0 || t.kind === "more").reduce((sum, t) => sum + t.durationSeconds, 0)
    : null;

  const transcribed = answered.filter((t) => t.transcript != null);
  const allWords = transcribed.flatMap((t) => words(t.transcript ?? ""));
  const transcribedSeconds = transcribed.reduce((sum, t) => sum + t.durationSeconds, 0);
  const hasWords = transcribed.length > 0 && allWords.length > 0;
  const fillerCount = hasWords ? transcribed.reduce((sum, t) => sum + ((t.transcript ?? "").match(FILLER_RE)?.length ?? 0), 0) : null;
  const contentWords = allWords.filter((w) => !/^(u+m+|u+h+|e+r+m*|a+h+|h+m+)$/.test(w));
  const wordsPerMinute = hasWords && transcribedSeconds > 5 ? (contentWords.length / transcribedSeconds) * 60 : null;
  const uniqueWordRatio = contentWords.length >= 20 ? new Set(contentWords).size / contentWords.length : null;
  const longWords = hasWords ? new Set(contentWords.filter((w) => w.length >= 7)).size : null;
  const fillersPer100Words = fillerCount != null && contentWords.length > 0 ? (fillerCount / contentWords.length) * 100 : null;
  const longPausesPerMinute = speakingSeconds >= 20 ? (longPauses / speakingSeconds) * 60 : null;
  const unanswered = turns.filter((t) => t.endedBy === "no_speech" && t.part !== 0).length;

  const observations: string[] = [];
  if (part2LongTurnSeconds != null) {
    if (part2LongTurnSeconds < 60) {
      observations.push(
        `Your Part 2 talk lasted about ${Math.round(part2LongTurnSeconds)} seconds. In the real test you speak for up to two minutes, so use every bullet on the cue card and add a story or detail for each.`,
      );
    } else if (part2LongTurnSeconds >= 100) {
      observations.push(`You kept the Part 2 talk going for about ${Math.round(part2LongTurnSeconds)} seconds, close to the full two minutes.`);
    }
  }
  if (part1AverageSeconds != null) {
    if (part1AverageSeconds < 8) {
      observations.push("Part 1 answers were very short. Add a reason or a small example to each one: two or three sentences is about right.");
    } else if (part1AverageSeconds > 40) {
      observations.push("Part 1 answers were long. Two or three sentences is enough here; save longer answers for Part 3.");
    }
  }
  if (part3AverageSeconds != null && part3AverageSeconds < 20) {
    observations.push("Part 3 answers were short. Develop them: give your opinion, explain why, then add an example or a comparison.");
  }
  if (wordsPerMinute != null) {
    if (wordsPerMinute < 90) observations.push(`You spoke at about ${Math.round(wordsPerMinute)} words a minute, which is quite slow. Practising familiar topics aloud can build speed.`);
    else if (wordsPerMinute > 190) observations.push(`You spoke at about ${Math.round(wordsPerMinute)} words a minute, which is fast. Slowing down slightly can make you clearer.`);
  }
  if (fillersPer100Words != null && fillersPer100Words > 6) {
    observations.push(`Filler sounds ("um", "uh", "you know") came up about ${Math.round(fillersPer100Words)} times per 100 words. Short silent pauses sound more fluent.`);
  }
  if (longPausesPerMinute != null && longPausesPerMinute > 4) {
    observations.push("There were frequent long pauses. Phrases like \"Let me think...\" or \"That's an interesting question\" can buy time naturally.");
  }
  if (uniqueWordRatio != null && contentWords.length >= 80 && uniqueWordRatio < 0.4) {
    observations.push("Quite a few words were repeated. Try paraphrasing the question and using synonyms.");
  }
  if (unanswered > 0) {
    observations.push(`${unanswered} question${unanswered === 1 ? "" : "s"} went unanswered. In the test, saying something is always better than silence.`);
  }
  if (observations.length === 0 && answered.length > 0) {
    observations.push("Your answer lengths and pauses looked well balanced for each part.");
  }

  return {
    answers: answered.length,
    unanswered,
    speakingSeconds: Math.round(speakingSeconds),
    part1AverageSeconds: round(part1AverageSeconds),
    part2LongTurnSeconds: round(part2LongTurnSeconds),
    part3AverageSeconds: round(part3AverageSeconds),
    longPausesPerMinute: round(longPausesPerMinute),
    wordsSpoken: hasWords ? contentWords.length : null,
    wordsPerMinute: round(wordsPerMinute, 0),
    fillerCount,
    fillersPer100Words: round(fillersPer100Words),
    uniqueWordRatio: round(uniqueWordRatio, 2),
    longWords,
    observations,
    limitations:
      "Practice feedback only, not an IELTS band. It measures timing, pauses and words, not grammar, vocabulary quality or pronunciation. Automatic transcripts can mishear words, especially names and strong accents.",
  };
}
