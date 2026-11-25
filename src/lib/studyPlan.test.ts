import { describe, expect, it } from "vitest";
import type { ProgressOut, ProgressPoint } from "./attemptTypes";
import { buildStudyPlan } from "./studyPlan";

const today = new Date(2026, 10, 25); // 25 Nov 2026

function point(module: ProgressPoint["module"], band: number | null, submitted = "2026-11-20T10:00:00Z"): ProgressPoint {
  return {
    attempt_id: `${module}-${band}`,
    module,
    test_title: "T",
    kind: "practice",
    started_at: submitted,
    submitted_at: submitted,
    assessment_status: band == null ? "not_assessed" : "objective",
    raw_score: null,
    max_score: null,
    percentage: null,
    estimated_band: band,
    words_written: null,
    speaking_answers: null,
  };
}

function progress(points: ProgressPoint[], fullMocks = 0): ProgressOut {
  return { completed_by_module: { listening: 0, reading: 0, writing: 0, speaking: 0 }, points, full_mocks_completed: fullMocks, certificates: 0 };
}

describe("buildStudyPlan", () => {
  it("asks for an exam date when there is none", () => {
    const plan = buildStudyPlan({ examDate: null, preparationLevel: null, targets: {}, progress: null, today });
    expect(plan.phase).toBe("no_date");
    expect(plan.daysLeft).toBeNull();
    expect(plan.milestones).toEqual([]);
    expect(plan.headline).toMatch(/Add your exam date/);
  });

  it("counts the days and lays out milestones before the exam", () => {
    const plan = buildStudyPlan({ examDate: "2027-01-31", preparationLevel: "intermediate", targets: {}, progress: null, today });
    expect(plan.daysLeft).toBe(67);
    expect(plan.phase).toBe("build");
    expect(plan.milestones.map((m) => m.date)).toEqual(["2027-01-03", "2027-01-24", "2027-01-30", "2027-01-31"]);
    expect(plan.milestones.at(-1)!.title).toBe("Exam day");
  });

  it("gives the biggest gap the extra sessions and never scores Writing or Speaking", () => {
    const plan = buildStudyPlan({
      examDate: "2027-02-28",
      preparationLevel: "beginner",
      targets: { listening: 7, reading: 7, writing: 7, speaking: 7 },
      progress: progress([point("listening", 6.5), point("reading", 5.5), point("writing", null)]),
      today,
    });
    const by = Object.fromEntries(plan.focus.map((f) => [f.module, f]));
    expect(plan.sessionsPerWeek).toBe(6);
    expect(plan.focus.reduce((sum, f) => sum + f.sessionsPerWeek, 0)).toBe(6);
    expect(by.reading.status).toBe("behind");
    expect(by.reading.sessionsPerWeek).toBeGreaterThan(by.listening.sessionsPerWeek);
    expect(by.writing.status).toBe("practice_only");
    expect(by.writing.latestBand).toBeNull();
    expect(by.speaking.recentSessions).toBe(0);
  });

  it("asks for a first test where there's no estimate yet", () => {
    const plan = buildStudyPlan({ examDate: null, preparationLevel: "advanced", targets: { overall: 7 }, progress: progress([]), today });
    expect(plan.focus.find((f) => f.module === "reading")!.status).toBe("no_data");
    expect(plan.mockAdvice).toMatch(/baseline/);
  });

  it("never calls a skill on track when there is no target to compare with", () => {
    const plan = buildStudyPlan({ examDate: null, preparationLevel: null, targets: {}, progress: progress([point("reading", 6)]), today });
    const reading = plan.focus.find((f) => f.module === "reading")!;
    expect(reading.status).toBe("no_target");
    expect(reading.reason).toMatch(/Set a target/);
  });

  it("eases off in the final week", () => {
    const plan = buildStudyPlan({ examDate: "2026-11-29", preparationLevel: "beginner", targets: {}, progress: progress([], 2), today });
    expect(plan.phase).toBe("final_week");
    expect(plan.sessionsPerWeek).toBe(4);
    expect(plan.mockAdvice).toMatch(/last full mock/i);
  });

  it("keeps the final-week total equal to the per-skill split", () => {
    for (const level of ["beginner", "intermediate", "advanced"] as const) {
      const plan = buildStudyPlan({ examDate: "2026-11-29", preparationLevel: level, targets: {}, progress: progress([], 2), today });
      expect(plan.phase).toBe("final_week");
      expect(plan.focus.reduce((sum, f) => sum + f.sessionsPerWeek, 0)).toBe(plan.sessionsPerWeek);
      expect(plan.headline).toContain(`${plan.sessionsPerWeek} sessions a week`);
    }
  });

  it("says so when the exam date has passed", () => {
    const plan = buildStudyPlan({ examDate: "2026-10-01", preparationLevel: null, targets: {}, progress: null, today });
    expect(plan.phase).toBe("past");
    expect(plan.weeksLeft).toBeNull();
    expect(plan.milestones).toEqual([]);
  });
});
