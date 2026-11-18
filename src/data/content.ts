import {
  BookOpen,
  Headphones,
  Mic2,
  PenLine,
  type LucideIcon,
} from "lucide-react";

export type Skill = {
  name: string;
  description: string;
  detail: string;
  icon: LucideIcon;
  tone: string;
};

export const skills: Skill[] = [
  {
    name: "Listening",
    description: "Tune in to the details.",
    detail: "Original audio, focused question sets, and a clear review after you submit.",
    icon: Headphones,
    tone: "mint",
  },
  {
    name: "Reading",
    description: "Make every passage count.",
    detail: "Build a steady reading rhythm with timed, IELTS-style passages and questions.",
    icon: BookOpen,
    tone: "blue",
  },
  {
    name: "Writing",
    description: "Get your ideas into shape.",
    detail: "Practice both tasks with a live word count and practical, objective diagnostics.",
    icon: PenLine,
    tone: "peach",
  },
  {
    name: "Speaking",
    description: "Find your voice, one prompt at a time.",
    detail: "Work through a guided three-part practice, with a text option if needed.",
    icon: Mic2,
    tone: "lilac",
  },
];

export const faqs = [
  {
    question: "Is Prepband an official IELTS product?",
    answer:
      "No. Prepband is an independent IELTS-style practice platform and is not affiliated with or endorsed by IELTS or its partner organizations. It does not issue official test results or qualifications.",
  },
  {
    question: "Will I get a band score for every skill?",
    answer:
      "Listening and Reading can receive objective practice scores, with any band conversion clearly labeled as an estimate. Writing and Speaking are not assigned an automated band score in the MVP; you'll see completion status and practical diagnostics instead.",
  },
  {
    question: "Does practice cost anything?",
    answer:
      "The planned MVP is designed to run on provider free tiers without paid AI services. Free-tier limits and availability can change, so the platform will communicate service limits rather than promise unlimited access or uptime.",
  },
  {
    question: "Can I take a full mock test?",
    answer:
      "Yes. The planned full mock guides you through Listening, Reading, Writing, and Speaking, then brings together your objective scores and completion information in one review.",
  },
];
