// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router-dom";

vi.mock("../lib/supabaseClient", async () => ({ supabase: (await import("./supabaseMock")).supabaseMock }));
vi.mock("../lib/AuthProvider", () => ({ useAuth: () => ({ session: null, loading: false }) }));
vi.mock("../lib/useIsAdmin", () => ({ useIsAdmin: () => ({ isAdmin: true, loading: false }) }));

const apiMock = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() }));
vi.mock("../lib/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/apiClient")>()),
  api: apiMock,
}));

const { axeViolations, renderAt } = await import("./helpers");
const { StatusPage } = await import("../pages/StatusPage");
const { AboutPage } = await import("../pages/AboutPage");
const { LegalPage } = await import("../pages/LegalPage");
const { ServerStatusBanner } = await import("../components/system/ServerStatusBanner");
const { AppErrorBoundary } = await import("../components/system/AppErrorBoundary");
const { serverStatus } = await import("../lib/serverStatus");
const { AdminCertificatesPage } = await import("../pages/admin/AdminCertificatesPage");
const { AdminTestsPage } = await import("../pages/admin/AdminTestsPage");
const { AdminAuditPage } = await import("../pages/admin/AdminAuditPage");

beforeEach(() => {
  for (const fn of Object.values(apiMock)) fn.mockReset();
});
afterEach(() => cleanup());

describe("public status pages (FR-PUB-02/03)", () => {
  it.each(["forbidden", "error", "unavailable"] as const)("%s page has one heading and no axe violations", async (kind) => {
    const { container } = renderAt(<StatusPage kind={kind} />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("about page states the unofficial disclaimer and passes axe", async () => {
    const { container } = renderAt(<AboutPage />);
    expect(screen.getAllByText(/not affiliated with/i).length).toBeGreaterThan(0);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("each policy has its own URL and tabs work from the keyboard", async () => {
    const { container } = renderAt(
      <Routes>
        {["/legal", "/privacy", "/terms", "/cookies"].map((path) => (
          <Route key={path} path={path} element={<LegalPage />} />
        ))}
      </Routes>,
      "/privacy",
    );
    expect(screen.getByRole("tab", { name: "Privacy policy" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tabpanel").textContent).toMatch(/recordings never leave your device/i);
    fireEvent.keyDown(screen.getByRole("tab", { name: "Privacy policy" }), { key: "ArrowRight" });
    await waitFor(() => expect(screen.getByRole("tab", { name: "Terms" }).getAttribute("aria-selected")).toBe("true"));
    expect(await axeViolations(container)).toEqual([]);
  });

  it("a crashing screen shows the 500 page instead of a blank one", () => {
    const Boom = () => {
      throw new Error("render failed");
    };
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderAt(
      <AppErrorBoundary>
        <Boom />
      </AppErrorBoundary>,
    );
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/went wrong on our side/i);
    spy.mockRestore();
  });
});

describe("server status banner (spec 10.2)", () => {
  it("announces waking and offline states and can be dismissed", () => {
    renderAt(<ServerStatusBanner />);
    expect(screen.queryByRole("status")).toBeNull();
    act(() => serverStatus.slow());
    expect(screen.getByRole("status").textContent).toMatch(/waking up the server/i);
    act(() => serverStatus.offline());
    expect(screen.getByRole("status").textContent).toMatch(/reach prepband/i);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("admin tools (FR-ADMIN-08, FR-CERT-08)", () => {
  const base = { module: "reading", track: "academic", kind: "practice", difficulty: null, duration_minutes: 20, created_at: "2026-11-01", updated_at: "2026-11-01" };
  const tests = [
    { ...base, id: "t1", title: "Reading A", status: "published", current_version_id: "v1" },
    { ...base, id: "t2", title: "Reading B", status: "draft", current_version_id: "v2" },
  ];

  it("archives the selected tests and lists the ones that failed", async () => {
    apiMock.get.mockResolvedValue(tests);
    apiMock.post.mockResolvedValue({
      action: "archive",
      succeeded: 1,
      failed: 1,
      results: [
        { id: "t1", ok: true, status: "archived", error: null, problems: [] },
        { id: "t2", ok: false, status: null, error: "Only a published test can be archived.", problems: [] },
      ],
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { container } = renderAt(<AdminTestsPage />);
    await screen.findByText("Reading A");
    fireEvent.click(screen.getByRole("checkbox", { name: "Select all shown tests" }));
    expect(screen.getByRole("region", { name: "Bulk actions" }).textContent).toMatch(/2 selected/);
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await screen.findByText(/1 done, 1 not changed/);
    expect(apiMock.post).toHaveBeenCalledWith("/admin/tests/bulk", { action: "archive", test_ids: ["t1", "t2"] });
    expect(screen.getByText(/Reading B: Only a published test can be archived/)).toBeTruthy();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("revokes a certificate only with a reason", async () => {
    const cert = {
      id: "c1", code: "PB-AAAA-BBBB-CCCC-DDDD", issued_at: "2026-11-20", revoked_at: null, public_verification: false,
      mock_attempt_id: "m1", track: "academic", completed_at: "2026-11-20", revoked_reason: null, verification_url: null,
      student_id: "s1", holder_name: "Amina Khan", holder_email: "amina@example.test",
    };
    apiMock.get.mockResolvedValue([cert]);
    apiMock.post.mockResolvedValue({ ...cert, revoked_at: "2026-11-25" });
    renderAt(<AdminCertificatesPage />);
    fireEvent.click(await screen.findByRole("button", { name: /revoke/i }));
    fireEvent.click(screen.getByRole("button", { name: "Revoke certificate" }));
    expect(screen.getByRole("alert").textContent).toMatch(/at least 3 characters/);
    expect(apiMock.post).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/reason/i), { target: { value: "Shared as an official result" } });
    fireEvent.click(screen.getByRole("button", { name: "Revoke certificate" }));
    await waitFor(() =>
      expect(apiMock.post).toHaveBeenCalledWith("/admin/certificates/c1/revoke", { reason: "Shared as an official result" }),
    );
  });

  it("audit log renders entries with outcome pills and passes axe", async () => {
    apiMock.get.mockResolvedValue({
      total: 1,
      limit: 50,
      offset: 0,
      items: [
        {
          id: "a1", actor_id: "u1", actor_email: "ada@example.test", actor_role: "admin", action: "POST /admin/tests/{test_id}/publish",
          method: "POST", path: "/api/v1/admin/tests/t1/publish", entity_type: "test", entity_id: "t1", outcome: "failed",
          status_code: 422, details: { note: "x" }, created_at: "2026-11-25T10:00:00Z",
        },
      ],
    });
    const { container } = renderAt(<AdminAuditPage />);
    await screen.findByText("ada@example.test");
    expect(screen.getByText(/failed 422/)).toBeTruthy();
    expect(await axeViolations(container)).toEqual([]);
  });
});
