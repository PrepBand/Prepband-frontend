// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router-dom";

const resetPasswordForEmail = vi.fn(async () => ({ error: null }));
const rpc = vi.fn();
vi.mock("../lib/supabaseClient", async () => {
  const { supabaseMock } = await import("./supabaseMock");
  return { supabase: { ...supabaseMock, rpc, auth: { ...supabaseMock.auth, resetPasswordForEmail } } };
});

const { axeViolations, renderAt } = await import("./helpers");
const { QuestionRenderer, countAnswerWords } = await import("../components/engine/QuestionRenderer");
const { ForgotPasswordPage } = await import("../pages/auth/ForgotPasswordPage");

afterEach(() => cleanup());

const gap = {
  id: "q1",
  type: "gap_fill" as const,
  prompt: "Salt was brought up as ___ from underground.",
  options: { max_words: 1 },
  display_order: 1,
  marks: 1,
};

describe("word limits", () => {
  it("counts words the way the marking does", () => {
    expect(countAnswerWords("pond-dipping")).toBe(1);
    expect(countAnswerWords("15 May")).toBe(1);
    expect(countAnswerWords("  the salt  deposits ")).toBe(3);
  });

  it("shows the limit and warns, accessibly, when an answer is too long", async () => {
    const { container, rerender } = render(<QuestionRenderer question={gap} value="brine" onChange={() => {}} />);
    const input = screen.getByRole("textbox", { name: "Answer for the gap" });
    expect(input.getAttribute("aria-describedby")).toBe("limit-q1");
    expect(screen.getByText(/No more than ONE WORD/)).toBeTruthy();
    expect(screen.queryByText(/would be marked wrong/)).toBeNull();

    rerender(<QuestionRenderer question={gap} value="salty brine" onChange={() => {}} />);
    expect(screen.getByText(/you have 2, so this answer would be marked wrong/)).toBeTruthy();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("shows no hint when the question has no limit", () => {
    render(<QuestionRenderer question={{ ...gap, type: "short_answer", options: null }} value="" onChange={() => {}} />);
    expect(screen.queryByText(/No more than/)).toBeNull();
    expect(screen.getByRole("textbox", { name: "Your answer" })).toBeTruthy();
  });
});

describe("forgot password", () => {
  it("never reveals whether an email has an account", async () => {
    renderAt(
      <Routes>
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/verify-reset-code" element={<p>Code step</p>} />
      </Routes>,
      "/auth/forgot-password",
    );
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "nobody@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /Send code/ }));
    await waitFor(() => expect(screen.getByText("Code step")).toBeTruthy());
    expect(rpc).not.toHaveBeenCalled();
    expect(resetPasswordForEmail).toHaveBeenCalledWith("nobody@example.com");
    expect(screen.queryByText(/No account found/)).toBeNull();
  });
});
