import { useId } from "react";
import type { MediaAssetPublic, WritingPromptPublic, WritingVisual } from "../../lib/attemptTypes";
import { countParagraphs, countWords } from "../../lib/writingStats";

type Props = {
  prompt: WritingPromptPublic;
  value: string;
  onChange: (value: string) => void;
  images?: MediaAssetPublic[];
  disabled?: boolean;
};

/** FR-WRITE-02: accessible data table for Academic Task 1. */
export function WritingVisualTable({ visual }: { visual: WritingVisual }) {
  return (
    <div className="writing-visual">
      <table>
        {visual.caption && <caption>{visual.caption}</caption>}
        <thead>
          <tr>
            {visual.columns.map((column) => (
              <th key={column} scope="col">{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visual.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) =>
                cellIndex === 0 ? (
                  <th key={cellIndex} scope="row">{cell}</th>
                ) : (
                  <td key={cellIndex}>{cell}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * One Writing task: prompt, optional chart/table, a plain-text editor with
 * the browser's own spellcheck (FR-WRITE-04 "spelling assistance where
 * browser supports it"), and a live word/paragraph count against the
 * recommended minimum. No formatting toolbar - none is needed (FR-WRITE-02).
 */
export function WritingTask({ prompt, value, onChange, images = [], disabled }: Props) {
  const editorId = useId();
  const words = countWords(value);
  const paragraphs = countParagraphs(value);
  const reached = words >= prompt.min_words;

  return (
    <div className="writing-task">
      <div className="writing-prompt">
        <p className="writing-task-label">
          Task {prompt.task_number}
          {prompt.recommended_minutes ? ` · about ${prompt.recommended_minutes} minutes` : ""} · at least {prompt.min_words} words
        </p>
        {prompt.prompt.split("\n").map((line, index) =>
          line.trim() ? <p key={index}>{line}</p> : <br key={index} />,
        )}
        {prompt.instructions && <p className="writing-instructions">{prompt.instructions}</p>}
        {prompt.visual && <WritingVisualTable visual={prompt.visual} />}
        {images
          .filter((media) => media.type === "image" && media.public_url)
          .map((media) => (
            <figure key={media.id} className="writing-image">
              <img src={media.public_url ?? undefined} alt={`Chart for Task ${prompt.task_number}`} />
              {media.attribution && <figcaption>{media.attribution}</figcaption>}
            </figure>
          ))}
      </div>

      <div className="writing-editor">
        <label htmlFor={editorId} className="writing-editor-label">
          Your answer
        </label>
        <textarea
          id={editorId}
          className="form-input writing-textarea"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          spellCheck
          lang="en"
          rows={18}
          placeholder={prompt.letter_format ? "Dear ..." : "Start writing here. Leave a blank line between paragraphs."}
          aria-describedby={`${editorId}-count`}
        />
        <p id={`${editorId}-count`} className={`writing-count ${reached ? "is-met" : "is-under"}`} aria-live="polite">
          {words} {words === 1 ? "word" : "words"} · {paragraphs} {paragraphs === 1 ? "paragraph" : "paragraphs"}
          {reached ? " · minimum reached" : ` · ${prompt.min_words - words} more to reach ${prompt.min_words}`}
        </p>
      </div>
    </div>
  );
}
