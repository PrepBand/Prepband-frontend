/** Mirrors prepband-backend's app/schemas/content.py (admin side). */

import type { QuestionType } from "./attemptTypes";

export type Module = "listening" | "reading" | "writing" | "speaking";
export type Track = "academic" | "general" | "both";
export type TestKind = "practice" | "mock";
export type TestStatus = "draft" | "published" | "archived";

export type AdminTest = {
  id: string;
  title: string;
  module: Module;
  track: Track;
  kind: TestKind;
  difficulty: string | null;
  duration_minutes: number | null;
  status: TestStatus;
  current_version_id: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminSection = {
  id: string;
  test_version_id: string;
  module: Module;
  order_index: number;
  instructions: string | null;
  timing_seconds: number | null;
  created_at: string;
};

export type AdminPassage = {
  id: string;
  section_id: string;
  title: string | null;
  body: string;
  source: string | null;
  license: string | null;
  attribution: string | null;
};

export type AdminMediaAsset = {
  id: string;
  section_id: string | null;
  type: "audio" | "image";
  storage_key: string;
  public_url: string | null;
  content_type: string | null;
  duration_seconds: number | null;
  size_bytes: number | null;
  attribution: string | null;
  license: string | null;
  transcript: string | null;
};

export type AdminQuestion = {
  id: string;
  section_id: string;
  type: QuestionType;
  prompt: string;
  options: unknown;
  display_order: number;
  marks: number;
};

export type AdminAnswerKey = {
  id: string;
  question_id: string;
  correct_answers: unknown;
  accepted_aliases: string[] | null;
  rationale: string | null;
};

export type AdminWritingPrompt = {
  id: string;
  section_id: string;
  task_number: 1 | 2;
  prompt: string;
  instructions: string | null;
  min_words: number;
  recommended_minutes: number | null;
  visual: { caption?: string | null; columns: string[]; rows: string[][] } | null;
  letter_format: boolean;
  examiner_notes: string | null;
  display_order: number;
};

export type AdminSpeakingPrompt = {
  id: string;
  section_id: string;
  part: 1 | 2 | 3;
  prompt: string;
  bullets: string[] | null;
  prep_seconds: number | null;
  speak_seconds: number | null;
  display_order: number;
  /** Phase 5: live examiner follow-ups and voice clips. */
  follow_ups: { text: string; audio_url: string | null }[];
  audio_url: string | null;
};

export type AdminSectionContent = AdminSection & {
  passages: AdminPassage[];
  media_assets: AdminMediaAsset[];
  questions: AdminQuestion[];
  answer_keys: AdminAnswerKey[];
  writing_prompts: AdminWritingPrompt[];
  speaking_prompts: AdminSpeakingPrompt[];
};

export type AdminTestContent = {
  test: AdminTest;
  sections: AdminSectionContent[];
  publish_problems: string[];
};

export type AdminOverview = {
  total_users: number;
  admins: number;
  tests_by_status: Record<string, number>;
  published_by_module: Record<string, number>;
  attempts_by_status: Record<string, number>;
};

export type AdminUser = {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  onboarding_completed: boolean;
  created_at: string;
  attempts_total: number;
  attempts_submitted: number;
};

export const MODULE_LABELS: Record<Module, string> = {
  listening: "Listening",
  reading: "Reading",
  writing: "Writing",
  speaking: "Speaking",
};

export const TRACK_LABELS: Record<Track, string> = {
  academic: "Academic",
  general: "General Training",
  both: "Both tracks",
};

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: "Multiple choice",
  multiple_select: "Multiple select",
  true_false_not_given: "True / False / Not Given",
  yes_no_not_given: "Yes / No / Not Given",
  matching: "Matching",
  short_answer: "Short answer",
  sentence_completion: "Sentence completion",
  gap_fill: "Gap fill",
  form_completion: "Form completion",
  note_completion: "Note completion",
  table_completion: "Table completion",
};

export const TEXT_QUESTION_TYPES: QuestionType[] = [
  "short_answer",
  "sentence_completion",
  "gap_fill",
  "form_completion",
  "note_completion",
  "table_completion",
];

// --- Phase 6: audit, bulk, CSV, analytics (prepband-backend app/api/v1/admin_ops.py) ---

export type AuditOutcome = "success" | "denied" | "failed";

export type AuditEntry = {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  method: string;
  path: string;
  entity_type: string | null;
  entity_id: string | null;
  outcome: AuditOutcome;
  status_code: number;
  details: Record<string, unknown>;
  created_at: string;
};

export type AuditPage = { items: AuditEntry[]; total: number; limit: number; offset: number };

export type BulkTestAction = "publish" | "archive" | "restore" | "delete";

export type BulkResult = {
  action: BulkTestAction;
  succeeded: number;
  failed: number;
  results: { id: string; ok: boolean; status: string | null; error: string | null; problems: string[] }[];
};

export type TestAnalytics = {
  test: { id: string; title: string; module: Module; status: TestStatus };
  scored: boolean;
  summary: {
    attempts_started: number;
    attempts_finished: number;
    completion_rate: number | null;
    practice_attempts: number;
    exam_attempts: number;
    average_score_pct: number | null;
    average_band: number | null;
    average_minutes: number | null;
  };
  questions: {
    question_id: string;
    version_number: number;
    section_order: number;
    display_order: number;
    type: QuestionType;
    prompt: string;
    finished_attempts: number;
    answered: number;
    correct: number;
    skipped: number;
    correct_rate: number | null;
    common_wrong_answers: { answer: string; count: number }[];
  }[];
};

export type PlatformAnalytics = {
  weeks: number;
  active_students: number;
  attempts: number;
  by_module: Record<Module, { started: number; finished: number; completion_rate: number | null; average_band: number | null }>;
  weekly: ({ week: string } & Partial<Record<Module, number>>)[];
  top_tests: { test_id: string; title: string; attempts: number }[];
};

export type AdminCertificate = {
  id: string;
  code: string;
  issued_at: string;
  revoked_at: string | null;
  public_verification: boolean;
  mock_attempt_id: string;
  track: "academic" | "general";
  completed_at: string | null;
  revoked_reason: string | null;
  verification_url: string | null;
  student_id: string;
  holder_name: string;
  holder_email: string | null;
};
