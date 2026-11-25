import { useEffect, useState } from "react";
import { api, describeError } from "./apiClient";
import type { ProgressOut, ProgressPoint, SkillModule } from "./attemptTypes";

export function useProgress() {
  const [progress, setProgress] = useState<ProgressOut | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<ProgressOut>("/me/progress")
      .then(setProgress)
      .catch((err) => setError(describeError(err, "Couldn't load your progress.")));
  }, []);

  return { progress, error };
}

/** Highest estimated band from any objectively marked attempt. */
export function bestBand(points: ProgressPoint[]): number | null {
  const bands = points.map((p) => p.estimated_band).filter((b): b is number => b != null);
  return bands.length ? Math.max(...bands) : null;
}

/** Most recent estimated band for one skill (Listening/Reading only). */
export function latestBand(points: ProgressPoint[], module: SkillModule): number | null {
  for (let i = points.length - 1; i >= 0; i -= 1) {
    if (points[i].module === module && points[i].estimated_band != null) return points[i].estimated_band;
  }
  return null;
}

function localDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Consecutive days, ending today or yesterday, with at least one finished attempt. */
export function streakDays(points: ProgressPoint[]): number {
  const days = new Set(points.map((p) => localDay(new Date(p.submitted_at))));
  const dayMs = 24 * 60 * 60 * 1000;
  let cursor = localDay(new Date());
  if (!days.has(cursor)) cursor -= dayMs;
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor -= dayMs;
  }
  return streak;
}

/** Time spent in finished attempts, from start to submission (capped at 4h each). */
export function studyMinutes(points: ProgressPoint[]): number {
  const total = points.reduce((sum, p) => {
    const ms = new Date(p.submitted_at).getTime() - new Date(p.started_at).getTime();
    return sum + Math.min(Math.max(ms, 0), 4 * 60 * 60 * 1000);
  }, 0);
  return Math.round(total / 60000);
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}
