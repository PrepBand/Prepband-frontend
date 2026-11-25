import type { QuestionPublic } from "../../lib/attemptTypes";

type Props = {
  question: QuestionPublic;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
};

type MatchingOptions = { prompts: string[]; choices: string[] };

function isMatchingOptions(options: unknown): options is MatchingOptions {
  return (
    !!options &&
    typeof options === "object" &&
    Array.isArray((options as MatchingOptions).prompts) &&
    Array.isArray((options as MatchingOptions).choices)
  );
}

function MarksLabel({ marks }: { marks: number }) {
  return (
    <span className="practice-level">
      ({marks} mark{marks === 1 ? "" : "s"})
    </span>
  );
}

function QuestionInput({ question, value, onChange, disabled }: Props) {
  const options = Array.isArray(question.options) ? (question.options as string[]) : null;

  if (question.type === "multiple_choice" && options) {
    return (
      <div className="engine-options">
        {options.map((option) => (
          <label key={option} className="engine-option">
            <input
              type="radio"
              name={question.id}
              checked={value === option}
              disabled={disabled}
              onChange={() => onChange(option)}
            />
            {option}
          </label>
        ))}
      </div>
    );
  }

  if (question.type === "multiple_select" && options) {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div className="engine-options">
        {options.map((option) => (
          <label key={option} className="engine-option">
            <input
              type="checkbox"
              checked={selected.includes(option)}
              disabled={disabled}
              onChange={(event) => {
                const next = event.target.checked ? [...selected, option] : selected.filter((item) => item !== option);
                onChange(next);
              }}
            />
            {option}
          </label>
        ))}
      </div>
    );
  }

  if (question.type === "true_false_not_given" || question.type === "yes_no_not_given") {
    const choices = question.type === "true_false_not_given" ? ["True", "False", "Not Given"] : ["Yes", "No", "Not Given"];
    return (
      <div className="engine-options">
        {choices.map((choice) => (
          <label key={choice} className="engine-option">
            <input
              type="radio"
              name={question.id}
              checked={value === choice}
              disabled={disabled}
              onChange={() => onChange(choice)}
            />
            {choice}
          </label>
        ))}
      </div>
    );
  }

  // matching: expects options = { prompts: string[], choices: string[] } -
  // one dropdown per left-hand prompt, answer stored as
  // { [promptIndex]: chosenValue }.
  if (question.type === "matching" && isMatchingOptions(question.options)) {
    const { prompts, choices } = question.options;
    const current = (value && typeof value === "object" ? (value as Record<string, string>) : {}) ?? {};
    return (
      <div className="engine-matching">
        {prompts.map((prompt, index) => (
          <div className="engine-matching-row" key={prompt}>
            <span className="engine-matching-prompt">{prompt}</span>
            <select
              className="form-input"
              value={current[index] ?? ""}
              disabled={disabled}
              onChange={(event) => onChange({ ...current, [index]: event.target.value })}
            >
              <option value="" disabled>
                Choose…
              </option>
              {choices.map((choice) => (
                <option key={choice} value={choice}>
                  {choice}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    );
  }

  // short_answer / sentence_completion / form_completion /
  // note_completion / table_completion, or matching without the expected
  // shape: a plain text fallback.
  const limit = maxWords(question.options);
  const hintId = limit ? `limit-${question.id}` : undefined;
  return (
    <>
      <input
        type="text"
        className="form-input engine-text-answer"
        value={typeof value === "string" ? value : ""}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Type your answer"
        aria-label="Your answer"
        aria-describedby={hintId}
      />
      {limit && <WordLimitHint id={hintId!} limit={limit} value={value} />}
    </>
  );
}

/** The question's word limit (options.max_words), if it has one. */
export function maxWords(options: unknown): number | null {
  if (options && typeof options === "object" && !Array.isArray(options)) {
    const limit = (options as { max_words?: unknown }).max_words;
    if (typeof limit === "number" && Number.isInteger(limit) && limit > 0) return limit;
  }
  return null;
}

/** Words as the marking counts them: numbers aren't words, a hyphenated
 * word is one word (matches the backend's grading.word_count). */
export function countAnswerWords(value: string): number {
  return value
    .split(/\s+/)
    .filter((token) => token && !/^[\d.,:/%£$€]+$/.test(token)).length;
}

const NUMBER_WORDS = ["", "ONE WORD", "TWO WORDS", "THREE WORDS", "FOUR WORDS", "FIVE WORDS"];

function WordLimitHint({ id, limit, value }: { id: string; limit: number; value: unknown }) {
  const used = typeof value === "string" ? countAnswerWords(value) : 0;
  const over = used > limit;
  const label = NUMBER_WORDS[limit] ?? `${limit} WORDS`;
  return (
    <span id={id} className={`engine-word-limit${over ? " engine-word-limit-over" : ""}`} aria-live="polite">
      No more than {label}
      {" (numbers don't count)"}
      {over && ` - you have ${used}, so this answer would be marked wrong`}
    </span>
  );
}

/**
 * A module-agnostic question block (prompt + marks + input) for whatever
 * question type comes back from the API - owns its own prompt rendering
 * so gap-fill can inline the blank inside the sentence without the caller
 * duplicating the prompt text. The real Reading/Listening UI (passage
 * pane, audio player) wraps this, it doesn't replace it.
 */
export function QuestionRenderer(props: Props) {
  const { question, value, onChange, disabled } = props;

  if (question.type === "gap_fill" && question.prompt.includes("___")) {
    const [before, after] = question.prompt.split(/_{3,}/, 2);
    const limit = maxWords(question.options);
    const hintId = limit ? `limit-${question.id}` : undefined;
    return (
      <div className="engine-question">
        <p className="engine-gap-fill">
          {before}
          <input
            type="text"
            className="form-input engine-gap-input"
            value={typeof value === "string" ? value : ""}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            aria-label="Answer for the gap"
            aria-describedby={hintId}
          />
          {after}
          <MarksLabel marks={question.marks} />
        </p>
        {limit && <WordLimitHint id={hintId!} limit={limit} value={value} />}
      </div>
    );
  }

  return (
    <div className="engine-question">
      <p className="engine-question-prompt">
        {question.prompt} <MarksLabel marks={question.marks} />
      </p>
      <QuestionInput {...props} />
    </div>
  );
}
