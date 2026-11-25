// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const calls: { method: string; path: string; body?: unknown }[] = [];
const serverState = {
  responses: [{ question_id: "q1", response: "old", version: 1, saved_at: "2026-11-25T10:00:00Z", client_seq: 5 }],
  writing_responses: [] as unknown[],
  speaking_responses: [] as unknown[],
};

vi.mock("./apiClient", () => {
  class ApiError extends Error {
    constructor(
      public status: number,
      public code: string,
      message: string,
    ) {
      super(message);
    }
  }
  return {
    ApiError,
    api: {
      post: vi.fn(async (path: string) => {
        calls.push({ method: "POST", path });
        if (path.endsWith("/submit")) return { id: "a1", status: "submitted" };
        return { id: "a1" };
      }),
      get: vi.fn(async (path: string) => {
        calls.push({ method: "GET", path });
        if (path.endsWith("/content")) return { id: "t1", module: "reading", sections: [] };
        if (path.endsWith("/results")) return { questions: [] };
        return { id: "a1", status: "in_progress", expires_at: null, ...serverState };
      }),
      put: vi.fn(async (path: string, body: { client_seq?: number }) => {
        calls.push({ method: "PUT", path, body });
        return { client_seq: body.client_seq };
      }),
    },
  };
});

const { useAttemptSession } = await import("./useAttemptSession");
const { api, ApiError } = await import("./apiClient");
const { pendingChanges, rememberChange } = await import("./draftStore");

const source = { kind: "test" as const, testId: "t1", mode: "practice" as const };

describe("useAttemptSession saves", () => {
  beforeEach(() => {
    calls.length = 0;
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("puts back an answer that never reached the server and re-sends it", async () => {
    // Saved on this device with a newer change number than the server's copy.
    rememberChange("a1", "q:q1", "newer answer", 10);

    const { result } = renderHook(() => useAttemptSession(source));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.answers.q1).toBe("newer answer");
    expect(result.current.restoredCount).toBe(1);
    await waitFor(() => expect(calls.some((c) => c.method === "PUT")).toBe(true));
    const put = calls.find((c) => c.method === "PUT")!;
    expect(put.path).toBe("/attempts/a1/responses/q1");
    expect(put.body).toEqual({ response: "newer answer", client_seq: 10 });
    // Confirmed by the server: the local copy is gone.
    await waitFor(() => expect(pendingChanges("a1")).toEqual({}));
  });

  it("ignores a device copy that is older than the server's", async () => {
    rememberChange("a1", "q:q1", "stale", 3);
    const { result } = renderHook(() => useAttemptSession(source));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.answers.q1).toBe("old");
    expect(result.current.restoredCount).toBe(0);
  });

  it("numbers every change upwards and keeps a copy until it is saved", async () => {
    const { result } = renderHook(() => useAttemptSession(source));
    await waitFor(() => expect(result.current.loading).toBe(false));

    vi.useFakeTimers();
    act(() => result.current.setAnswer("q2", "first"));
    expect(pendingChanges("a1")["q:q2"].value).toBe("first");
    act(() => result.current.setAnswer("q2", "second"));
    const firstSeq = pendingChanges("a1")["q:q2"].seq;
    act(() => result.current.setEssay("w1", "An essay"));
    expect(pendingChanges("a1")["w:w1"].seq).toBeGreaterThan(firstSeq);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    const puts = calls.filter((c) => c.method === "PUT" && c.path.endsWith("/q2"));
    // Debounced into one save carrying the latest value and its number.
    expect(puts).toHaveLength(1);
    expect(puts[0].body).toEqual({ response: "second", client_seq: firstSeq });
    expect(pendingChanges("a1")).toEqual({});
  });

  it("keeps a live answer's saved transcript when the attempt is reopened", async () => {
    serverState.speaking_responses = [
      {
        speaking_prompt_id: "s1",
        response_mode: "live",
        duration_seconds: 42,
        text_response: null,
        completed: true,
        version: 1,
        saved_at: "2026-11-25T10:00:00Z",
        transcript: "I live in a small town.",
        stt_model: "whisper",
        turns: [],
      },
    ];
    const { result } = renderHook(() => useAttemptSession(source));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.speaking.s1).toMatchObject({
      response_mode: "live",
      save_transcript: true,
      transcript: "I live in a small town.",
      stt_model: "whisper",
    });
    serverState.speaking_responses = [];
  });

  it("forgets the device copy once the attempt is submitted", async () => {
    const { result } = renderHook(() => useAttemptSession(source));
    await waitFor(() => expect(result.current.loading).toBe(false));
    rememberChange("a1", "q:q9", "x", Date.now() + 1000);
    await act(async () => {
      await result.current.submit();
    });
    expect(localStorage.getItem("prepband.draft.a1")).toBeNull();
  });

  it("waits for a save already in flight before submitting", async () => {
    const { result } = renderHook(() => useAttemptSession(source));
    await waitFor(() => expect(result.current.loading).toBe(false));
    let release: () => void = () => {};
    vi.mocked(api.put).mockImplementationOnce(async (path: string, body: unknown) => {
      calls.push({ method: "PUT", path, body });
      await new Promise<void>((resolve) => (release = resolve));
      return { client_seq: (body as { client_seq: number }).client_seq };
    });
    act(() => result.current.setAnswer("q1", "latest"));
    // Let the debounce fire so the save is in flight, not queued.
    await waitFor(() => expect(calls.some((c) => c.method === "PUT")).toBe(true), { timeout: 2000 });
    let submitted = false;
    const submitting = act(async () => {
      await result.current.submit();
      submitted = true;
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(calls.some((c) => c.path.endsWith("/submit"))).toBe(false);
    release();
    await submitting;
    expect(submitted).toBe(true);
    const putAt = calls.findIndex((c) => c.method === "PUT");
    const submitAt = calls.findIndex((c) => c.path.endsWith("/submit"));
    expect(submitAt).toBeGreaterThan(putAt);
  });

  it("does not submit while the latest change keeps failing to save", async () => {
    const { result } = renderHook(() => useAttemptSession(source));
    await waitFor(() => expect(result.current.loading).toBe(false));
    vi.mocked(api.put).mockRejectedValue(new ApiError(503, "unavailable", "Server waking up"));
    act(() => result.current.setAnswer("q1", "latest"));
    await act(async () => {
      await result.current.submit();
    });
    expect(calls.some((c) => c.path.endsWith("/submit"))).toBe(false);
    expect(result.current.error).toMatch(/haven't saved/);
    // The device copy is kept for recovery.
    expect(pendingChanges("a1")["q:q1"]).toMatchObject({ value: "latest" });
    vi.mocked(api.put).mockReset();
  });
});
