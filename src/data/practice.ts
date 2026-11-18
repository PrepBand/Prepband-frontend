import { BookOpen, Headphones, Mic2, PenLine, type LucideIcon } from "lucide-react";

export type SkillKey = "listening" | "reading" | "writing" | "speaking";
export type Track = "academic" | "general";

export type PracticeSet = {
  skill: SkillKey;
  slug: string;
  title: string;
  description: string;
  durationMinutes: number;
  level: string;
  /** Real IELTS structure: Listening and Speaking are shared across tracks; only Reading and Writing differ. */
  track: Track | "both";
};

export const SKILL_META: Record<SkillKey, { label: string; icon: LucideIcon; tone: "mint" | "blue" | "peach" | "lilac" }> = {
  listening: { label: "Listening", icon: Headphones, tone: "mint" },
  reading: { label: "Reading", icon: BookOpen, tone: "blue" },
  writing: { label: "Writing", icon: PenLine, tone: "peach" },
  speaking: { label: "Speaking", icon: Mic2, tone: "lilac" },
};

export const SKILL_ORDER: SkillKey[] = ["listening", "reading", "writing", "speaking"];

export const practiceSets: PracticeSet[] = [
  {
    skill: "listening",
    slug: "a-place-to-call-home",
    title: "A place to call home",
    description: "Build your skills with original questions and clear answer explanations.",
    durationMinutes: 15,
    level: "Foundation",
    track: "both",
  },
  {
    skill: "reading",
    slug: "the-quiet-power-of-urban-gardens",
    title: "The quiet power of urban gardens",
    description: "Build your skills with original questions and clear answer explanations.",
    durationMinutes: 15,
    level: "Foundation",
    track: "academic",
  },
  {
    skill: "reading",
    slug: "finding-your-way-around-town",
    title: "Finding your way around town",
    description: "Practice everyday notices, signs and short texts, the General Training way.",
    durationMinutes: 15,
    level: "Foundation",
    track: "general",
  },
  {
    skill: "writing",
    slug: "our-cities-our-future",
    title: "Our cities, our future",
    description: "Develop your response with a structured prompt and honest self-review.",
    durationMinutes: 40,
    level: "Foundation",
    track: "academic",
  },
  {
    skill: "writing",
    slug: "a-letter-to-your-landlord",
    title: "A letter to your landlord",
    description: "Practice a Task 1 letter and a Task 2 opinion essay, with honest self-review.",
    durationMinutes: 40,
    level: "Foundation",
    track: "general",
  },
  {
    skill: "speaking",
    slug: "the-places-we-call-home",
    title: "The places we call home",
    description: "Practice with scripted prompts, a local recorder, and reflection.",
    durationMinutes: 12,
    level: "Foundation",
    track: "both",
  },
];

export function practiceSetsForTrack(track: Track): PracticeSet[] {
  return practiceSets.filter((set) => set.track === "both" || set.track === track);
}
