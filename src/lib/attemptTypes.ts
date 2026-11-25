/** Mirrors prepband-backend's app/schemas/content.py and attempts.py. */

export type QuestionType =
  | "multiple_choice"
  | "multiple_select"
  | "true_false_not_given"
  | "yes_no_not_given"
  | "matching"
  | "short_answer"
  | "sentence_completion"
  | "gap_fill"
  | "form_completion"
  | "note_completion"
  | "table_completion";

export type TestCatalogItem = {
  id: string;
  title: string;
  module: string;
  track: string;
  kind: "practice" | "mock";
  difficulty: string | null;
  duration_minutes: number | null;
};

export type PassagePublic = {
  id: string;
  title: string | null;
  body: string;
  source: string | null;
  license: string | null;
  attribution: string | null;
};

export type MediaAssetPublic = {
  id: string;
  type: "audio" | "image";
  public_url: string | null;
  content_type: string | null;
  duration_seconds: number | null;
  attribution: string | null;
  license: string | null;
};

export type QuestionPublic = {
  id: string;
  type: QuestionType;
  prompt: string;
  options: unknown;
  display_order: number;
  marks: number;
};

export type SectionPublic = {
  id: string;
  module: string;
  order_index: number;
  instructions: string | null;
  timing_seconds: number | null;
  passages: PassagePublic[];
  media_assets: MediaAssetPublic[];
  questions: QuestionPublic[];
  writing_prompts: WritingPromptPublic[];
  speaking_prompts: SpeakingPromptPublic[];
};

export type TestDetail = TestCatalogItem & { sections: SectionPublic[] };

export type AttemptStatus = "in_progress" | "submitted" | "expired" | "cancelled";
export type AttemptMode = "practice" | "exam";

export type AttemptOut = {
  id: string;
  test_version_id: string;
  status: AttemptStatus;
  mode: AttemptMode;
  started_at: string;
  expires_at: string | null;
  submitted_at: string | null;
  raw_score: number | null;
  max_score: number | null;
  estimated_band: number | null;
  assessment_status: AssessmentStatus;
};

export type ResponseOut = {
  question_id: string;
  response: unknown;
  version: number;
  saved_at: string;
  /** The browser's change number for this save; older saves are ignored. */
  client_seq?: number | null;
};

export type AttemptWithResponses = AttemptOut & {
  responses: ResponseOut[];
  writing_responses: WritingResponseOut[];
  speaking_responses: SpeakingResponseOut[];
};

export type ResultQuestion = {
  question_id: string;
  type: QuestionType;
  prompt: string;
  your_answer: unknown;
  correct_answers: unknown;
  accepted_aliases: unknown;
  is_correct: boolean;
  marks_awarded: number;
  marks_available: number;
  rationale: string | null;
};

export type MediaTranscriptOut = {
  media_asset_id: string;
  type: "audio" | "image";
  transcript: string | null;
};

export type ResultsOut = AttemptOut & {
  module: "listening" | "reading" | "writing" | "speaking";
  questions: ResultQuestion[];
  media_transcripts: MediaTranscriptOut[];
  writing: WritingResult[];
  speaking: SpeakingResult[];
  self_review: SelfReview | null;
};

// --- Phase 3: Writing and Speaking -------------------------------------

export type AssessmentStatus = "objective" | "not_assessed";

export type WritingVisual = { caption?: string | null; columns: string[]; rows: string[][] };

export type WritingPromptPublic = {
  id: string;
  task_number: 1 | 2;
  prompt: string;
  instructions: string | null;
  min_words: number;
  recommended_minutes: number | null;
  visual: WritingVisual | null;
  letter_format: boolean;
  display_order: number;
};

export type SpeakingPromptPublic = {
  id: string;
  part: 1 | 2 | 3;
  prompt: string;
  bullets: string[] | null;
  prep_seconds: number | null;
  speak_seconds: number | null;
  display_order: number;
  /** Phase 5: the live examiner's follow-ups and optional voice clip. */
  follow_ups: { text: string; audio_url: string | null }[];
  audio_url: string | null;
};

export type WritingResponseOut = {
  writing_prompt_id: string;
  body: string;
  word_count: number;
  version: number;
  saved_at: string;
  client_seq?: number | null;
};

export type SpeakingResponseMode = "audio" | "text" | "live";

/** Phase 5: one examiner question in live mode and how it was answered. */
export type LiveTurn = {
  kind: "question" | "follow_up" | "repeat" | "more";
  text: string;
  duration_seconds: number;
  long_pauses: number;
  ended_by: "silence" | "time" | "button" | "no_speech";
  transcript: string | null;
  stt_model: string | null;
};

export type SpeakingResponseIn = {
  response_mode: SpeakingResponseMode;
  duration_seconds: number | null;
  text_response: string | null;
  completed: boolean;
  /** Live mode only. Transcripts are kept on the server only with consent. */
  save_transcript?: boolean;
  transcript?: string | null;
  stt_model?: string | null;
  turns?: LiveTurn[] | null;
};

export type SpeakingResponseOut = SpeakingResponseIn & {
  speaking_prompt_id: string;
  version: number;
  saved_at: string;
  client_seq?: number | null;
};

export type WritingDiagnostics = {
  word_count: number;
  min_words: number;
  meets_minimum: boolean;
  paragraph_count: number;
  sentence_count: number;
  average_sentence_length: number;
  longest_sentence_words: number;
  unique_word_ratio: number;
  long_word_count: number;
  linking_words_used: string[];
  letter: { has_greeting: boolean; has_sign_off: boolean } | null;
  observations: string[];
  limitations: string;
};

export type WritingResult = {
  writing_prompt_id: string;
  task_number: number;
  prompt: string;
  min_words: number;
  body: string;
  word_count: number;
  diagnostics: WritingDiagnostics | null;
  examiner_notes: string | null;
};

export type SpeakingResult = {
  speaking_prompt_id: string;
  part: number;
  prompt: string;
  bullets: string[] | null;
  response_mode: SpeakingResponseMode | null;
  duration_seconds: number | null;
  text_response: string | null;
  completed: boolean;
  transcript?: string | null;
  stt_model?: string | null;
  turns?: LiveTurn[] | null;
};

export type SelfReview = {
  ratings: Record<string, number>;
  checklist: string[];
  notes: string | null;
  updated_at?: string;
};

export type AttemptHistoryItem = {
  id: string;
  test_id: string;
  test_title: string;
  module: "listening" | "reading" | "writing" | "speaking";
  track: string;
  kind: "practice" | "mock";
  status: AttemptStatus;
  mode: AttemptMode;
  assessment_status: AssessmentStatus;
  started_at: string;
  submitted_at: string | null;
  raw_score: number | null;
  max_score: number | null;
  estimated_band: number | null;
  words_written: number | null;
  speaking_answers: number | null;
  mock_attempt_id: string | null;
};

// --- Phase 4: history, progress, full mock, certificates ----------------

export type SkillModule = "listening" | "reading" | "writing" | "speaking";

export type AttemptHistoryPage = {
  items: AttemptHistoryItem[];
  total: number;
  limit: number;
  offset: number;
};

export type ProgressPoint = {
  attempt_id: string;
  module: SkillModule;
  test_title: string;
  kind: "practice" | "mock";
  started_at: string;
  submitted_at: string;
  assessment_status: AssessmentStatus;
  raw_score: number | null;
  max_score: number | null;
  percentage: number | null;
  estimated_band: number | null;
  words_written: number | null;
  speaking_answers: number | null;
};

export type ProgressOut = {
  completed_by_module: Record<SkillModule, number>;
  points: ProgressPoint[];
  full_mocks_completed: number;
  certificates: number;
};

export type MockTrack = "academic" | "general";
export type MockStatus = "in_progress" | "completed" | "abandoned";
export type ModuleProgressStatus = "not_started" | AttemptStatus;

export type CertificateSummary = {
  id: string;
  code: string;
  issued_at: string;
  revoked_at: string | null;
  public_verification: boolean;
};

export type MockModuleOut = {
  module: SkillModule;
  test_id: string;
  test_title: string;
  duration_minutes: number | null;
  attempt_id: string | null;
  status: ModuleProgressStatus;
  started_at: string | null;
  expires_at: string | null;
  submitted_at: string | null;
  is_next: boolean;
};

export type MockOut = {
  id: string;
  track: MockTrack;
  status: MockStatus;
  started_at: string;
  completed_at: string | null;
  modules: MockModuleOut[];
  completed_modules: number;
  next_module: SkillModule | null;
  certificate: CertificateSummary | null;
};

export type MockModuleResult = {
  module: SkillModule;
  test_title: string;
  attempt_id: string | null;
  status: ModuleProgressStatus;
  mode: AttemptMode | null;
  assessment_status: AssessmentStatus;
  raw_score: number | null;
  max_score: number | null;
  estimated_band: number | null;
  submitted_at: string | null;
  words_written: number | null;
  tasks_answered: number | null;
  tasks_total: number | null;
  speaking_answers: number | null;
  speaking_prompts_total: number | null;
};

export type MockResultsOut = {
  id: string;
  track: MockTrack;
  status: MockStatus;
  started_at: string;
  completed_at: string | null;
  modules: MockModuleResult[];
  overall_band: number | null;
  overall_band_note: string;
  band_note: string;
  certificate: CertificateSummary | null;
};

export type MockModuleStart = {
  mock_id: string;
  module: SkillModule;
  attempt_id: string;
  test_id: string;
  status: AttemptStatus;
};

export type CertificateOut = CertificateSummary & {
  mock_attempt_id: string;
  track: MockTrack;
  completed_at: string | null;
  revoked_reason: string | null;
  verification_url: string | null;
};

export type CertificateDetail = CertificateOut & {
  holder_name: string;
  modules: MockModuleResult[];
  overall_band: number | null;
  overall_band_note: string;
};

export type VerificationOut = {
  code: string;
  status: "valid" | "revoked";
  issued_on: string;
  statement: string;
};

/** GET /me/mistakes: questions lost marks on, from finished attempts. */
export type MistakeOut = {
  question_id: string;
  type: QuestionType;
  prompt: string;
  options: unknown;
  marks: number;
  marks_awarded: number;
  your_answer: unknown;
  correct_answers: unknown;
  accepted_aliases: unknown;
  rationale: string | null;
  instructions: string | null;
  module: "listening" | "reading";
  test_title: string;
  attempt_id: string;
  submitted_at: string | null;
};

export type MistakesPage = {
  items: MistakeOut[];
  total: number;
  by_module: Record<"listening" | "reading", number>;
};

/** POST /me/mistakes/{id}/check: a retry marked by the real grader. */
export type RetryOut = {
  correct: boolean;
  credit: number;
  correct_answers: unknown;
  accepted_aliases: unknown;
  rationale: string | null;
};
