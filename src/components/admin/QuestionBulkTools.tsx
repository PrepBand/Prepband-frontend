import { useRef, useState } from "react";
import { Download, FileUp, ListOrdered, Loader2, Trash2 } from "lucide-react";
import { api, describeError, getText, saveBlob } from "../../lib/apiClient";
import type { AdminSectionContent } from "../../lib/adminTypes";

type Props = {
  section: AdminSectionContent;
  editable: boolean;
  selected: Set<string>;
  onClearSelection: () => void;
  onChanged: () => void;
};

const CSV_HELP =
  "Columns: display_order, type, prompt, marks, options, correct_answers, accepted_aliases, rationale. " +
  "Separate list values with | (e.g. Red|Green|Blue). Matching options and answers are JSON.";

/** FR-ADMIN-08: CSV import/export and bulk edits for one section's
 * questions. Imports are all-or-nothing and use the editor's own checks. */
export function QuestionBulkTools({ section, editable, selected, onClearSelection, onChanged }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [mode, setMode] = useState<"append" | "replace">("append");
  const [marks, setMarks] = useState("1");
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string; problems: string[] } | null>(null);

  const report = (err: unknown, fallback: string) => {
    const problems = err && typeof err === "object" && "details" in err ? ((err as { details: string[] }).details ?? []) : [];
    const text = problems.length ? ((err as Error).message ?? fallback) : describeError(err, fallback);
    setMessage({ kind: "error", text, problems });
  };

  const exportCsv = async () => {
    setBusy("export");
    setMessage(null);
    try {
      const text = await getText(`/admin/sections/${section.id}/questions.csv`);
      saveBlob(new Blob([text], { type: "text/csv;charset=utf-8" }), `section-${section.order_index}-questions.csv`);
    } catch (err) {
      report(err, "Export failed.");
    } finally {
      setBusy(null);
    }
  };

  const importCsv = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (mode === "replace" && !window.confirm(`Replace all ${section.questions.length} questions in this section with the file's questions?`)) return;
    setBusy("import");
    setMessage(null);
    try {
      const result = await api.post<{ imported: number }>(`/admin/sections/${section.id}/questions/import-csv`, {
        csv: await file.text(),
        mode,
      });
      setMessage({ kind: "success", text: `Imported ${result.imported} question${result.imported === 1 ? "" : "s"}.`, problems: [] });
      onChanged();
    } catch (err) {
      report(err, "Import failed.");
    } finally {
      setBusy(null);
    }
  };

  const bulk = async (action: "set_marks" | "delete" | "renumber") => {
    const ids = [...selected];
    if (action === "delete" && !window.confirm(`Delete ${ids.length} selected question${ids.length === 1 ? "" : "s"} and their answer keys?`)) return;
    setBusy(action);
    setMessage(null);
    try {
      const body =
        action === "renumber" ? { action } : action === "set_marks" ? { action, question_ids: ids, marks: Number(marks) } : { action, question_ids: ids };
      const result = await api.patch<{ updated: number }>(`/admin/sections/${section.id}/questions/bulk`, body);
      const verb = action === "renumber" ? "Renumbered" : action === "delete" ? "Deleted" : "Updated";
      setMessage({ kind: "success", text: `${verb} ${result.updated} question${result.updated === 1 ? "" : "s"}.`, problems: [] });
      if (action !== "renumber") onClearSelection();
      onChanged();
    } catch (err) {
      report(err, "Bulk edit failed.");
    } finally {
      setBusy(null);
    }
  };

  const spinner = (name: string) => (busy === name ? <Loader2 size={14} className="spin" aria-hidden="true" /> : null);

  return (
    <div className="admin-bulk-tools">
      <div className="admin-actions">
        <button type="button" className="button button-secondary button-sm" onClick={() => void exportCsv()} disabled={busy !== null || section.questions.length === 0}>
          {spinner("export") ?? <Download size={14} aria-hidden="true" />} Export CSV
        </button>
        {editable && (
          <>
            <select className="form-input admin-filter" value={mode} onChange={(e) => setMode(e.target.value as "append" | "replace")} aria-label="CSV import mode">
              <option value="append">Import adds questions</option>
              <option value="replace">Import replaces all</option>
            </select>
            <button type="button" className="button button-secondary button-sm" onClick={() => fileInput.current?.click()} disabled={busy !== null}>
              {spinner("import") ?? <FileUp size={14} aria-hidden="true" />} Import CSV
            </button>
            <input ref={fileInput} type="file" accept=".csv,text/csv" hidden onChange={importCsv} />
            <button type="button" className="button button-secondary button-sm" onClick={() => void bulk("renumber")} disabled={busy !== null || section.questions.length === 0}>
              {spinner("renumber") ?? <ListOrdered size={14} aria-hidden="true" />} Renumber
            </button>
          </>
        )}
      </div>
      {editable && <p className="admin-muted">{CSV_HELP}</p>}

      {editable && selected.size > 0 && (
        <div className="admin-bulk-bar" role="region" aria-label="Selected questions">
          <span>
            <strong>{selected.size}</strong> selected
          </span>
          <label className="admin-inline-field">
            <span>Marks</span>
            <input className="form-input admin-marks-input" type="number" min={0} max={100} step={0.5} value={marks} onChange={(e) => setMarks(e.target.value)} />
          </label>
          <button type="button" className="button button-secondary button-sm" onClick={() => void bulk("set_marks")} disabled={busy !== null || marks === ""}>
            {spinner("set_marks")} Set marks
          </button>
          <button type="button" className="button button-secondary button-sm admin-danger" onClick={() => void bulk("delete")} disabled={busy !== null}>
            {spinner("delete") ?? <Trash2 size={14} aria-hidden="true" />} Delete
          </button>
          <button type="button" className="button button-secondary button-sm" onClick={onClearSelection} disabled={busy !== null}>
            Clear
          </button>
        </div>
      )}

      {message && (
        <div className={`form-banner form-banner-${message.kind} form-banner-text`} role={message.kind === "error" ? "alert" : "status"}>
          <p>{message.text}</p>
          {message.problems.length > 0 && (
            <ul>
              {message.problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
