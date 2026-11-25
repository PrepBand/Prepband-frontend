import { useCallback, useEffect, useState } from "react";
import { Loader2, Wand2 } from "lucide-react";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { api, describeError } from "../../lib/apiClient";
import type { ExaminerPhraseOut } from "../../lib/live/phrases";
import { generateExaminerClip } from "../../lib/live/voiceClips";
import { uploadExaminerPhraseAudio } from "../../lib/uploadTestMedia";

const LINE_HELP: Record<string, string> = {
  greeting: "Opens every live test. Keep the “AI practice examiner” disclosure.",
  ask_name: "Warm-up question.",
  ask_origin: "Warm-up question.",
  part1_intro: "Before the Part 1 questions.",
  part2_intro: "Explains the cue card and the one minute of preparation.",
  part2_start: "Said after preparation; the student starts talking.",
  part2_stop: "Said when the two-minute long turn hits its limit.",
  part3_intro: "Before the Part 3 discussion.",
  ack_1: "Short acknowledgement between questions.",
  ack_2: "Short acknowledgement between questions.",
  ack_3: "Short acknowledgement between questions.",
  ack_4: "Short acknowledgement between questions.",
  more: "After a very short answer.",
  part2_more: "When the long turn stops early.",
  why: "Generic Part 3 follow-up.",
  example: "Generic Part 3 follow-up.",
  take_time: "After a long silence.",
  repeat_intro: "When the student asks to hear the question again.",
  no_answer: "When there's still no answer.",
  time_up: "When a Part 1 or Part 3 answer hits its limit.",
  move_on: "When the long turn gets no answer.",
  end: "Ends the test.",
};

/**
 * Phase 5: the live examiner's fixed lines. Admins can reword them and
 * generate a natural voice clip (Kokoro, in this browser) so students hear
 * it without downloading the voice model.
 */
export function AdminExaminerPage() {
  const [phrases, setPhrases] = useState<ExaminerPhraseOut[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(
    () =>
      api
      .get<ExaminerPhraseOut[]>("/admin/examiner/phrases")
      .then((rows) => {
        setPhrases(rows);
        setDrafts(Object.fromEntries(rows.map((row) => [row.key, row.text])));
      })
      .catch((err) => setError(describeError(err, "Failed to load the examiner lines."))),
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (row: ExaminerPhraseOut, audioUrl: string | null) => {
    const updated = await api.put<ExaminerPhraseOut>(`/admin/examiner/phrases/${row.key}`, {
      text: (drafts[row.key] ?? row.text).trim(),
      audio_url: audioUrl,
    });
    setPhrases((list) => (list ?? []).map((p) => (p.key === updated.key ? updated : p)));
    setDrafts((d) => ({ ...d, [updated.key]: updated.text }));
    return updated;
  };

  const saveText = async (row: ExaminerPhraseOut) => {
    setBusy(row.key);
    setError("");
    try {
      // New wording makes the old clip wrong: drop it so the new text is spoken.
      await save(row, null);
    } catch (err) {
      setError(describeError(err, "Couldn't save the line."));
    } finally {
      setBusy(null);
    }
  };

  const generate = async (rows: ExaminerPhraseOut[]) => {
    setError("");
    try {
      for (const [index, row] of rows.entries()) {
        setBusy(row.key);
        setProgress(`Voice ${index + 1} of ${rows.length}`);
        // Save any edited wording first, so the clip matches it.
        const current = drafts[row.key]?.trim() !== row.text ? await save(row, null) : row;
        const file = await generateExaminerClip(current.text, (fraction) =>
          setProgress(`Loading the Kokoro voice model${fraction != null ? ` (${Math.round(fraction * 100)}%)` : ""}, first time only`),
        );
        const uploaded = await uploadExaminerPhraseAudio(file);
        await save(current, uploaded.public_url);
      }
    } catch (err) {
      setError(describeError(err, "Couldn't generate the voice."));
    } finally {
      setBusy(null);
      setProgress("");
    }
  };

  const missing = (phrases ?? []).filter((p) => !p.audio_url);

  return (
    <AdminLayout title="Examiner">
      <div className="page-heading">
        <h1>The AI examiner&rsquo;s lines.</h1>
        <p>
          What the live speaking examiner says between questions. Questions and follow-ups themselves are written per test, in the
          test editor.
        </p>
      </div>

      {error && (
        <p className="form-banner form-banner-error" role="alert">
          {error}
        </p>
      )}

      {phrases && (
        <div className="admin-toolbar">
          <button
            type="button"
            className="button button-primary"
            disabled={busy != null || missing.length === 0}
            onClick={() => void generate(missing)}
          >
            {busy != null ? <Loader2 size={15} className="spin" aria-hidden="true" /> : <Wand2 size={15} aria-hidden="true" />}
            {missing.length === 0 ? "Every line has a voice clip" : `Generate voice for ${missing.length} line${missing.length === 1 ? "" : "s"}`}
          </button>
          {progress && (
            <span className="admin-muted" aria-live="polite">
              {progress}
            </span>
          )}
        </div>
      )}

      {!phrases && !error && (
        <p className="auth-status-row">
          <Loader2 size={18} className="spin" aria-hidden="true" /> Loading…
        </p>
      )}

      {phrases && (
        <ul className="admin-phrase-list">
          {phrases.map((row) => {
            const changed = (drafts[row.key] ?? row.text).trim() !== row.text;
            return (
              <li key={row.key} className="dashboard-card admin-phrase">
                <label className="admin-field">
                  <span>
                    <code>{row.key}</code> {LINE_HELP[row.key] ?? ""}
                  </span>
                  <textarea
                    className="form-input"
                    rows={row.text.length > 90 ? 3 : 1}
                    maxLength={500}
                    value={drafts[row.key] ?? row.text}
                    onChange={(e) => setDrafts((d) => ({ ...d, [row.key]: e.target.value }))}
                  />
                </label>
                <div className="admin-actions">
                  {row.audio_url ? (
                    <audio controls preload="none" src={row.audio_url} aria-label={`Voice clip for ${row.key}`} />
                  ) : (
                    <span className="admin-muted">No clip yet: spoken live on the student&rsquo;s device.</span>
                  )}
                  {changed && (
                    <button type="button" className="button button-secondary button-sm" disabled={busy != null} onClick={() => void saveText(row)}>
                      Save wording{row.audio_url ? " (removes the old clip)" : ""}
                    </button>
                  )}
                  <button type="button" className="button button-secondary button-sm" disabled={busy != null} onClick={() => void generate([row])}>
                    {busy === row.key && <Loader2 size={14} className="spin" aria-hidden="true" />} {row.audio_url ? "Regenerate voice" : "Generate voice"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AdminLayout>
  );
}
