import { useRef, useState } from "react";
import { Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { api, describeError } from "../../lib/apiClient";
import type { AdminSectionContent, AdminSpeakingPrompt, AdminWritingPrompt } from "../../lib/adminTypes";
import { IMAGE_ACCEPT, checkImageFile, uploadTestMedia } from "../../lib/uploadTestMedia";
import { generateExaminerClip } from "../../lib/live/voiceClips";

type BlockProps = { section: AdminSectionContent; editable: boolean; onChanged: () => void };

const lines = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const nextOrder = (items: { display_order: number }[]) => items.reduce((max, item) => Math.max(max, item.display_order + 1), 0);

// --- Writing tasks ---------------------------------------------------

/** Table text format: first line = column headings, one row per line,
 * cells separated by "|". Simple to type, easy to read back. */
function tableToText(visual: AdminWritingPrompt["visual"]): string {
  if (!visual) return "";
  return [visual.columns.join(" | "), ...visual.rows.map((row) => row.join(" | "))].join("\n");
}

function textToTable(text: string, caption: string): { visual: AdminWritingPrompt["visual"]; problem: string | null } {
  const rowsText = lines(text);
  if (rowsText.length === 0) return { visual: null, problem: null };
  const split = (line: string) => line.split("|").map((cell) => cell.trim());
  const columns = split(rowsText[0]);
  const rows = rowsText.slice(1).map(split);
  if (rows.length === 0) return { visual: null, problem: "The table needs a heading line and at least one row." };
  if (rows.some((row) => row.length !== columns.length)) {
    return { visual: null, problem: `Every row needs ${columns.length} cells, the same as the heading line.` };
  }
  return { visual: { caption: caption.trim() || null, columns, rows }, problem: null };
}

export function WritingPromptsBlock({ section, editable, onChanged }: BlockProps) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [error, setError] = useState("");

  const remove = async (prompt: AdminWritingPrompt) => {
    if (!window.confirm(`Delete Task ${prompt.task_number}?`)) return;
    try {
      await api.delete(`/admin/writing-prompts/${prompt.id}`);
      onChanged();
    } catch (err) {
      setError(describeError(err, "Failed to delete the task."));
    }
  };

  return (
    <div className="admin-subblock">
      <h3>Writing tasks ({section.writing_prompts.length})</h3>
      {section.writing_prompts.map((prompt) =>
        editing === prompt.id ? (
          <WritingPromptForm
            key={prompt.id}
            sectionId={section.id}
            prompt={prompt}
            displayOrder={prompt.display_order}
            onDone={(changed) => {
              setEditing(null);
              if (changed) onChanged();
            }}
          />
        ) : (
          <div className="admin-passage" key={prompt.id}>
            <div className="admin-section-head">
              <strong>
                Task {prompt.task_number} · {prompt.min_words}+ words{prompt.recommended_minutes ? ` · ${prompt.recommended_minutes} min` : ""}
                {prompt.letter_format ? " · letter" : ""}
                {prompt.visual ? " · data table" : ""}
              </strong>
              {editable && (
                <div className="admin-actions">
                  <button type="button" className="icon-button" aria-label={`Edit Task ${prompt.task_number}`} onClick={() => setEditing(prompt.id)}>
                    <Pencil size={15} aria-hidden="true" />
                  </button>
                  <button type="button" className="icon-button admin-danger" aria-label={`Delete Task ${prompt.task_number}`} onClick={() => remove(prompt)}>
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
            <p className="admin-passage-excerpt">{prompt.prompt}</p>
            {!prompt.examiner_notes && <p className="admin-muted">No guidance notes yet (shown to students after submitting).</p>}
          </div>
        ),
      )}
      {error && <p className="form-banner form-banner-error" role="alert">{error}</p>}
      {editable &&
        (editing === "new" ? (
          <WritingPromptForm
            sectionId={section.id}
            prompt={null}
            displayOrder={nextOrder(section.writing_prompts)}
            onDone={(changed) => {
              setEditing(null);
              if (changed) onChanged();
            }}
          />
        ) : (
          <button type="button" className="button button-secondary button-sm" onClick={() => setEditing("new")}>
            <Plus size={14} aria-hidden="true" /> Add writing task
          </button>
        ))}
    </div>
  );
}

function WritingPromptForm({
  sectionId,
  prompt,
  displayOrder,
  onDone,
}: {
  sectionId: string;
  prompt: AdminWritingPrompt | null;
  displayOrder: number;
  onDone: (changed: boolean) => void;
}) {
  const [taskNumber, setTaskNumber] = useState<1 | 2>(prompt?.task_number ?? 1);
  const [text, setText] = useState(prompt?.prompt ?? "");
  const [instructions, setInstructions] = useState(prompt?.instructions ?? "");
  const [minWords, setMinWords] = useState(String(prompt?.min_words ?? 150));
  const [minutes, setMinutes] = useState(prompt?.recommended_minutes ? String(prompt.recommended_minutes) : "");
  const [letter, setLetter] = useState(prompt?.letter_format ?? false);
  const [notes, setNotes] = useState(prompt?.examiner_notes ?? "");
  const [tableText, setTableText] = useState(tableToText(prompt?.visual ?? null));
  const [caption, setCaption] = useState(prompt?.visual?.caption ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setError("");
    if (!text.trim()) return setError("Write the task prompt.");
    const min = Number(minWords);
    if (!Number.isInteger(min) || min < 0) return setError("Minimum words must be a whole number.");
    const { visual, problem } = textToTable(tableText, caption);
    if (problem) return setError(problem);
    setSaving(true);
    const payload = {
      task_number: taskNumber,
      prompt: text.trim(),
      instructions: instructions.trim() || null,
      min_words: min,
      recommended_minutes: minutes ? Number(minutes) : null,
      letter_format: letter,
      examiner_notes: notes.trim() || null,
      visual,
    };
    try {
      if (prompt) await api.patch(`/admin/writing-prompts/${prompt.id}`, payload);
      else await api.post(`/admin/sections/${sectionId}/writing-prompts`, { ...payload, display_order: displayOrder });
      onDone(true);
    } catch (err) {
      setError(describeError(err, "Failed to save the task."));
      setSaving(false);
    }
  };

  return (
    <div className="admin-form admin-passage">
      <div className="admin-form-grid">
        <label className="admin-field">
          <span>Task</span>
          <select
            className="form-input"
            value={taskNumber}
            onChange={(e) => {
              const value = Number(e.target.value) as 1 | 2;
              setTaskNumber(value);
              if (!prompt) setMinWords(value === 1 ? "150" : "250");
            }}
          >
            <option value={1}>Task 1</option>
            <option value={2}>Task 2</option>
          </select>
        </label>
        <label className="admin-field admin-field-narrow">
          <span>Minimum words</span>
          <input className="form-input" type="number" min={0} value={minWords} onChange={(e) => setMinWords(e.target.value)} />
        </label>
        <label className="admin-field admin-field-narrow">
          <span>Suggested minutes</span>
          <input className="form-input" type="number" min={1} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </label>
        <label className="admin-field engine-option admin-checkbox">
          <input type="checkbox" checked={letter} onChange={(e) => setLetter(e.target.checked)} />
          <span>Letter (General Training Task 1): check greeting and sign-off</span>
        </label>
        <label className="admin-field admin-field-wide">
          <span>Prompt (new lines are kept, so bullet points can go on their own lines)</span>
          <textarea className="form-input" rows={6} value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <label className="admin-field admin-field-wide">
          <span>Instructions (e.g. &ldquo;Write at least 150 words.&rdquo;)</span>
          <input className="form-input" value={instructions} onChange={(e) => setInstructions(e.target.value)} />
        </label>
        <label className="admin-field admin-field-wide">
          <span>Data table (optional, for Academic Task 1). First line is headings; one row per line; separate cells with |</span>
          <textarea
            className="form-input admin-mono"
            rows={5}
            placeholder={"Transport | 2004 | 2024\nCar | 58% | 41%"}
            value={tableText}
            onChange={(e) => setTableText(e.target.value)}
          />
        </label>
        {tableText.trim() && (
          <label className="admin-field admin-field-wide">
            <span>Table caption</span>
            <input className="form-input" value={caption} onChange={(e) => setCaption(e.target.value)} />
          </label>
        )}
        <label className="admin-field admin-field-wide">
          <span>Guidance shown after submission: what a strong answer covers (not a score)</span>
          <textarea className="form-input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
      </div>
      {error && <p className="form-banner form-banner-error" role="alert">{error}</p>}
      <div className="admin-actions">
        <button type="button" className="button button-primary button-sm" onClick={save} disabled={saving}>
          {saving && <Loader2 size={14} className="spin" aria-hidden="true" />} Save task
        </button>
        <button type="button" className="button button-secondary button-sm" onClick={() => onDone(false)}>Cancel</button>
      </div>
    </div>
  );
}

// --- Speaking prompts --------------------------------------------------

export function SpeakingPromptsBlock({ section, versionId, editable, onChanged }: BlockProps & { versionId: string }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [error, setError] = useState("");
  const [voiceProgress, setVoiceProgress] = useState<string | null>(null);

  // Phase 5: every line the examiner says for this section, and whether it has a clip.
  const examinerLines = section.speaking_prompts.flatMap((p) => [
    { prompt: p, followUp: null as number | null, text: p.prompt, audio: p.audio_url },
    ...(p.follow_ups ?? []).map((f, i) => ({ prompt: p, followUp: i as number | null, text: f.text, audio: f.audio_url })),
  ]);
  const missing = examinerLines.filter((line) => !line.audio);

  /** Generates the examiner voice (Kokoro, in this browser) for every line without a clip. */
  const generateVoices = async () => {
    setError("");
    try {
      for (const [index, line] of missing.entries()) {
        setVoiceProgress(`Voice ${index + 1} of ${missing.length}: ${line.text.slice(0, 50)}`);
        const file = await generateExaminerClip(line.text, (fraction) =>
          setVoiceProgress(`Loading the Kokoro voice model${fraction != null ? ` (${Math.round(fraction * 100)}%)` : ""}, first time only`),
        );
        const uploaded = await uploadTestMedia(file, versionId);
        // Update the local copy too, so later follow-up uploads keep earlier ones.
        const fresh = section.speaking_prompts.find((p) => p.id === line.prompt.id)!;
        if (line.followUp == null) {
          fresh.audio_url = uploaded.public_url;
          await api.patch(`/admin/speaking-prompts/${fresh.id}`, { audio_url: uploaded.public_url });
        } else {
          fresh.follow_ups = fresh.follow_ups.map((f, i) => (i === line.followUp ? { ...f, audio_url: uploaded.public_url } : f));
          await api.patch(`/admin/speaking-prompts/${fresh.id}`, { follow_ups: fresh.follow_ups });
        }
      }
      setVoiceProgress(null);
      onChanged();
    } catch (err) {
      setVoiceProgress(null);
      setError(describeError(err, "Couldn't generate the examiner voice."));
      onChanged();
    }
  };

  const remove = async (prompt: AdminSpeakingPrompt) => {
    if (!window.confirm("Delete this prompt?")) return;
    try {
      await api.delete(`/admin/speaking-prompts/${prompt.id}`);
      onChanged();
    } catch (err) {
      setError(describeError(err, "Failed to delete the prompt."));
    }
  };

  const defaultPart = (section.speaking_prompts[section.speaking_prompts.length - 1]?.part ?? 1) as 1 | 2 | 3;

  return (
    <div className="admin-subblock">
      <h3>Speaking prompts ({section.speaking_prompts.length})</h3>
      <ol className="admin-question-list">
        {section.speaking_prompts.map((prompt, index) =>
          editing === prompt.id ? (
            <li key={prompt.id} className="admin-question-item admin-question-item-editing">
              <SpeakingPromptForm
                sectionId={section.id}
                prompt={prompt}
                defaultPart={prompt.part}
                displayOrder={prompt.display_order}
                onDone={(changed) => {
                  setEditing(null);
                  if (changed) onChanged();
                }}
              />
            </li>
          ) : (
            <li key={prompt.id} className="admin-question-item">
              <span className="admin-question-number">{index + 1}</span>
              <div className="admin-question-body">
                <p>{prompt.prompt}</p>
                <p className="admin-muted">
                  Part {prompt.part}
                  {prompt.bullets?.length ? ` · cue card, ${prompt.bullets.length} bullets` : ""}
                  {prompt.prep_seconds ? ` · ${prompt.prep_seconds}s prep` : ""}
                  {prompt.speak_seconds ? ` · ${prompt.speak_seconds}s to speak` : ""}
                  {` · examiner voice: ${prompt.audio_url ? "clip ready" : "live voice"}`}
                </p>
                {prompt.audio_url && <audio controls preload="none" src={prompt.audio_url} className="admin-voice-clip" aria-label="Examiner voice clip" />}
                {(prompt.follow_ups ?? []).length > 0 && (
                  <ul className="admin-follow-ups">
                    {prompt.follow_ups.map((f, i) => (
                      <li key={i}>
                        Follow-up: {f.text} <span className="admin-muted">({f.audio_url ? "clip ready" : "live voice"})</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {editable && (
                <div className="admin-actions">
                  <button type="button" className="icon-button" aria-label={`Edit prompt ${index + 1}`} onClick={() => setEditing(prompt.id)}>
                    <Pencil size={15} aria-hidden="true" />
                  </button>
                  <button type="button" className="icon-button admin-danger" aria-label={`Delete prompt ${index + 1}`} onClick={() => remove(prompt)}>
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </div>
              )}
            </li>
          ),
        )}
      </ol>
      {examinerLines.length > 0 && (
        <div className="admin-voice-bar">
          <p className="admin-muted">
            Examiner voice: {examinerLines.length - missing.length} of {examinerLines.length} lines have a pre-recorded clip. Lines
            without one are spoken live on the student&rsquo;s device (Kokoro, then Piper, then the browser voice).
          </p>
          {editable && missing.length > 0 && (
            <button type="button" className="button button-secondary button-sm" disabled={voiceProgress != null} onClick={() => void generateVoices()}>
              {voiceProgress != null && <Loader2 size={14} className="spin" aria-hidden="true" />} Generate examiner voice for {missing.length} line
              {missing.length === 1 ? "" : "s"}
            </button>
          )}
          {voiceProgress && (
            <p className="admin-muted" aria-live="polite">
              {voiceProgress}
            </p>
          )}
        </div>
      )}
      {error && <p className="form-banner form-banner-error" role="alert">{error}</p>}
      {editable &&
        (editing === "new" ? (
          <div className="admin-question-item admin-question-item-editing">
            <SpeakingPromptForm
              sectionId={section.id}
              prompt={null}
              defaultPart={defaultPart}
              displayOrder={nextOrder(section.speaking_prompts)}
              onDone={(changed) => {
                setEditing(null);
                if (changed) onChanged();
              }}
            />
          </div>
        ) : (
          <button type="button" className="button button-secondary button-sm" onClick={() => setEditing("new")}>
            <Plus size={14} aria-hidden="true" /> Add prompt
          </button>
        ))}
    </div>
  );
}

function SpeakingPromptForm({
  sectionId,
  prompt,
  defaultPart,
  displayOrder,
  onDone,
}: {
  sectionId: string;
  prompt: AdminSpeakingPrompt | null;
  defaultPart: 1 | 2 | 3;
  displayOrder: number;
  onDone: (changed: boolean) => void;
}) {
  const [part, setPart] = useState<1 | 2 | 3>(prompt?.part ?? defaultPart);
  const [text, setText] = useState(prompt?.prompt ?? "");
  const [bullets, setBullets] = useState((prompt?.bullets ?? []).join("\n"));
  const [prep, setPrep] = useState(prompt?.prep_seconds != null ? String(prompt.prep_seconds) : part === 2 && !prompt ? "60" : "");
  const [speak, setSpeak] = useState(prompt?.speak_seconds != null ? String(prompt.speak_seconds) : "");
  const [followUps, setFollowUps] = useState((prompt?.follow_ups ?? []).map((f) => f.text).join("\n"));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setError("");
    if (!text.trim()) return setError("Write the prompt.");
    const bulletList = lines(bullets);
    const followUpList = lines(followUps);
    if (followUpList.length > 10) return setError("Up to 10 follow-up questions per prompt.");
    setSaving(true);
    // A clip recorded for old wording would contradict the text: keep clips
    // only for lines whose text didn't change.
    const oldClips = new Map((prompt?.follow_ups ?? []).map((f) => [f.text, f.audio_url]));
    const payload = {
      part,
      prompt: text.trim(),
      bullets: bulletList.length ? bulletList : null,
      prep_seconds: prep ? Number(prep) : null,
      speak_seconds: speak ? Number(speak) : null,
      follow_ups: followUpList.map((line) => ({ text: line, audio_url: oldClips.get(line) ?? null })),
      audio_url: prompt && prompt.prompt === text.trim() ? prompt.audio_url : null,
    };
    try {
      if (prompt) await api.patch(`/admin/speaking-prompts/${prompt.id}`, payload);
      else await api.post(`/admin/sections/${sectionId}/speaking-prompts`, { ...payload, display_order: displayOrder });
      onDone(true);
    } catch (err) {
      setError(describeError(err, "Failed to save the prompt."));
      setSaving(false);
    }
  };

  return (
    <div className="admin-form">
      <div className="admin-form-grid">
        <label className="admin-field">
          <span>Part</span>
          <select className="form-input" value={part} onChange={(e) => setPart(Number(e.target.value) as 1 | 2 | 3)}>
            <option value={1}>Part 1 · Interview</option>
            <option value={2}>Part 2 · Long turn (cue card)</option>
            <option value={3}>Part 3 · Discussion</option>
          </select>
        </label>
        <label className="admin-field admin-field-narrow">
          <span>Preparation (seconds)</span>
          <input className="form-input" type="number" min={0} value={prep} onChange={(e) => setPrep(e.target.value)} />
        </label>
        <label className="admin-field admin-field-narrow">
          <span>Speaking time (seconds)</span>
          <input className="form-input" type="number" min={1} value={speak} onChange={(e) => setSpeak(e.target.value)} />
        </label>
        <label className="admin-field admin-field-wide">
          <span>Question or cue-card topic</span>
          <textarea className="form-input" rows={2} value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        {part === 2 && (
          <label className="admin-field admin-field-wide">
            <span>Cue card bullet points (one per line). Leave empty for a short Part 2 follow-up question.</span>
            <textarea className="form-input" rows={4} value={bullets} onChange={(e) => setBullets(e.target.value)} />
          </label>
        )}
        <label className="admin-field admin-field-wide">
          <span>
            Follow-up questions for the live examiner (one per line, up to 10). The examiner may ask one or two of these after the
            answer. It never invents its own.
          </span>
          <textarea className="form-input" rows={3} value={followUps} onChange={(e) => setFollowUps(e.target.value)} />
        </label>
      </div>
      <p className="admin-muted">Part 2 recordings stop automatically at the speaking time. Other parts show it as a target.</p>
      {error && <p className="form-banner form-banner-error" role="alert">{error}</p>}
      <div className="admin-actions">
        <button type="button" className="button button-primary button-sm" onClick={save} disabled={saving}>
          {saving && <Loader2 size={14} className="spin" aria-hidden="true" />} Save prompt
        </button>
        <button type="button" className="button button-secondary button-sm" onClick={() => onDone(false)}>Cancel</button>
      </div>
    </div>
  );
}

// --- Chart images (Writing Task 1) ------------------------------------

export function ImageBlock({ section, versionId, editable, onChanged }: BlockProps & { versionId: string }) {
  const images = section.media_assets.filter((media) => media.type === "image");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const problem = checkImageFile(file);
    if (problem) return setError(problem);
    const attribution = window.prompt("Credit or source for this image (e.g. \"Original Prepband chart\")", "Original Prepband chart") ?? "";
    setError("");
    setUploading(true);
    try {
      const uploaded = await uploadTestMedia(file, versionId);
      await api.post(`/admin/sections/${section.id}/media-assets`, {
        type: "image",
        storage_key: uploaded.storage_key,
        public_url: uploaded.public_url,
        content_type: uploaded.content_type,
        size_bytes: uploaded.size_bytes,
        attribution: attribution.trim() || null,
      });
      onChanged();
    } catch (err) {
      setError(describeError(err, "Upload failed."));
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Remove this image?")) return;
    try {
      await api.delete(`/admin/media-assets/${id}`);
      onChanged();
    } catch (err) {
      setError(describeError(err, "Failed to remove the image."));
    }
  };

  return (
    <div className="admin-subblock">
      <h3>Chart images ({images.length})</h3>
      <p className="admin-muted">Optional. Shown with every task in this section. A data table on the task is more accessible.</p>
      <input ref={input} type="file" accept={IMAGE_ACCEPT} hidden onChange={handleFile} />
      {images.map((media) => (
        <div className="admin-media" key={media.id}>
          {media.public_url && <img src={media.public_url} alt="" className="admin-image-preview" />}
          <p className="admin-muted">{media.attribution ?? "No credit set"}</p>
          {editable && (
            <div className="admin-actions">
              <button type="button" className="button button-secondary button-sm admin-danger" onClick={() => remove(media.id)}>
                <Trash2 size={14} aria-hidden="true" /> Remove
              </button>
            </div>
          )}
        </div>
      ))}
      {error && <p className="form-banner form-banner-error" role="alert">{error}</p>}
      {editable && (
        <button type="button" className="button button-secondary button-sm" onClick={() => input.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 size={14} className="spin" aria-hidden="true" /> : <Upload size={14} aria-hidden="true" />} Upload image
        </button>
      )}
    </div>
  );
}
