// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const get = vi.fn();
const post = vi.fn();

vi.mock("../lib/supabaseClient", async () => ({ supabase: (await import("./supabaseMock")).supabaseMock }));
vi.mock("../lib/AuthProvider", () => ({ useAuth: () => ({ session: { user: { id: "u1", email: "a@example.test" } } }) }));
vi.mock("../lib/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/apiClient")>()),
  api: { get: (path: string) => get(path), post: (path: string, body: unknown) => post(path, body) },
}));
vi.mock("../lib/useProfile", () => ({
  useProfile: () => ({
    loading: false,
    profile: null,
    studyGoal: { exam_date: "2099-01-31", preparation_level: "beginner", ielts_type: "academic" },
    targetScores: { listening: 7, reading: 7, writing: 7, speaking: 7, overall: 7 },
  }),
}));
vi.mock("../lib/useProgress", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/useProgress")>()),
  useProgress: () => ({
    error: "",
    progress: {
      completed_by_module: { listening: 1, reading: 1, writing: 0, speaking: 0 },
      full_mocks_completed: 0,
      certificates: 0,
      points: [
        { attempt_id: "a", module: "reading", test_title: "R", kind: "practice", started_at: "2099-01-01", submitted_at: "2099-01-01", assessment_status: "objective", raw_score: 20, max_score: 40, percentage: 50, estimated_band: 5.5, words_written: null, speaking_answers: null },
      ],
    },
  }),
}));

const { axeViolations, renderAt } = await import("./helpers");
const { ReviewMistakesPage } = await import("../pages/ReviewMistakesPage");
const { StudyPlanPage } = await import("../pages/StudyPlanPage");

const mistake = {
  question_id: "q1",
  type: "short_answer",
  prompt: "Where is the head office?",
  options: { max_words: 1 },
  marks: 1,
  marks_awarded: 0,
  your_answer: "Paris",
  correct_answers: ["London"],
  accepted_aliases: null,
  rationale: "Paragraph B names London.",
  instructions: "Write ONE WORD ONLY.",
  module: "reading",
  test_title: "Reading practice 1",
  attempt_id: "att1",
  submitted_at: "2026-11-20T10:00:00Z",
};

beforeEach(() => {
  get.mockReset();
  post.mockReset();
});
afterEach(() => cleanup());

describe("Review mistakes", () => {
  it("lists a mistake, checks a retry and reveals the explanation", async () => {
    get.mockResolvedValue({ items: [mistake], total: 1, by_module: { listening: 0, reading: 1 } });
    post.mockResolvedValue({ correct: true, credit: 1, correct_answers: ["London"], accepted_aliases: null, rationale: "Paragraph B names London." });
    const { container } = renderAt(<ReviewMistakesPage />, "/app/review");

    expect(await screen.findByText("Where is the head office?")).toBeTruthy();
    expect(get).toHaveBeenCalledWith("/me/mistakes?limit=20&offset=0");
    // The correct answer stays hidden until asked for or checked.
    expect(screen.queryByText("London")).toBeNull();

    fireEvent.change(screen.getByRole("textbox", { name: "Your answer" }), { target: { value: "London" } });
    fireEvent.click(screen.getByRole("button", { name: /Check my answer/ }));
    expect(await screen.findByText("Correct this time.")).toBeTruthy();
    expect(post).toHaveBeenCalledWith("/me/mistakes/q1/check", { response: "London" });
    expect(screen.getByText("Paragraph B names London.")).toBeTruthy();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("filters by module and shows an empty state", async () => {
    get.mockResolvedValue({ items: [], total: 0, by_module: { listening: 0, reading: 0 } });
    renderAt(<ReviewMistakesPage />, "/app/review");
    expect(await screen.findByText(/Nothing to review/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Listening/ }));
    await waitFor(() => expect(get).toHaveBeenLastCalledWith("/me/mistakes?limit=20&offset=0&module=listening"));
    expect(screen.getByRole("button", { name: /Listening/ }).getAttribute("aria-pressed")).toBe("true");
  });
});

describe("Study plan", () => {
  it("shows the weekly split, the gap and dated milestones, accessibly", async () => {
    const { container } = renderAt(<StudyPlanPage />, "/app/study-plan");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/days to your exam: 6 sessions a week/);
    expect(screen.getByText(/Reading: \d sessions/)).toBeTruthy();
    expect(screen.getAllByText("Needs work").length).toBeGreaterThan(0);
    expect(screen.getByText(/Take a full mock soon/)).toBeTruthy();
    expect(screen.getByText(/Exam day/)).toBeTruthy();
    expect(await axeViolations(container)).toEqual([]);
  });
});
