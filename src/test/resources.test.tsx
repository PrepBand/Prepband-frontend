// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router-dom";

const get = vi.fn();
const post = vi.fn();
const patch = vi.fn();
const del = vi.fn();

vi.mock("../lib/supabaseClient", async () => ({ supabase: (await import("./supabaseMock")).supabaseMock }));
vi.mock("../lib/AuthProvider", () => ({ useAuth: () => ({ session: { user: { id: "u1", email: "a@example.test" } } }) }));
vi.mock("../lib/useProfile", () => ({ useProfile: () => ({ loading: false, profile: null, studyGoal: null, targetScores: null }) }));
vi.mock("../lib/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/apiClient")>()),
  api: {
    get: (path: string) => get(path),
    post: (path: string, body?: unknown) => post(path, body),
    patch: (path: string, body?: unknown) => patch(path, body),
    delete: (path: string) => del(path),
  },
}));

const { axeViolations, renderAt } = await import("./helpers");
const { ResourcesPage } = await import("../pages/ResourcesPage");
const { AdminResourcesPage } = await import("../pages/admin/AdminResourcesPage");
const { AdminResourceEditorPage } = await import("../pages/admin/AdminResourceEditorPage");
const { uploadResourceFile } = await import("../lib/resourceUpload");

const card = {
  id: "r1",
  title: "Reading strategy guide",
  description: "How to skim and scan.",
  kind: "pdf",
  module: "reading",
  track: "both",
  level: null,
  tags: ["skimming"],
  category_slug: "strategy-guides",
  category_name: "Strategy guides",
  cover_url: "https://acct.r2.cloudflarestorage.com/b/resources/covers/x.webp?X-Amz-Signature=abc",
  cover_alt: "A stack of books",
  file_name: "guide.pdf",
  mime_type: "application/pdf",
  size_bytes: 2_400_000,
  is_external: false,
  published_at: "2026-11-25T10:00:00Z",
};

const categories = [
  { id: "c1", name: "Strategy guides", slug: "strategy-guides", description: null, resource_count: 1 },
  { id: "c2", name: "Vocabulary", slug: "vocabulary", description: null, resource_count: 0 },
];

beforeEach(() => {
  for (const fn of [get, post, patch, del]) fn.mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Student resources page", () => {
  beforeEach(() => {
    get.mockImplementation(async (path: string) =>
      path === "/resource-categories" ? categories : { items: [card], total: 1, query: null },
    );
  });

  it("shows cards with covers and only categories that have resources, accessibly", async () => {
    const { container } = renderAt(<ResourcesPage />, "/app/resources");
    expect(await screen.findByRole("heading", { name: "Reading strategy guide" })).toBeTruthy();
    expect(screen.getByAltText("A stack of books")).toBeTruthy();
    expect(screen.getByText(/2\.3 MB/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Strategy guides/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Vocabulary/ })).toBeNull(); // empty category hidden
    expect(await axeViolations(container)).toEqual([]);
  });

  it("searches after a pause and filters by category through the URL", async () => {
    renderAt(<ResourcesPage />, "/app/resources");
    await screen.findByRole("heading", { name: "Reading strategy guide" });

    fireEvent.change(screen.getByRole("searchbox", { name: "Search resources" }), { target: { value: "skim" } });
    await waitFor(() => expect(get).toHaveBeenLastCalledWith("/resources?q=skim&limit=24&offset=0"), { timeout: 2000 });

    fireEvent.click(screen.getByRole("button", { name: /Strategy guides/ }));
    await waitFor(() => expect(get).toHaveBeenLastCalledWith("/resources?q=skim&category=strategy-guides&limit=24&offset=0"));
    expect(screen.getByRole("button", { name: /Strategy guides/ }).getAttribute("aria-pressed")).toBe("true");
  });

  it("opens a file through a fresh short-lived link in a new tab", async () => {
    const tab = { opener: {}, location: { replace: vi.fn() }, close: vi.fn() };
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => tab as unknown as Window);
    post.mockResolvedValue({ url: "https://signed.example/guide.pdf", expires_in: 300 });
    renderAt(<ResourcesPage />, "/app/resources");
    fireEvent.click(await screen.findByRole("button", { name: /opens in a new tab/ }));
    await waitFor(() => expect(tab.location.replace).toHaveBeenCalledWith("https://signed.example/guide.pdf"));
    expect(post).toHaveBeenCalledWith("/resources/r1/open", undefined);
    expect(tab.opener).toBeNull();
    expect(openSpy).toHaveBeenCalledWith("", "_blank");
    openSpy.mockRestore();
  });

  it("says so when nothing matches", async () => {
    get.mockImplementation(async (path: string) => (path === "/resource-categories" ? categories : { items: [], total: 0, query: "zzz" }));
    renderAt(<ResourcesPage />, "/app/resources?q=zzz");
    expect(await screen.findByText("Nothing matches that yet.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Show everything" }));
    await waitFor(() => expect(get).toHaveBeenLastCalledWith("/resources?limit=24&offset=0"));
  });
});

describe("Admin resources", () => {
  const adminCategories = [
    { id: "c1", name: "Strategy guides", slug: "strategy-guides", description: null, display_order: 10, is_visible: true, resource_count: 1, published_count: 1 },
    { id: "c2", name: "Vocabulary", slug: "vocabulary", description: null, display_order: 20, is_visible: true, resource_count: 0, published_count: 0 },
  ];

  it("lists resources and categories, and adds a category", async () => {
    get.mockImplementation(async (path: string) => {
      if (path === "/admin/resource-categories") return adminCategories;
      if (path === "/admin/resources/storage") return { configured: false, cover_max_bytes: 1, file_max_bytes: 1, cover_types: [], file_types: [] };
      return [{ ...card, category_id: "c1", status: "draft", open_count: 3, problems: ["Add a cover image."], display_order: 0, updated_at: "2026-11-25T10:00:00Z", cover_key: null, file_key: null, external_url: null, source: null, licence: null }];
    });
    post.mockResolvedValue({});
    const { container } = renderAt(<AdminResourcesPage />, "/admin/resources");
    expect(await screen.findByRole("link", { name: "Reading strategy guide" })).toBeTruthy();
    expect(screen.getByText(/1 to do before publishing/)).toBeTruthy();
    expect(screen.getByText(/File storage isn.t configured/)).toBeTruthy();
    // A category that still has resources can't be deleted.
    const deletes = screen.getAllByRole("button", { name: /Delete/ });
    expect((deletes[0] as HTMLButtonElement).disabled).toBe(true);
    expect((deletes[1] as HTMLButtonElement).disabled).toBe(false);

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Grammar" } });
    fireEvent.click(screen.getByRole("button", { name: "Add category" }));
    await waitFor(() => expect(post).toHaveBeenCalledWith("/admin/resource-categories", { name: "Grammar", description: null, display_order: 30 }));
    expect(await axeViolations(container)).toEqual([]);
  });

  it("creates a draft from the editor", async () => {
    get.mockImplementation(async (path: string) => (path === "/admin/resource-categories" ? adminCategories : null));
    post.mockResolvedValue({ ...card, id: "new1", category_id: "c1", status: "draft", open_count: 0, problems: [], display_order: 0, updated_at: "", cover_key: null, file_key: null, external_url: null, source: null, licence: "Original" });
    renderAt(
      <Routes>
        <Route path="/admin/resources/:resourceId" element={<AdminResourceEditorPage />} />
      </Routes>,
      "/admin/resources/new",
    );
    await waitFor(() => expect((screen.getByLabelText("Category") as HTMLSelectElement).value).toBe("c1"));
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Band 7 essay" } });
    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "link" } });
    fireEvent.change(screen.getByLabelText("Web address"), { target: { value: "https://example.org/essay" } });
    fireEvent.change(screen.getByLabelText(/Tags/), { target: { value: "task 2, Opinion" } });
    fireEvent.change(screen.getByLabelText("Licence"), { target: { value: "Linked only" } });
    fireEvent.click(screen.getByRole("button", { name: "Create draft" }));
    await waitFor(() => expect(post).toHaveBeenCalled());
    const [path, body] = post.mock.calls[0];
    expect(path).toBe("/admin/resources");
    expect(body).toMatchObject({ category_id: "c1", title: "Band 7 essay", kind: "link", external_url: "https://example.org/essay", tags: ["task 2", "Opinion"], licence: "Linked only" });
    expect(body).not.toHaveProperty("file_key");
  });
});

describe("uploadResourceFile", () => {
  it("asks for a signed URL, then PUTs the bytes straight to storage", async () => {
    post.mockResolvedValue({ key: "resources/files/k.pdf", upload_url: "https://r2.example/put", headers: { "Content-Type": "application/pdf" }, expires_in: 600 });
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const file = new File(["%PDF-1.7 hello"], "guide.pdf", { type: "application/pdf" });

    let result: Awaited<ReturnType<typeof uploadResourceFile>> | undefined;
    await act(async () => {
      result = await uploadResourceFile("file", file);
    });
    expect(post).toHaveBeenCalledWith("/admin/resources/uploads", { purpose: "file", file_name: "guide.pdf", content_type: "application/pdf", size_bytes: file.size });
    expect(fetchMock).toHaveBeenCalledWith("https://r2.example/put", { method: "PUT", headers: { "Content-Type": "application/pdf" }, body: file });
    expect(result).toEqual({ key: "resources/files/k.pdf", contentType: "application/pdf", fileName: "guide.pdf", size: file.size });
  });

  it("reports a refused upload clearly", async () => {
    post.mockResolvedValue({ key: "k", upload_url: "https://r2.example/put", headers: {}, expires_in: 600 });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 403 })));
    await expect(uploadResourceFile("file", new File(["x"], "a.pdf", { type: "application/pdf" }))).rejects.toThrow(/refused the upload/);
  });
});
