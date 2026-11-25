import type { MockModuleResult, ModuleProgressStatus } from "./attemptTypes";

export const MODULE_STATUS_LABEL: Record<ModuleProgressStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  expired: "Time ran out",
  cancelled: "Cancelled",
};

export function isModuleFinished(status: ModuleProgressStatus): boolean {
  return status === "submitted" || status === "expired";
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  return new Date(value).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** One module's outcome, worded the same way as on the certificate PDF. */
export function moduleOutcome(result: MockModuleResult): string {
  if (!isModuleFinished(result.status)) return "Not completed";
  const timedOut = result.status === "expired" ? " (time ran out)" : "";
  if (result.module === "listening" || result.module === "reading") {
    const score = result.raw_score != null && result.max_score != null ? `${result.raw_score} / ${result.max_score} correct` : "No score";
    const band = result.estimated_band != null ? ` · est. band ${result.estimated_band.toFixed(1)}` : "";
    return score + band + timedOut;
  }
  if (result.module === "writing") {
    return `${result.tasks_answered ?? 0} of ${result.tasks_total ?? 0} tasks submitted · ${result.words_written ?? 0} words${timedOut}`;
  }
  return `${result.speaking_answers ?? 0} of ${result.speaking_prompts_total ?? 0} prompts answered${timedOut}`;
}

/** FR-RESULT-04: how a module's outcome was produced. */
export function moduleProvenance(result: MockModuleResult): string {
  if (!isModuleFinished(result.status)) return "-";
  return result.assessment_status === "objective" ? "Marked against an answer key; band is approximate" : "Not assessed";
}
