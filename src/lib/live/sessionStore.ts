/**
 * What a live session produced that never leaves the browser: replayable
 * recordings of each answer, and the full transcript even when the
 * student didn't consent to saving it. Kept in memory per attempt so the
 * results page right after the test can show it; gone on refresh, like
 * the recordings in the classic speaking mode (spec 3.8).
 */

import type { FeedbackTurn } from "./feedback";
import type { TierId } from "./catalog";

export type LocalTurn = FeedbackTurn & {
  promptId: string | null;
  question: string;
  sttModel: TierId | null;
  /** Object URL of a WAV of the answer, if there was speech. */
  audioUrl: string | null;
};

export type LocalSession = {
  turns: LocalTurn[];
  models: { stt: TierId | null; voice: TierId | null; turns: TierId | null; followups: TierId | null };
};

const sessions = new Map<string, LocalSession>();

export function saveLocalSession(attemptId: string, session: LocalSession): void {
  const previous = sessions.get(attemptId);
  previous?.turns.forEach((turn) => turn.audioUrl && URL.revokeObjectURL(turn.audioUrl));
  sessions.set(attemptId, session);
}

export function getLocalSession(attemptId: string): LocalSession | undefined {
  return sessions.get(attemptId);
}
