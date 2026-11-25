/**
 * Public rubric explanations and self-review prompts for Writing
 * (FR-WRITE-05) and Speaking (FR-SPEAK-07). Original Prepband wording
 * describing the four publicly known IELTS-style criteria. These help
 * students reflect; they never produce a score (FR-WRITE-07, FR-SPEAK-08).
 */

export type RubricCriterion = {
  key: string;
  title: string;
  summary: string;
  ask: string[];
};

export type ChecklistItem = { key: string; label: string };

export const WRITING_RUBRIC: RubricCriterion[] = [
  {
    key: "task",
    title: "Task achievement / response",
    summary: "How fully and relevantly you answered exactly what the task asked.",
    ask: [
      "Did I cover every part of the question or every bullet point?",
      "Task 1: did I give a clear overview of the main features?",
      "Task 2: is my position clear and consistent from start to finish?",
    ],
  },
  {
    key: "coherence",
    title: "Coherence and cohesion",
    summary: "How logically your ideas are organised and connected.",
    ask: [
      "Does each paragraph have one clear main idea?",
      "Do my linking words show real relationships between ideas, not just decoration?",
      "Could a reader follow my argument without rereading?",
    ],
  },
  {
    key: "lexical",
    title: "Lexical resource",
    summary: "The range and accuracy of your vocabulary.",
    ask: [
      "Did I avoid repeating the same words from the question?",
      "Did I use less common words accurately, rather than just to impress?",
      "Are my spelling and word forms correct?",
    ],
  },
  {
    key: "grammar",
    title: "Grammatical range and accuracy",
    summary: "The variety and correctness of your sentence structures.",
    ask: [
      "Did I mix simple and complex sentences?",
      "Are most of my sentences free from errors?",
      "Is my punctuation helping the reader?",
    ],
  },
];

export const WRITING_CHECKLIST: ChecklistItem[] = [
  { key: "planned", label: "I planned before writing" },
  { key: "all_parts", label: "I answered every part of the task" },
  { key: "paragraphs", label: "I used clear paragraphs" },
  { key: "word_count", label: "I reached the minimum word count" },
  { key: "checked", label: "I left time to check my writing" },
];

export const SPEAKING_RUBRIC: RubricCriterion[] = [
  {
    key: "fluency",
    title: "Fluency and coherence",
    summary: "How smoothly you speak and how well your ideas connect.",
    ask: [
      "Did I keep talking without long pauses or restarting sentences?",
      "Did I extend my answers with reasons and examples?",
      "In Part 2, did I keep going for most of the two minutes?",
    ],
  },
  {
    key: "lexical",
    title: "Lexical resource",
    summary: "The range and precision of your vocabulary when speaking.",
    ask: [
      "Could I explain things even when I didn't know the exact word?",
      "Did I use some less common or topic-specific words?",
    ],
  },
  {
    key: "grammar",
    title: "Grammatical range and accuracy",
    summary: "The variety and correctness of your spoken grammar.",
    ask: ["Did I use past, present and future forms correctly?", "Did I try some longer, complex sentences?"],
  },
  {
    key: "pronunciation",
    title: "Pronunciation",
    summary: "How easy you are to understand.",
    ask: [
      "Listening back, is every word clear?",
      "Did I use stress and intonation to sound natural, not flat?",
    ],
  },
];

export const SPEAKING_CHECKLIST: ChecklistItem[] = [
  { key: "listened_back", label: "I listened back to my recordings" },
  { key: "extended", label: "I extended my answers beyond one sentence" },
  { key: "part2_time", label: "I spoke for most of the Part 2 time" },
  { key: "examples", label: "I gave reasons and examples in Part 3" },
  { key: "clear", label: "My pronunciation was clear when I listened back" },
];

export const NOT_ASSESSED_EXPLANATION =
  "Not assessed: Prepband doesn't give a band score for Writing or Speaking. Reliable scores need a trained examiner, and an automated guess could mislead you. Use the diagnostics, the rubric and your own self-review instead.";
