import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./supabaseClient", async () => ({ supabase: (await import("../test/supabaseMock")).supabaseMock }));
vi.stubEnv("VITE_API_BASE_URL", "https://api.test");

const { api, ApiError, fetchWithWake } = await import("./apiClient");
const { serverStatus } = await import("./serverStatus");

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("api client cold-start handling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    serverStatus.dismiss();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("retries a GET while the server wakes, shows 'waking', then recovers", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(503, {}))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(json(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const result = api.get<{ ok: boolean }>("/tests");
    await vi.advanceTimersByTimeAsync(0);
    expect(serverStatus.get()).toBe("waking");
    await vi.advanceTimersByTimeAsync(10_000);
    await expect(result).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(serverStatus.get()).toBe("ok");
  });

  it("shows 'waking' when a request is just slow", async () => {
    let resolve!: (r: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((r) => (resolve = r))));
    const result = api.get("/me");
    await vi.advanceTimersByTimeAsync(3000);
    expect(serverStatus.get()).toBe("ok");
    await vi.advanceTimersByTimeAsync(1500);
    expect(serverStatus.get()).toBe("waking");
    resolve(json(200, {}));
    await result;
    expect(serverStatus.get()).toBe("ok");
  });

  it("never repeats a POST automatically", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(503, { error: { code: "service_unavailable", message: "Database down." } }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(api.post("/attempts/1/submit")).rejects.toMatchObject({ status: 503, message: "Database down." });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports offline after the wake budget for a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const result = fetchWithWake("https://api.test/x", { method: "POST" });
    await expect(result).rejects.toBeInstanceOf(ApiError);
    await expect(result).rejects.toMatchObject({ code: "network_error" });
    expect(serverStatus.get()).toBe("offline");
  });

  it("turns 401 into a session-expired message and keeps per-problem details", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(json(401, { error: { code: "unauthenticated", message: "Missing bearer token." } })));
    await expect(api.get("/me")).rejects.toMatchObject({ code: "session_expired", message: "Your session has expired. Please log in again." });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(json(422, { error: { code: "validation_error", message: "Not ready.", details: [{ msg: "Row 2: bad" }] } })),
    );
    await expect(api.post("/x")).rejects.toMatchObject({ details: ["Row 2: bad"] });
  });

  it("sends the session token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, {}));
    vi.stubGlobal("fetch", fetchMock);
    await api.get("/me");
    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer test-token");
  });
});
