import { api } from "../apiClient";

/**
 * The examiner's fixed lines. The defaults match what migration 0008
 * seeds; admins can reword them and attach voice clips, and the live
 * examiner uses the database version when it loads.
 */

export const PHRASE_KEYS = [
  "greeting",
  "ask_name",
  "ask_origin",
  "part1_intro",
  "part2_intro",
  "part2_start",
  "part2_stop",
  "part3_intro",
  "ack_1",
  "ack_2",
  "ack_3",
  "ack_4",
  "more",
  "part2_more",
  "why",
  "example",
  "take_time",
  "repeat_intro",
  "no_answer",
  "time_up",
  "move_on",
  "end",
] as const;

export type PhraseKey = (typeof PHRASE_KEYS)[number];
export type Phrase = { text: string; audioUrl: string | null };
export type Phrases = Record<PhraseKey, Phrase>;

const DEFAULT_TEXT: Record<PhraseKey, string> = {
  greeting: "Hello. I'm your AI practice examiner for this speaking test. It has three parts, just like the real exam.",
  ask_name: "Can you tell me your full name, please?",
  ask_origin: "Thank you. And where are you from?",
  part1_intro: "Now, in this first part, I'd like to ask you some questions about yourself.",
  part2_intro:
    "Now I'm going to give you a topic, and I'd like you to talk about it for one to two minutes. Before you talk, you'll have one minute to think about what you're going to say. You can make some notes if you wish.",
  part2_start:
    "All right? Remember, you have one to two minutes for this, so don't worry if I stop you. I'll tell you when the time is up. Can you start speaking now, please?",
  part2_stop: "Thank you.",
  part3_intro: "We've been talking about this topic. Now I'd like to discuss with you some more general questions related to it.",
  ack_1: "Mm-hm.",
  ack_2: "I see.",
  ack_3: "Okay.",
  ack_4: "Right.",
  more: "Could you tell me a little more about that?",
  part2_more: "Is there anything else you can tell me about it?",
  why: "Why do you think that is?",
  example: "Can you give me an example?",
  take_time: "Take your time.",
  repeat_intro: "Of course. I'll repeat the question.",
  no_answer: "That's all right. Let's try another question.",
  time_up: "Thank you.",
  move_on: "Thank you. Let's move on.",
  end: "Thank you. That is the end of the speaking test.",
};

export function defaultPhrases(): Phrases {
  return Object.fromEntries(PHRASE_KEYS.map((key) => [key, { text: DEFAULT_TEXT[key], audioUrl: null }])) as Phrases;
}

export type ExaminerPhraseOut = { key: string; text: string; audio_url: string | null; updated_at: string };

/** Admin-edited lines from the API on top of the defaults; defaults if the API is unreachable. */
export async function loadPhrases(): Promise<Phrases> {
  const phrases = defaultPhrases();
  try {
    const rows = await api.get<ExaminerPhraseOut[]>("/examiner/phrases");
    for (const row of rows) {
      if ((PHRASE_KEYS as readonly string[]).includes(row.key)) {
        phrases[row.key as PhraseKey] = { text: row.text, audioUrl: row.audio_url };
      }
    }
  } catch {
    /* defaults are fine */
  }
  return phrases;
}
