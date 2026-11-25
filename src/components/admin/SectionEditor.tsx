import { useRef, useState } from "react";
import { AlertTriangle, Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { api, describeError } from "../../lib/apiClient";
import {
  MODULE_LABELS,
  QUESTION_TYPE_LABELS,
  type AdminMediaAsset,
  type AdminPassage,
  type AdminSectionContent,
  type Module,
} from "../../lib/adminTypes";
import { AUDIO_ACCEPT, checkAudioFile, readAudioDuration, uploadTestMedia } from "../../lib/uploadTestMedia";
import { ImageBlock, SpeakingPromptsBlock, WritingPromptsBlock } from "./PromptEditors";
import { QuestionBulkTools } from "./QuestionBulkTools";
import { QuestionEditor, summarizeAnswer } from "./QuestionEditor";

type Props = {
  section: AdminSectionContent;
  index: number;
  versionId: string;
  editable: boolean;
  onChanged: () => void;
};

const isPending = (media: AdminMediaAsset) => !media.public_url || media.storage_key.startsWith("pending/");

export function SectionEditor({ section, index, versionId, editable, onChanged }: Props) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [editingSettings, setEditingSettings] = useState(false);
  const [module, setModule] = useState<Module>(section.module);
  const [instructions, setInstructions] = useState(section.instructions ?? "");
  const [timingMinutes, setTimingMinutes] = useState(section.timing_seconds ? String(Math.round(section.timing_seconds / 60)) : "");

  const [editingQuestionId, setEditingQuestionId] = useState<string | "new" | null>(null);

  const run = async (action: () => Promise<unknown>, fallback: string) => {
    setError("");
    setBusy(true);
    try {
      await action();
      onChanged();
      return true;
    } catch (err) {
      setError(describeError(err, fallback));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveSettings = async () => {
    const ok = await run(
      () =>
        api.patch(`/admin/sections/${section.id}`, {
          module,
          instructions: instructions.trim() || null,
          timing_seconds: timingMinutes ? Math.round(Number(timingMinutes) * 60) : null,
        }),
      "Failed to save the section.",
    );
    if (ok) setEditingSettings(false);
  };

  const deleteSection = () => {
    if (!window.confirm(`Delete section ${index + 1} and everything in it?`)) return;
    run(() => api.delete(`/admin/sections/${section.id}`), "Failed to delete the section.");
  };

  const keyFor = (questionId: string) => section.answer_keys.find((key) => key.question_id === questionId) ?? null;
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const toggleQuestion = (id: string) =>
    setSelectedQuestions((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const nextDisplayOrder = section.questions.reduce((max, q) => Math.max(max, q.display_order + 1), 0);

  return (
    <section className="dashboard-card admin-card admin-section" aria-label={`Section ${index + 1}`}>
      <div className="admin-section-head">
        <div>
          <h2>
            Section {index + 1} <span className="admin-pill admin-pill-neutral">{MODULE_LABELS[section.module]}</span>
          </h2>
          {!editingSettings && (
            <p className="admin-muted">
              {section.instructions || "No instructions yet."}
              {section.timing_seconds ? ` · ${Math.round(section.timing_seconds / 60)} min` : ""}
            </p>
          )}
        </div>
        {editable && !editingSettings && (
          <div className="admin-actions">
            <button type="button" className="button button-secondary button-sm" onClick={() => setEditingSettings(true)}>
              <Pencil size={14} aria-hidden="true" /> Edit
            </button>
            <button type="button" className="button button-secondary button-sm admin-danger" onClick={deleteSection} disabled={busy}>
              <Trash2 size={14} aria-hidden="true" /> Delete
            </button>
          </div>
        )}
      </div>

      {editingSettings && (
        <div className="admin-form">
          <div className="admin-form-grid">
            <label className="admin-field">
              <span>Module</span>
              <select className="form-input" value={module} onChange={(e) => setModule(e.target.value as Module)}>
                <option value="listening">Listening</option>
                <option value="reading">Reading</option>
                <option value="writing">Writing</option>
                <option value="speaking">Speaking</option>
              </select>
            </label>
            <label className="admin-field admin-field-narrow">
              <span>Timing (minutes)</span>
              <input className="form-input" type="number" min={0} value={timingMinutes} onChange={(e) => setTimingMinutes(e.target.value)} />
            </label>
            <label className="admin-field admin-field-wide">
              <span>Instructions shown to students</span>
              <textarea className="form-input" rows={3} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
            </label>
          </div>
          <div className="admin-actions">
            <button type="button" className="button button-primary button-sm" onClick={saveSettings} disabled={busy}>Save section</button>
            <button type="button" className="button button-secondary button-sm" onClick={() => setEditingSettings(false)}>Cancel</button>
          </div>
        </div>
      )}

      {error && <p className="form-banner form-banner-error" role="alert">{error}</p>}

      {section.module === "listening" && (
        <AudioBlock section={section} versionId={versionId} editable={editable} onChanged={onChanged} />
      )}

      {(section.module === "reading" || section.passages.length > 0) && (
        <PassagesBlock section={section} editable={editable} onChanged={onChanged} />
      )}

      {section.module === "writing" && (
        <>
          <WritingPromptsBlock section={section} editable={editable} onChanged={onChanged} />
          <ImageBlock section={section} versionId={versionId} editable={editable} onChanged={onChanged} />
        </>
      )}

      {section.module === "speaking" && <SpeakingPromptsBlock section={section} versionId={versionId} editable={editable} onChanged={onChanged} />}

      {(section.module === "listening" || section.module === "reading" || section.questions.length > 0) && (
      <div className="admin-subblock">
        <h3>Questions ({section.questions.length})</h3>
        {(section.module === "listening" || section.module === "reading") && (
          <QuestionBulkTools
            section={section}
            editable={editable}
            selected={selectedQuestions}
            onClearSelection={() => setSelectedQuestions(new Set())}
            onChanged={onChanged}
          />
        )}
        <ol className="admin-question-list">
          {section.questions.map((question, qIndex) =>
            editingQuestionId === question.id ? (
              <li key={question.id} className="admin-question-item admin-question-item-editing">
                <QuestionEditor
                  sectionId={section.id}
                  question={question}
                  answerKey={keyFor(question.id)}
                  nextDisplayOrder={nextDisplayOrder}
                  onSaved={() => {
                    setEditingQuestionId(null);
                    onChanged();
                  }}
                  onCancel={() => setEditingQuestionId(null)}
                />
              </li>
            ) : (
              <li key={question.id} className="admin-question-item">
                {editable && (
                  <input
                    type="checkbox"
                    className="admin-question-check"
                    checked={selectedQuestions.has(question.id)}
                    onChange={() => toggleQuestion(question.id)}
                    aria-label={`Select question ${qIndex + 1}`}
                  />
                )}
                <span className="admin-question-number">{qIndex + 1}</span>
                <div className="admin-question-body">
                  <p>{question.prompt}</p>
                  <p className="admin-muted">
                    {QUESTION_TYPE_LABELS[question.type]} · {question.marks} mark{question.marks === 1 ? "" : "s"} ·{" "}
                    <span className={keyFor(question.id) ? "admin-answer" : "admin-warning-text"}>{summarizeAnswer(keyFor(question.id))}</span>
                  </p>
                </div>
                {editable && (
                  <div className="admin-actions">
                    <button type="button" className="icon-button" aria-label={`Edit question ${qIndex + 1}`} onClick={() => setEditingQuestionId(question.id)}>
                      <Pencil size={15} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="icon-button admin-danger"
                      aria-label={`Delete question ${qIndex + 1}`}
                      onClick={() => {
                        if (window.confirm(`Delete question ${qIndex + 1}?`)) {
                          run(() => api.delete(`/admin/questions/${question.id}`), "Failed to delete the question.");
                        }
                      }}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </li>
            ),
          )}
        </ol>

        {editable &&
          (editingQuestionId === "new" ? (
            <div className="admin-question-item admin-question-item-editing">
              <QuestionEditor
                sectionId={section.id}
                question={null}
                answerKey={null}
                nextDisplayOrder={nextDisplayOrder}
                onSaved={() => {
                  setEditingQuestionId(null);
                  onChanged();
                }}
                onCancel={() => setEditingQuestionId(null)}
              />
            </div>
          ) : (
            <button type="button" className="button button-secondary button-sm" onClick={() => setEditingQuestionId("new")}>
              <Plus size={14} aria-hidden="true" /> Add question
            </button>
          ))}
      </div>
      )}
    </section>
  );
}

function PassagesBlock({ section, editable, onChanged }: { section: AdminSectionContent; editable: boolean; onChanged: () => void }) {
  const [editingId, setEditingId] = useState<string | "new" | null>(null);

  return (
    <div className="admin-subblock">
      <h3>Passages ({section.passages.length})</h3>
      {section.passages.map((passage) =>
        editingId === passage.id ? (
          <PassageForm
            key={passage.id}
            sectionId={section.id}
            passage={passage}
            onDone={(changed) => {
              setEditingId(null);
              if (changed) onChanged();
            }}
          />
        ) : (
          <div className="admin-passage" key={passage.id}>
            <div className="admin-section-head">
              <strong>{passage.title || "Untitled passage"}</strong>
              {editable && (
                <button type="button" className="icon-button" aria-label="Edit passage" onClick={() => setEditingId(passage.id)}>
                  <Pencil size={15} aria-hidden="true" />
                </button>
              )}
            </div>
            <p className="admin-muted">
              {passage.body.split(/\s+/).length} words
              {passage.attribution ? ` · ${passage.attribution}` : ""}
              {passage.license ? ` · ${passage.license}` : ""}
            </p>
            <p className="admin-passage-excerpt">{passage.body.slice(0, 260)}{passage.body.length > 260 ? "…" : ""}</p>
          </div>
        ),
      )}
      {editable &&
        (editingId === "new" ? (
          <PassageForm
            sectionId={section.id}
            passage={null}
            onDone={(changed) => {
              setEditingId(null);
              if (changed) onChanged();
            }}
          />
        ) : (
          <button type="button" className="button button-secondary button-sm" onClick={() => setEditingId("new")}>
            <Plus size={14} aria-hidden="true" /> Add passage
          </button>
        ))}
    </div>
  );
}

function PassageForm({ sectionId, passage, onDone }: { sectionId: string; passage: AdminPassage | null; onDone: (changed: boolean) => void }) {
  const [title, setTitle] = useState(passage?.title ?? "");
  const [body, setBody] = useState(passage?.body ?? "");
  const [source, setSource] = useState(passage?.source ?? "");
  const [license, setLicense] = useState(passage?.license ?? "");
  const [attribution, setAttribution] = useState(passage?.attribution ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!body.trim()) {
      setError("The passage needs some text.");
      return;
    }
    setSaving(true);
    setError("");
    const payload = {
      title: title.trim() || null,
      body: body.trim(),
      source: source.trim() || null,
      license: license.trim() || null,
      attribution: attribution.trim() || null,
    };
    try {
      if (passage) await api.patch(`/admin/passages/${passage.id}`, payload);
      else await api.post(`/admin/sections/${sectionId}/passages`, payload);
      onDone(true);
    } catch (err) {
      setError(describeError(err, "Failed to save the passage."));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!passage || !window.confirm("Delete this passage?")) return;
    setSaving(true);
    try {
      await api.delete(`/admin/passages/${passage.id}`);
      onDone(true);
    } catch (err) {
      setError(describeError(err, "Failed to delete the passage."));
      setSaving(false);
    }
  };

  return (
    <div className="admin-form admin-passage">
      <div className="admin-form-grid">
        <label className="admin-field admin-field-wide">
          <span>Title</span>
          <input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="admin-field admin-field-wide">
          <span>Text (leave a blank line between paragraphs)</span>
          <textarea className="form-input" rows={12} value={body} onChange={(e) => setBody(e.target.value)} />
        </label>
        <label className="admin-field">
          <span>Source</span>
          <input className="form-input" placeholder="e.g. Original Prepband text" value={source} onChange={(e) => setSource(e.target.value)} />
        </label>
        <label className="admin-field">
          <span>Licence</span>
          <input className="form-input" placeholder="e.g. CC BY 4.0" value={license} onChange={(e) => setLicense(e.target.value)} />
        </label>
        <label className="admin-field admin-field-wide">
          <span>Attribution</span>
          <input className="form-input" value={attribution} onChange={(e) => setAttribution(e.target.value)} />
        </label>
      </div>
      {error && <p className="form-banner form-banner-error" role="alert">{error}</p>}
      <div className="admin-actions">
        <button type="button" className="button button-primary button-sm" onClick={save} disabled={saving}>Save passage</button>
        <button type="button" className="button button-secondary button-sm" onClick={() => onDone(false)}>Cancel</button>
        {passage && (
          <button type="button" className="button button-secondary button-sm admin-danger" onClick={remove} disabled={saving}>
            <Trash2 size={14} aria-hidden="true" /> Delete
          </button>
        )}
      </div>
    </div>
  );
}

function AudioBlock({ section, versionId, editable, onChanged }: { section: AdminSectionContent; versionId: string; editable: boolean; onChanged: () => void }) {
  const audio = section.media_assets.filter((media) => media.type === "audio");
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const target = useRef<AdminMediaAsset | null>(null);

  const pickFile = (media: AdminMediaAsset | null) => {
    target.current = media;
    fileInput.current?.click();
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const problem = checkAudioFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    const media = target.current;
    setError("");
    setUploadingFor(media?.id ?? "new");
    try {
      const [uploaded, duration] = await Promise.all([uploadTestMedia(file, versionId), readAudioDuration(file)]);
      const metadata = {
        storage_key: uploaded.storage_key,
        public_url: uploaded.public_url,
        content_type: uploaded.content_type,
        size_bytes: uploaded.size_bytes,
        duration_seconds: duration,
      };
      if (media) await api.patch(`/admin/media-assets/${media.id}`, metadata);
      else await api.post(`/admin/sections/${section.id}/media-assets`, { type: "audio", ...metadata });
      onChanged();
    } catch (err) {
      setError(describeError(err, "Upload failed."));
    } finally {
      setUploadingFor(null);
    }
  };

  return (
    <div className="admin-subblock">
      <h3>Audio</h3>
      <input ref={fileInput} type="file" accept={AUDIO_ACCEPT} hidden onChange={handleFile} />
      {audio.length === 0 && (
        <p className="admin-warning-text">
          <AlertTriangle size={14} aria-hidden="true" /> No audio yet. Listening sections can't be published without it.
        </p>
      )}
      {audio.map((media) => (
        <AudioAsset
          key={media.id}
          media={media}
          editable={editable}
          uploading={uploadingFor === media.id}
          onUpload={() => pickFile(media)}
          onChanged={onChanged}
          onError={setError}
        />
      ))}
      {error && <p className="form-banner form-banner-error" role="alert">{error}</p>}
      {editable && audio.length === 0 && (
        <button type="button" className="button button-secondary button-sm" onClick={() => pickFile(null)} disabled={uploadingFor !== null}>
          {uploadingFor === "new" ? <Loader2 size={14} className="spin" aria-hidden="true" /> : <Upload size={14} aria-hidden="true" />} Upload audio
        </button>
      )}
    </div>
  );
}

function AudioAsset({
  media,
  editable,
  uploading,
  onUpload,
  onChanged,
  onError,
}: {
  media: AdminMediaAsset;
  editable: boolean;
  uploading: boolean;
  onUpload: () => void;
  onChanged: () => void;
  onError: (message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [transcript, setTranscript] = useState(media.transcript ?? "");
  const [attribution, setAttribution] = useState(media.attribution ?? "");
  const [license, setLicense] = useState(media.license ?? "");
  const [saving, setSaving] = useState(false);
  const pending = isPending(media);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/admin/media-assets/${media.id}`, {
        transcript: transcript.trim() || null,
        attribution: attribution.trim() || null,
        license: license.trim() || null,
      });
      setEditing(false);
      onChanged();
    } catch (err) {
      onError(describeError(err, "Failed to save the audio details."));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("Remove this audio from the section?")) return;
    try {
      await api.delete(`/admin/media-assets/${media.id}`);
      onChanged();
    } catch (err) {
      onError(describeError(err, "Failed to remove the audio."));
    }
  };

  return (
    <div className="admin-media">
      {pending ? (
        <p className="admin-warning-text">
          <AlertTriangle size={14} aria-hidden="true" /> Audio file not uploaded yet. The transcript is ready; upload the recording.
        </p>
      ) : (
        <audio controls preload="none" src={media.public_url ?? undefined} className="admin-audio" />
      )}
      <p className="admin-muted">
        {pending ? "Pending upload" : `${media.content_type ?? "audio"}`}
        {media.duration_seconds ? ` · ${Math.floor(media.duration_seconds / 60)}:${String(Math.round(media.duration_seconds % 60)).padStart(2, "0")}` : ""}
        {media.size_bytes ? ` · ${(media.size_bytes / 1024 / 1024).toFixed(1)} MB` : ""}
        {media.attribution ? ` · ${media.attribution}` : ""}
        {media.transcript ? " · transcript shown after submission" : " · no transcript"}
      </p>

      {editing ? (
        <div className="admin-form">
          <label className="admin-field">
            <span>Transcript (students only see it after submitting)</span>
            <textarea className="form-input" rows={8} value={transcript} onChange={(e) => setTranscript(e.target.value)} />
          </label>
          <div className="admin-form-grid">
            <label className="admin-field">
              <span>Attribution</span>
              <input className="form-input" value={attribution} onChange={(e) => setAttribution(e.target.value)} />
            </label>
            <label className="admin-field">
              <span>Licence</span>
              <input className="form-input" value={license} onChange={(e) => setLicense(e.target.value)} />
            </label>
          </div>
          <div className="admin-actions">
            <button type="button" className="button button-primary button-sm" onClick={save} disabled={saving}>Save details</button>
            <button type="button" className="button button-secondary button-sm" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        editable && (
          <div className="admin-actions">
            <button type="button" className="button button-secondary button-sm" onClick={onUpload} disabled={uploading}>
              {uploading ? <Loader2 size={14} className="spin" aria-hidden="true" /> : <Upload size={14} aria-hidden="true" />}
              {pending ? "Upload audio" : "Replace audio"}
            </button>
            <button type="button" className="button button-secondary button-sm" onClick={() => setEditing(true)}>
              <Pencil size={14} aria-hidden="true" /> Transcript &amp; credits
            </button>
            <button type="button" className="button button-secondary button-sm admin-danger" onClick={remove}>
              <Trash2 size={14} aria-hidden="true" /> Remove
            </button>
          </div>
        )
      )}
    </div>
  );
}
