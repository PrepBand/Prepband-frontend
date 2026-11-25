import type { ProgressOut, ProgressPoint, SkillModule } from "./attemptTypes";

/**
 * A weekly study plan built from what the student told us at onboarding
 * (exam date, preparation level, target scores) and what they've done
 * (finished attempts). Pure and deterministic, so it's easy to test and
 * needs no server.
 *
 * Honest by design: Listening and Reading use the latest *estimated* band;
 * Writing and Speaking are never scored, so the plan only asks for regular
 * practice there and never claims a gap.
 */

export type PrepLevel = "beginner" | "intermediate" | "advanced";

export type PlanInput = {
  examDate: string | null;
  preparationLevel: PrepLevel | null;
  targets: Partial<Record<SkillModule | "overall", number | null>>;
  progress: ProgressOut | null;
  today?: Date;
};

export type FocusStatus = "no_data" | "no_target" | "behind" | "on_track" | "practice_only";

export type ModuleFocus = {
  module: SkillModule;
  sessionsPerWeek: number;
  status: FocusStatus;
  latestBand: number | null;
  target: number | null;
  /** Finished sessions in the last 14 days. */
  recentSessions: number;
  reason: string;
};

export type Milestone = { date: string; title: string; detail: string };

export type PlanPhase = "no_date" | "past" | "final_week" | "final_stretch" | "build" | "foundation";

export type StudyPlan = {
  phase: PlanPhase;
  daysLeft: number | null;
  weeksLeft: number | null;
  sessionsPerWeek: number;
  focus: ModuleFocus[];
  mockAdvice: string;
  milestones: Milestone[];
  headline: string;
};

const MODULES: SkillModule[] = ["listening", "reading", "writing", "speaking"];
const BASE_SESSIONS: Record<PrepLevel, number> = { beginner: 6, intermediate: 5, advanced: 4 };
const DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function isoDay(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseDay(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime();
}

function latestBandFor(points: ProgressPoint[], module: SkillModule): number | null {
  for (let i = points.length - 1; i >= 0; i -= 1) {
    if (points[i].module === module && points[i].estimated_band != null) return points[i].estimated_band;
  }
  return null;
}

function phaseFor(daysLeft: number | null): PlanPhase {
  if (daysLeft == null) return "no_date";
  if (daysLeft < 0) return "past";
  if (daysLeft <= 7) return "final_week";
  if (daysLeft <= 28) return "final_stretch";
  if (daysLeft <= 84) return "build";
  return "foundation";
}

export function buildStudyPlan(input: PlanInput): StudyPlan {
  const today = startOfDay(input.today ?? new Date());
  const examDay = input.examDate ? parseDay(input.examDate) : null;
  const daysLeft = examDay == null ? null : Math.round((examDay - today) / DAY);
  const weeksLeft = daysLeft == null || daysLeft < 0 ? null : Math.max(0, Math.ceil(daysLeft / 7));
  const phase = phaseFor(daysLeft);
  const points = input.progress?.points ?? [];
  const level = input.preparationLevel ?? "intermediate";

  // More sessions as the exam gets close, fewer in the final days (rest).
  let sessionsPerWeek = BASE_SESSIONS[level];
  if (phase === "final_stretch") sessionsPerWeek += 1;
  // Never below one session per skill: every skill gets at least one below,
  // so a lower total would promise fewer sessions than the plan asks for.
  if (phase === "final_week") sessionsPerWeek = Math.max(MODULES.length, sessionsPerWeek - 2);

  const twoWeeksAgo = today - 14 * DAY;
  const focus: ModuleFocus[] = MODULES.map((module) => {
    const recentSessions = points.filter((p) => p.module === module && (parseDay(p.submitted_at) ?? 0) >= twoWeeksAgo).length;
    const target = input.targets[module] ?? input.targets.overall ?? null;
    if (module === "writing" || module === "speaking") {
      return {
        module,
        sessionsPerWeek: 1,
        status: "practice_only",
        latestBand: null,
        target,
        recentSessions,
        reason:
          recentSessions === 0
            ? "No session in the last two weeks. Regular practice matters most here, since Prepband doesn't score it."
            : "Keep a steady weekly session and use the self-review checklist afterwards.",
      };
    }
    const latestBand = latestBandFor(points, module);
    if (latestBand == null) {
      return {
        module,
        sessionsPerWeek: 1,
        status: "no_data",
        latestBand,
        target,
        recentSessions,
        reason: "Take one practice test first, so the plan can see where you are.",
      };
    }
    const behind = target != null && latestBand < target;
    return {
      module,
      sessionsPerWeek: 1,
      status: target == null ? "no_target" : behind ? "behind" : "on_track",
      latestBand,
      target,
      recentSessions,
      reason: behind
        ? `Latest estimate ${latestBand.toFixed(1)}, target ${target!.toFixed(1)}: this gets extra sessions.`
        : target != null
          ? `Latest estimate ${latestBand.toFixed(1)} meets your target of ${target.toFixed(1)}. Keep it warm.`
          : `Latest estimate ${latestBand.toFixed(1)}. Set a target in your profile to sharpen the plan.`,
    };
  });

  // Hand out the remaining sessions one at a time to whichever skill has
  // the most gap per session it already has, so a bigger gap gets more
  // practice without one skill taking everything. Skills with no estimate
  // yet count as a one-band gap; if nothing is behind, Listening and
  // Reading share the rest.
  let spare = sessionsPerWeek - focus.reduce((sum, f) => sum + f.sessionsPerWeek, 0);
  const weight = (f: ModuleFocus) => (f.status === "behind" ? (f.target ?? 0) - (f.latestBand ?? 0) : 1);
  const extra = focus.filter((f) => f.status === "behind" || f.status === "no_data");
  const pool = extra.length ? extra : focus.filter((f) => f.module === "listening" || f.module === "reading");
  while (spare > 0 && pool.length) {
    const next = pool.reduce((best, f) => (weight(f) / f.sessionsPerWeek > weight(best) / best.sessionsPerWeek ? f : best));
    next.sessionsPerWeek += 1;
    spare -= 1;
  }

  const fullMocks = input.progress?.full_mocks_completed ?? 0;
  const mockAdvice =
    phase === "past"
      ? "Your exam date has passed. Update it in your profile to get a new plan."
      : fullMocks === 0
        ? "Take a full mock soon: it sets your baseline under real timing."
        : phase === "final_week"
          ? "One last full mock early this week, then light review. Rest the day before."
          : phase === "final_stretch"
            ? "A full mock every week until the final week."
            : "A full mock every two weeks to check progress under exam timing.";

  const milestones: Milestone[] = [];
  if (examDay != null && daysLeft != null && daysLeft >= 0) {
    const add = (offsetDays: number, title: string, detail: string) => {
      const when = examDay - offsetDays * DAY;
      if (when >= today) milestones.push({ date: isoDay(when), title, detail });
    };
    add(28, "Start the final stretch", "Weekly full mocks begin; review every mistake from them.");
    add(7, "Last full mock", "Take it under exam conditions, then only light practice.");
    add(1, "Rest", "No new tests. Sleep well and check your exam-day documents.");
    milestones.push({ date: isoDay(examDay), title: "Exam day", detail: "Good luck." });
    milestones.sort((a, b) => a.date.localeCompare(b.date));
  }

  const headline =
    phase === "no_date"
      ? "Add your exam date to get a plan with real dates."
      : phase === "past"
        ? "Your exam date has passed."
        : daysLeft === 0
          ? "Your exam is today."
          : `${daysLeft} day${daysLeft === 1 ? "" : "s"} to your exam: ${sessionsPerWeek} sessions a week.`;

  return { phase, daysLeft, weeksLeft, sessionsPerWeek, focus, mockAdvice, milestones, headline };
}
