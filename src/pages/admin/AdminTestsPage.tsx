import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileUp, Loader2, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { api, describeError } from "../../lib/apiClient";
import {
  MODULE_LABELS,
  TRACK_LABELS,
  type AdminTest,
  type BulkResult,
  type BulkTestAction,
  type Module,
  type TestKind,
  type TestStatus,
  type Track,
} from "../../lib/adminTypes";

const AUTHORABLE_MODULES: Module[] = ["listening", "reading", "writing", "speaking"];

type NewTest = { title: string; module: Module; track: Track; kind: TestKind; difficulty: string; duration_minutes: string };

const EMPTY_NEW_TEST: NewTest = { title: "", module: "reading", track: "academic", kind: "practice", difficulty: "", duration_minutes: "20" };

export function AdminTestsPage() {
  const navigate = useNavigate();
  const [tests, setTests] = useState<AdminTest[] | null>(null);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<TestStatus | "all">("all");
  const [kindFilter, setKindFilter] = useState<TestKind | "all">("all");
  const [moduleFilter, setModuleFilter] = useState<Module | "all">("all");

  const [showCreate, setShowCreate] = useState(false);
  const [newTest, setNewTest] = useState<NewTest>(EMPTY_NEW_TEST);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // FR-ADMIN-08 bulk editing: select tests, then publish/archive/restore/delete them together.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkTestAction>("archive");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<{ kind: "error" | "success"; text: string; problems: string[] } | null>(null);

  const load = useCallback(() => {
    api
      .get<AdminTest[]>("/admin/tests")
      .then(setTests)
      .catch((err) => setError(describeError(err, "Failed to load tests.")));
  }, []);

  useEffect(load, [load]);

  const filtered = useMemo(
    () =>
      (tests ?? []).filter(
        (test) =>
          (statusFilter === "all" || test.status === statusFilter) &&
          (kindFilter === "all" || test.kind === kindFilter) &&
          (moduleFilter === "all" || test.module === moduleFilter),
      ),
    [tests, statusFilter, kindFilter, moduleFilter],
  );

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allVisibleSelected = filtered.length > 0 && filtered.every((test) => selected.has(test.id));
  const toggleAll = () =>
    setSelected((current) => {
      const next = new Set(current);
      for (const test of filtered) {
        if (allVisibleSelected) next.delete(test.id);
        else next.add(test.id);
      }
      return next;
    });

  const runBulk = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    const verb = { publish: "Publish", archive: "Archive", restore: "Restore", delete: "Delete" }[bulkAction];
    const warning =
      bulkAction === "delete"
        ? " Only drafts can be deleted, and this can't be undone."
        : bulkAction === "publish"
          ? " Published versions can't be edited afterwards."
          : "";
    if (!window.confirm(`${verb} ${ids.length} test${ids.length === 1 ? "" : "s"}?${warning}`)) return;
    setBulkBusy(true);
    setBulkMessage(null);
    try {
      const result = await api.post<BulkResult>("/admin/tests/bulk", { action: bulkAction, test_ids: ids });
      const titles = new Map((tests ?? []).map((test) => [test.id, test.title]));
      const problems = result.results
        .filter((item) => !item.ok)
        .map((item) => `${titles.get(item.id) ?? item.id}: ${item.error ?? "failed"}${item.problems.length ? ` (${item.problems.join("; ")})` : ""}`);
      setBulkMessage({
        kind: result.failed ? "error" : "success",
        text: `${verb}: ${result.succeeded} done${result.failed ? `, ${result.failed} not changed` : ""}.`,
        problems,
      });
      setSelected(new Set(result.results.filter((item) => !item.ok).map((item) => item.id)));
      load();
    } catch (err) {
      setBulkMessage({ kind: "error", text: describeError(err, "Bulk action failed."), problems: [] });
    } finally {
      setBulkBusy(false);
    }
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreateError("");
    if (!newTest.title.trim()) {
      setCreateError("Give the test a title.");
      return;
    }
    setCreating(true);
    try {
      const created = await api.post<AdminTest>("/admin/tests", {
        title: newTest.title.trim(),
        module: newTest.module,
        track: newTest.track,
        kind: newTest.kind,
        difficulty: newTest.difficulty.trim() || null,
        duration_minutes: newTest.duration_minutes ? Number(newTest.duration_minutes) : null,
      });
      navigate(`/admin/tests/${created.id}`);
    } catch (err) {
      setCreateError(describeError(err, "Failed to create the test."));
    } finally {
      setCreating(false);
    }
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImportMessage(null);
    setImporting(true);
    try {
      let doc: unknown;
      try {
        doc = JSON.parse(await file.text());
      } catch {
        throw new Error("That file isn't valid JSON.");
      }
      const created = await api.post<AdminTest>("/admin/tests/import", doc);
      setImportMessage({ kind: "success", text: `Imported "${created.title}" as a draft.` });
      load();
    } catch (err) {
      setImportMessage({ kind: "error", text: describeError(err, "Import failed.") });
    } finally {
      setImporting(false);
    }
  };

  return (
    <AdminLayout title="Tests">
      <div className="page-heading admin-heading-row">
        <div>
          <h1>Tests</h1>
          <p>Practice sets appear on Practice. Mock tests appear on Mock tests and run in exam mode.</p>
        </div>
        <div className="admin-actions">
          <button type="button" className="button button-secondary" onClick={() => fileInput.current?.click()} disabled={importing}>
            {importing ? <Loader2 size={16} className="spin" aria-hidden="true" /> : <FileUp size={16} aria-hidden="true" />}
            Import JSON
          </button>
          <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={handleImportFile} />
          <button type="button" className="button button-primary" onClick={() => setShowCreate((value) => !value)}>
            <Plus size={16} aria-hidden="true" /> New test
          </button>
        </div>
      </div>

      {importMessage && (
        <p className={`form-banner form-banner-${importMessage.kind}`} role={importMessage.kind === "error" ? "alert" : "status"}>
          {importMessage.text}
        </p>
      )}

      {showCreate && (
        <form className="dashboard-card admin-card admin-form" onSubmit={handleCreate}>
          <h2>New test</h2>
          <div className="admin-form-grid">
            <label className="admin-field admin-field-wide">
              <span>Title</span>
              <input className="form-input" value={newTest.title} onChange={(e) => setNewTest({ ...newTest, title: e.target.value })} />
            </label>
            <label className="admin-field">
              <span>Type</span>
              <select className="form-input" value={newTest.kind} onChange={(e) => setNewTest({ ...newTest, kind: e.target.value as TestKind })}>
                <option value="practice">Practice set</option>
                <option value="mock">Mock test</option>
              </select>
            </label>
            <label className="admin-field">
              <span>Module</span>
              <select className="form-input" value={newTest.module} onChange={(e) => setNewTest({ ...newTest, module: e.target.value as Module })}>
                {AUTHORABLE_MODULES.map((module) => (
                  <option key={module} value={module}>{MODULE_LABELS[module]}</option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>Track</span>
              <select className="form-input" value={newTest.track} onChange={(e) => setNewTest({ ...newTest, track: e.target.value as Track })}>
                {(Object.keys(TRACK_LABELS) as Track[]).map((track) => (
                  <option key={track} value={track}>{TRACK_LABELS[track]}</option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>Duration (minutes)</span>
              <input className="form-input" type="number" min={1} value={newTest.duration_minutes} onChange={(e) => setNewTest({ ...newTest, duration_minutes: e.target.value })} />
            </label>
            <label className="admin-field">
              <span>Difficulty (optional)</span>
              <input className="form-input" placeholder="e.g. intermediate" value={newTest.difficulty} onChange={(e) => setNewTest({ ...newTest, difficulty: e.target.value })} />
            </label>
          </div>
          <p className="admin-muted">Writing and Speaking tests aren't scored automatically: students get diagnostics, the rubric and a self-review.</p>
          {createError && <p className="form-banner form-banner-error" role="alert">{createError}</p>}
          <div className="admin-actions">
            <button type="submit" className="button button-primary" disabled={creating}>
              {creating && <Loader2 size={16} className="spin" aria-hidden="true" />} Create draft
            </button>
            <button type="button" className="button button-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="admin-toolbar">
        <select className="form-input admin-filter" value={kindFilter} onChange={(e) => setKindFilter(e.target.value as TestKind | "all")} aria-label="Filter by type">
          <option value="all">All types</option>
          <option value="practice">Practice sets</option>
          <option value="mock">Mock tests</option>
        </select>
        <select className="form-input admin-filter" value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value as Module | "all")} aria-label="Filter by module">
          <option value="all">All modules</option>
          {(Object.keys(MODULE_LABELS) as Module[]).map((module) => (
            <option key={module} value={module}>{MODULE_LABELS[module]}</option>
          ))}
        </select>
        <select className="form-input admin-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as TestStatus | "all")} aria-label="Filter by status">
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {selected.size > 0 && (
        <div className="admin-bulk-bar" role="region" aria-label="Bulk actions">
          <span>
            <strong>{selected.size}</strong> selected
          </span>
          <select className="form-input admin-filter" value={bulkAction} onChange={(e) => setBulkAction(e.target.value as BulkTestAction)} aria-label="Bulk action">
            <option value="publish">Publish</option>
            <option value="archive">Archive</option>
            <option value="restore">Restore</option>
            <option value="delete">Delete drafts</option>
          </select>
          <button type="button" className="button button-primary" onClick={() => void runBulk()} disabled={bulkBusy}>
            {bulkBusy && <Loader2 size={16} className="spin" aria-hidden="true" />} Apply
          </button>
          <button type="button" className="button button-secondary" onClick={() => setSelected(new Set())} disabled={bulkBusy}>
            Clear
          </button>
        </div>
      )}

      {bulkMessage && (
        <div className={`form-banner form-banner-${bulkMessage.kind} form-banner-text`} role={bulkMessage.kind === "error" ? "alert" : "status"}>
          <p>{bulkMessage.text}</p>
          {bulkMessage.problems.length > 0 && (
            <ul>
              {bulkMessage.problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && <p className="form-banner form-banner-error" role="alert">{error}</p>}
      {!tests && !error && (
        <p className="admin-muted">
          <Loader2 size={16} className="spin" aria-hidden="true" /> Loading…
        </p>
      )}

      {tests && (
        <div className="dashboard-card admin-card admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col" className="admin-check-col">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} aria-label="Select all shown tests" />
                </th>
                <th scope="col">Title</th>
                <th scope="col">Type</th>
                <th scope="col">Module</th>
                <th scope="col">Track</th>
                <th scope="col">Duration</th>
                <th scope="col">Status</th>
                <th scope="col">Updated</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((test) => (
                <tr key={test.id} className={selected.has(test.id) ? "admin-row-selected" : undefined}>
                  <td className="admin-check-col">
                    <input type="checkbox" checked={selected.has(test.id)} onChange={() => toggle(test.id)} aria-label={`Select ${test.title}`} />
                  </td>
                  <td>
                    <Link className="admin-link" to={`/admin/tests/${test.id}`}>{test.title}</Link>
                  </td>
                  <td>{test.kind === "mock" ? "Mock" : "Practice"}</td>
                  <td>{MODULE_LABELS[test.module]}</td>
                  <td>{TRACK_LABELS[test.track]}</td>
                  <td>{test.duration_minutes ? `${test.duration_minutes} min` : "-"}</td>
                  <td>
                    <StatusPill status={test.status} />
                  </td>
                  <td>{new Date(test.updated_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="admin-muted">
                    {tests.length === 0 ? "No tests yet. Create one, or import a JSON file from database/seeds." : "No tests match these filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}

export function StatusPill({ status }: { status: TestStatus }) {
  const tone = status === "published" ? "success" : status === "draft" ? "accent" : "neutral";
  return <span className={`admin-pill admin-pill-${tone}`}>{status}</span>;
}
