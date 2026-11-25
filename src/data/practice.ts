import { BookOpen, Headphones, Mic2, PenLine, type LucideIcon } from "lucide-react";

export type SkillKey = "listening" | "reading" | "writing" | "speaking";
export type Track = "academic" | "general";

// The old placeholder practice cards that used to live here were removed in
// Phase 3: every practice card now comes from the published catalog.

export const SKILL_META: Record<SkillKey, { label: string; icon: LucideIcon; tone: "mint" | "blue" | "peach" | "lilac" }> = {
  listening: { label: "Listening", icon: Headphones, tone: "mint" },
  reading: { label: "Reading", icon: BookOpen, tone: "blue" },
  writing: { label: "Writing", icon: PenLine, tone: "peach" },
  speaking: { label: "Speaking", icon: Mic2, tone: "lilac" },
};

export const SKILL_ORDER: SkillKey[] = ["listening", "reading", "writing", "speaking"];
