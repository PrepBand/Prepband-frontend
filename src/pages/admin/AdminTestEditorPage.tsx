import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Archive, ArrowLeft, BarChart3, CheckCircle2, Copy, Download, Eye, Loader2, Pencil, Plus, RotateCcw, Send, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { SectionEditor } from "../../components/admin/SectionEditor";
import { QuestionRenderer } from "../../components/engine/QuestionRenderer";
import { ReadingPassagePane } from "../../components/engine/ReadingPassagePane";
import { WritingTask } from "../../components/engine/WritingTask";
import { api, describeError } from "../../lib/apiClient";
import { MODULE_LABELS, TRACK_LABELS, type AdminTest, type AdminTestContent, type TestKind, type Track } from "../../lib/adminTypes";
import { StatusPill } from "./AdminTestsPage";

export function AdminTestEditorPage() {
  const { testId = "" } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState<AdminTestContent | null>(null);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingMeta, setEditingMeta] = useState(false);
  const [preview, setPreview] = useState(false);

  const load = useCallback(() => {
    api
      .get<AdminTestContent>(`/admin/tests/${testId}/content`)
      .then((data) => {
        setContent(data);
        setLoadError("");
      })
      .catch((err) => setLoadError(describeError(err, "Failed to load this test.")));
  }, [testId]);

  useEffect(load, [load]);

  const act = async (action: () => Promise<unknown>, success: string, fallback: string) => {
    setActionError("");
    setNotice("");
    setBusy(true);
    try {
      await action();
      setNotice(success);
      load();
    } catch (err) {
      setActionError(describeError(err, fallback));
    } finally {
      setBusy(false);
    }
  };

  if (!content) {
    return (
      <AdminLayout title="Test">
        {loadError ? (
          <>
            <p className="form-banner form-banner-error" role="alert">{loadError}</p>
            <Link className="button button-secondary" to="/admin/tests">Back to tests</Link>
          </>
        ) : (
          <p className="admin-muted">
            <Loader2 size={16} className="spin" aria-hidden="true" /> Loading…
          </p>
        )}
      </AdminLayout>
    );
  }

  const { test, sections, publish_problems: problems } = content;
  const isDraft = test.status === "draft";
  const questionCount = sections.reduce((sum, section) => sum + section.questions.length, 0);
  const marks = sections.reduce((sum, section) => sum + section.questions.reduce((s, q) => s + q.marks, 0), 0);

  const exportJson = async () => {
    setActionError("");
    try {
      const doc = await api.get<unknown>(`/admin/tests/${test.id}/export`);
      const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${test.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setActionError(describeError(err, "Export failed."));
    }
  };

  const duplicate = async () => {
    setActionError("");
    setBusy(true);
    try {
      const copy = await api.post<AdminTest>(`/admin/tests/${test.id}/duplicate`);
      navigate(`/admin/tests/${copy.id}`);
      setNotice("Duplicated. You're now editing the new draft copy.");
    } catch (err) {
      setActionError(describeError(err, "Duplicate failed."));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete the draft "${test.title}"? This can't be undone.`)) return;
    setBusy(true);
    try {
      await api.delete(`/admin/tests/${test.id}`);
      navigate("/admin/tests");
    } catch (err) {
      setActionError(describeError(err, "Delete failed."));
      setBusy(false);
    }
  };

  const addSection = () =>
    act(
      () =>
        api.post(`/admin/tests/${test.id}/sections`, {
          module: test.module,
          order_index: sections.reduce((max, s) => Math.max(max, s.order_index + 1), 0),
          instructions: null,
          timing_seconds: null,
        }),
      "Section added.",
      "Failed to add a section.",
    );

  return (
    <AdminLayout title={test.title}>
      <Link className="admin-back" to="/admin/tests">
        <ArrowLeft size={15} aria-hidden="true" /> All tests
      </Link>

      <div className="page-heading admin-heading-row">
        <div>
          <h1>{test.title}</h1>
          <p>
            <StatusPill status={test.status} /> {test.kind === "mock" ? "Mock test" : "Practice set"} · {MODULE_LABELS[test.module]} ·{" "}
            {TRACK_LABELS[test.track]} · {test.duration_minutes ? `${test.duration_minutes} min` : "untimed"} · {questionCount} questions ·{" "}
            {marks} marks
          </p>
        </div>
        <div className="admin-actions">
          <button type="button" className="button button-secondary button-sm" onClick={() => setPreview((value) => !value)}>
            {preview ? <Pencil size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />} {preview ? "Edit" : "Preview"}
          </button>
          <button type="button" className="button button-secondary button-sm" onClick={exportJson}>
            <Download size={14} aria-hidden="true" /> Export
          </button>
          <button type="button" className="button button-secondary button-sm" onClick={duplicate} disabled={busy}>
            <Copy size={14} aria-hidden="true" /> Duplicate
          </button>
          {test.status !== "draft" && (
            <Link className="button button-secondary button-sm" to={`/admin/analytics?test=${test.id}`}>
              <BarChart3 size={14} aria-hidden="true" /> Analytics
            </Link>
          )}
          {isDraft && (
            <>
              <button type="button" className="button button-secondary button-sm admin-danger" onClick={remove} disabled={busy}>
                <Trash2 size={14} aria-hidden="true" /> Delete
              </button>
              <button
                type="button"
                className="button button-primary button-sm"
                disabled={busy || problems.length > 0}
                onClick={() => {
                  if (window.confirm("Publish this test? Published content is frozen; to change it later you'll duplicate it.")) {
                    act(() => api.post(`/admin/tests/${test.id}/publish`), "Published. Students can now see it.", "Publish failed.");
                  }
                }}
              >
                <Send size={14} aria-hidden="true" /> Publish
              </button>
            </>
          )}
          {test.status === "published" && (
            <button
              type="button"
              className="button button-secondary button-sm"
              disabled={busy}
              onClick={() => act(() => api.post(`/admin/tests/${test.id}/archive`), "Archived. Students no longer see it.", "Archive failed.")}
            >
              <Archive size={14} aria-hidden="true" /> Archive
            </button>
          )}
          {test.status === "archived" && (
            <button
              type="button"
              className="button button-secondary button-sm"
              disabled={busy}
              onClick={() => act(() => api.post(`/admin/tests/${test.id}/restore`), "Restored to the catalog.", "Restore failed.")}
            >
              <RotateCcw size={14} aria-hidden="true" /> Restore
            </button>
          )}
        </div>
      </div>

      {notice && <p className="form-banner form-banner-success" role="status">{notice}</p>}
      {actionError && <p className="form-banner form-banner-error" role="alert">{actionError}</p>}

      {isDraft ? (
        problems.length > 0 ? (
          <div className="dashboard-card admin-card admin-problems">
            <h2>
              <AlertTriangle size={17} aria-hidden="true" /> Before this can be published
            </h2>
            <ul>
              {problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="form-banner form-banner-success">
            <CheckCircle2 size={16} aria-hidden="true" /> Ready to publish: every question has an answer key and all required media is in place.
          </p>
        )
      ) : (
        <p className="admin-muted admin-frozen-note">
          This version is {test.status} and frozen, so past attempts stay reproducible. Use Duplicate to make an editable copy.
        </p>
      )}

      {editingMeta && isDraft ? (
        <MetadataForm test={test} onDone={(changed) => { setEditingMeta(false); if (changed) load(); }} />
      ) : (
        isDraft && (
          <button type="button" className="button button-secondary button-sm admin-meta-button" onClick={() => setEditingMeta(true)}>
            <Pencil size={14} aria-hidden="true" /> Edit title, type, track and timing
          </button>
        )
      )}

      {preview ? (
        <PreviewPane content={content} />
      ) : (
        <>
          {sections.length === 0 && <p className="admin-muted">No sections yet. Add one to start building this test.</p>}
          {sections.map((section, index) => (
            <SectionEditor
              key={section.id}
              section={section}
              index={index}
              versionId={test.current_version_id ?? ""}
              editable={isDraft}
              onChanged={load}
            />
          ))}
          {isDraft && (
            <button type="button" className="button button-secondary" onClick={addSection} disabled={busy}>
              <Plus size={16} aria-hidden="true" /> Add section
            </button>
          )}
        </>
      )}
    </AdminLayout>
  );
}

function MetadataForm({ test, onDone }: { test: AdminTest; onDone: (changed: boolean) => void }) {
  const [title, setTitle] = useState(test.title);
  const [kind, setKind] = useState<TestKind>(test.kind);
  const [track, setTrack] = useState<Track>(test.track);
  const [duration, setDuration] = useState(test.duration_minutes ? String(test.duration_minutes) : "");
  const [difficulty, setDifficulty] = useState(test.difficulty ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) {
      setError("The title can't be empty.");
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/admin/tests/${test.id}`, {
        title: title.trim(),
        kind,
        track,
        duration_minutes: duration ? Number(duration) : null,
        difficulty: difficulty.trim() || null,
      });
      onDone(true);
    } catch (err) {
      setError(describeError(err, "Failed to save."));
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-card admin-card admin-form">
      <div className="admin-form-grid">
        <label className="admin-field admin-field-wide">
          <span>Title</span>
          <input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="admin-field">
          <span>Type</span>
          <select className="form-input" value={kind} onChange={(e) => setKind(e.target.value as TestKind)}>
            <option value="practice">Practice set</option>
            <option value="mock">Mock test</option>
          </select>
        </label>
        <label className="admin-field">
          <span>Track</span>
          <select className="form-input" value={track} onChange={(e) => setTrack(e.target.value as Track)}>
            {(Object.keys(TRACK_LABELS) as Track[]).map((value) => (
              <option key={value} value={value}>{TRACK_LABELS[value]}</option>
            ))}
          </select>
        </label>
        <label className="admin-field">
          <span>Duration (minutes)</span>
          <input className="form-input" type="number" min={1} value={duration} onChange={(e) => setDuration(e.target.value)} />
        </label>
        <label className="admin-field">
          <span>Difficulty</span>
          <input className="form-input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} />
        </label>
      </div>
      {error && <p className="form-banner form-banner-error" role="alert">{error}</p>}
      <div className="admin-actions">
        <button type="button" className="button button-primary button-sm" onClick={save} disabled={saving}>Save</button>
        <button type="button" className="button button-secondary button-sm" onClick={() => onDone(false)}>Cancel</button>
      </div>
    </div>
  );
}

/** What a student will see, rendered with the real engine components.
 * Answers typed here are local only and never saved. */
function PreviewPane({ content }: { content: AdminTestContent }) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const setAnswer = (id: string, value: unknown) => setAnswers((current) => ({ ...current, [id]: value }));

  return (
    <div className="admin-preview">
      <p className="admin-muted">Student view preview. Answers typed here aren&rsquo;t saved or marked.</p>
      {content.sections.map((section, index) => (
        <div className="dashboard-card engine-section" key={section.id}>
          <h2>Section {index + 1}</h2>
          {section.instructions && <p>{section.instructions}</p>}
          {section.media_assets
            .filter((media) => media.type === "audio" && media.public_url)
            .map((media) => (
              <audio key={media.id} controls preload="none" src={media.public_url ?? undefined} className="admin-audio" />
            ))}
          {section.writing_prompts.map((prompt) => (
            <WritingTask
              key={prompt.id}
              prompt={prompt}
              value={typeof answers[prompt.id] === "string" ? (answers[prompt.id] as string) : ""}
              onChange={(value) => setAnswer(prompt.id, value)}
              images={section.media_assets}
            />
          ))}
          {section.speaking_prompts.length > 0 && (
            <ol className="speaking-result-list">
              {section.speaking_prompts.map((prompt) => (
                <li key={prompt.id}>
                  <p className="engine-question-prompt">
                    Part {prompt.part}: {prompt.prompt}
                  </p>
                  {prompt.bullets && (
                    <ul>
                      {prompt.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  )}
                  <p className="admin-muted">
                    {prompt.prep_seconds ? `${prompt.prep_seconds}s preparation · ` : ""}
                    {prompt.speak_seconds ? `${prompt.speak_seconds}s to speak` : "untimed"}
                  </p>
                </li>
              ))}
            </ol>
          )}
          {section.passages.length > 0 ? (
            <ReadingPassagePane passages={section.passages} questions={section.questions} answers={answers} onAnswerChange={setAnswer} />
          ) : (
            section.questions.map((question) => (
              <QuestionRenderer key={question.id} question={question} value={answers[question.id]} onChange={(value) => setAnswer(question.id, value)} />
            ))
          )}
        </div>
      ))}
    </div>
  );
}
