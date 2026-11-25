import { useState } from "react";
import { Loader2 } from "lucide-react";
import { api, describeError } from "../../lib/apiClient";
import type { QuestionType } from "../../lib/attemptTypes";
import { countAnswerWords } from "../engine/QuestionRenderer";
import {
  QUESTION_TYPE_LABELS,
  TEXT_QUESTION_TYPES,
  type AdminAnswerKey,
  type AdminQuestion,
} from "../../lib/adminTypes";

type Props = {
  sectionId: string;
  question: AdminQuestion | null; // null = new question
  answerKey: AdminAnswerKey | null;
  nextDisplayOrder: number;
  onSaved: () => void;
  onCancel: () => void;
};

const TFNG = ["True", "False", "Not Given"];
const YNNG = ["Yes", "No", "Not Given"];

const lines = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

function asList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return [value];
  return [];
}

function matchingShape(options: unknown): { prompts: string[]; choices: string[] } {
  if (options && typeof options === "object" && !Array.isArray(options)) {
    const value = options as { prompts?: unknown; choices?: unknown };
    return { prompts: asList(value.prompts), choices: asList(value.choices) };
  }
  return { prompts: [], choices: [] };
}

/**
 * Create or edit one question and its answer key together. Validation
 * mirrors the backend's question_problem() so mistakes surface here
 * rather than at publish time.
 */
export function QuestionEditor({ sectionId, question, answerKey, nextDisplayOrder, onSaved, onCancel }: Props) {
  const [type, setType] = useState<QuestionType>(question?.type ?? "multiple_choice");
  const [prompt, setPrompt] = useState(question?.prompt ?? "");
  const [marks, setMarks] = useState(String(question?.marks ?? 1));
  const initialLimit =
    question?.options && typeof question.options === "object" && !Array.isArray(question.options)
      ? (question.options as { max_words?: unknown }).max_words
      : undefined;
  const [wordLimit, setWordLimit] = useState(typeof initialLimit === "number" ? String(initialLimit) : "");
  const [optionsText, setOptionsText] = useState(Array.isArray(question?.options) ? asList(question?.options).join("\n") : "");
  const initialMatching = matchingShape(question?.options);
  const [matchPrompts, setMatchPrompts] = useState(initialMatching.prompts.join("\n"));
  const [matchChoices, setMatchChoices] = useState(initialMatching.choices.join("\n"));

  const initialCorrect = answerKey?.correct_answers;
  const [singleAnswer, setSingleAnswer] = useState(asList(initialCorrect)[0] ?? "");
  const [multiAnswer, setMultiAnswer] = useState<string[]>(asList(initialCorrect));
  const [matchAnswer, setMatchAnswer] = useState<Record<string, string>>(
    initialCorrect && typeof initialCorrect === "object" && !Array.isArray(initialCorrect) ? (initialCorrect as Record<string, string>) : {},
  );
  const [textAnswers, setTextAnswers] = useState(TEXT_QUESTION_TYPES.includes(question?.type ?? "multiple_choice") ? asList(initialCorrect).join("\n") : "");
  const [aliases, setAliases] = useState((answerKey?.accepted_aliases ?? []).join("\n"));
  const [rationale, setRationale] = useState(answerKey?.rationale ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isChoice = type === "multiple_choice" || type === "multiple_select";
  const isJudgement = type === "true_false_not_given" || type === "yes_no_not_given";
  const isText = TEXT_QUESTION_TYPES.includes(type);
  const optionList = lines(optionsText);
  const promptList = lines(matchPrompts);
  const choiceList = lines(matchChoices);

  const build = (): { options: unknown; correct: unknown; problem: string | null } => {
    if (!prompt.trim()) return { options: null, correct: null, problem: "Write the question prompt." };
    if (isChoice) {
      if (optionList.length < 2) return { options: null, correct: null, problem: "Add at least two options, one per line." };
      if (new Set(optionList).size !== optionList.length) return { options: null, correct: null, problem: "Options must be unique." };
      if (type === "multiple_choice") {
        if (!optionList.includes(singleAnswer)) return { options: null, correct: null, problem: "Choose the correct option." };
        return { options: optionList, correct: [singleAnswer], problem: null };
      }
      const chosen = multiAnswer.filter((item) => optionList.includes(item));
      if (chosen.length === 0) return { options: null, correct: null, problem: "Tick at least one correct option." };
      return { options: optionList, correct: chosen, problem: null };
    }
    if (isJudgement) {
      const allowed = type === "true_false_not_given" ? TFNG : YNNG;
      if (!allowed.includes(singleAnswer)) return { options: null, correct: null, problem: "Choose the correct answer." };
      return { options: null, correct: [singleAnswer], problem: null };
    }
    if (type === "matching") {
      if (promptList.length === 0 || choiceList.length === 0) {
        return { options: null, correct: null, problem: "Add at least one item to match and one choice." };
      }
      const correct: Record<string, string> = {};
      for (let index = 0; index < promptList.length; index += 1) {
        const value = matchAnswer[String(index)];
        if (!value || !choiceList.includes(value)) {
          return { options: null, correct: null, problem: `Choose the answer for item ${index + 1}.` };
        }
        correct[String(index)] = value;
      }
      return { options: { prompts: promptList, choices: choiceList }, correct, problem: null };
    }
    // text answers
    const accepted = lines(textAnswers);
    if (accepted.length === 0) return { options: null, correct: null, problem: "Add at least one accepted answer." };
    if (type === "gap_fill" && !prompt.includes("___")) {
      return { options: null, correct: null, problem: 'Gap fill prompts need "___" where the blank goes.' };
    }
    if (wordLimit.trim()) {
      const limit = Number(wordLimit);
      if (!Number.isInteger(limit) || limit < 1 || limit > 10) {
        return { options: null, correct: null, problem: "Word limit must be a whole number from 1 to 10, or empty." };
      }
      const tooLong = accepted.find((answer) => countAnswerWords(answer) > limit);
      if (tooLong) return { options: null, correct: null, problem: `"${tooLong}" is longer than the word limit.` };
      return { options: { max_words: limit }, correct: accepted, problem: null };
    }
    return { options: null, correct: accepted, problem: null };
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const marksValue = Number(marks);
    if (!Number.isFinite(marksValue) || marksValue < 0) {
      setError("Marks must be zero or more.");
      return;
    }
    const { options, correct, problem } = build();
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    try {
      const payload = { type, prompt: prompt.trim(), options, marks: marksValue };
      const saved = question
        ? await api.patch<AdminQuestion>(`/admin/questions/${question.id}`, payload)
        : await api.post<AdminQuestion>(`/admin/sections/${sectionId}/questions`, { ...payload, display_order: nextDisplayOrder });
      const aliasList = isText ? lines(aliases) : [];
      await api.put(`/admin/questions/${saved.id}/answer-key`, {
        correct_answers: correct,
        accepted_aliases: aliasList.length ? aliasList : null,
        rationale: rationale.trim() || null,
      });
      onSaved();
    } catch (err) {
      setError(describeError(err, "Failed to save the question."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="admin-question-form" onSubmit={handleSave}>
      <div className="admin-form-grid">
        <label className="admin-field">
          <span>Question type</span>
          <select className="form-input" value={type} onChange={(e) => setType(e.target.value as QuestionType)}>
            {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((value) => (
              <option key={value} value={value}>{QUESTION_TYPE_LABELS[value]}</option>
            ))}
          </select>
        </label>
        <label className="admin-field admin-field-narrow">
          <span>Marks</span>
          <input className="form-input" type="number" min={0} step="0.5" value={marks} onChange={(e) => setMarks(e.target.value)} />
        </label>
        <label className="admin-field admin-field-wide">
          <span>Prompt {type === "gap_fill" && <em>(use ___ for the blank)</em>}</span>
          <textarea className="form-input" rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        </label>
      </div>

      {isChoice && (
        <div className="admin-form-grid">
          <label className="admin-field admin-field-wide">
            <span>Options (one per line)</span>
            <textarea className="form-input" rows={4} value={optionsText} onChange={(e) => setOptionsText(e.target.value)} />
          </label>
          {optionList.length > 0 && (
            <fieldset className="admin-field admin-field-wide admin-answer-set">
              <legend>Correct {type === "multiple_select" ? "options" : "option"}</legend>
              {optionList.map((option) => (
                <label key={option} className="engine-option">
                  {type === "multiple_choice" ? (
                    <input type="radio" name="admin-correct" checked={singleAnswer === option} onChange={() => setSingleAnswer(option)} />
                  ) : (
                    <input
                      type="checkbox"
                      checked={multiAnswer.includes(option)}
                      onChange={(e) =>
                        setMultiAnswer(e.target.checked ? [...multiAnswer, option] : multiAnswer.filter((item) => item !== option))
                      }
                    />
                  )}
                  {option}
                </label>
              ))}
            </fieldset>
          )}
        </div>
      )}

      {isJudgement && (
        <fieldset className="admin-field admin-answer-set">
          <legend>Correct answer</legend>
          {(type === "true_false_not_given" ? TFNG : YNNG).map((choice) => (
            <label key={choice} className="engine-option">
              <input type="radio" name="admin-correct" checked={singleAnswer === choice} onChange={() => setSingleAnswer(choice)} />
              {choice}
            </label>
          ))}
        </fieldset>
      )}

      {type === "matching" && (
        <div className="admin-form-grid">
          <label className="admin-field">
            <span>Items to match (one per line)</span>
            <textarea className="form-input" rows={4} value={matchPrompts} onChange={(e) => setMatchPrompts(e.target.value)} />
          </label>
          <label className="admin-field">
            <span>Choices (one per line)</span>
            <textarea className="form-input" rows={4} value={matchChoices} onChange={(e) => setMatchChoices(e.target.value)} />
          </label>
          {promptList.length > 0 && choiceList.length > 0 && (
            <fieldset className="admin-field admin-field-wide admin-answer-set">
              <legend>Correct matches</legend>
              {promptList.map((item, index) => (
                <div className="engine-matching-row" key={`${item}-${index}`}>
                  <span className="engine-matching-prompt">{item}</span>
                  <select
                    className="form-input"
                    value={matchAnswer[String(index)] ?? ""}
                    onChange={(e) => setMatchAnswer({ ...matchAnswer, [String(index)]: e.target.value })}
                  >
                    <option value="" disabled>Choose…</option>
                    {choiceList.map((choice) => (
                      <option key={choice} value={choice}>{choice}</option>
                    ))}
                  </select>
                </div>
              ))}
            </fieldset>
          )}
          <p className="admin-muted admin-field-wide">
            Matching is marked all-or-nothing. For one mark per item, add one matching question per item.
          </p>
        </div>
      )}

      {isText && (
        <div className="admin-form-grid">
          <label className="admin-field">
            <span>Accepted answers (one per line)</span>
            <textarea className="form-input" rows={3} value={textAnswers} onChange={(e) => setTextAnswers(e.target.value)} />
          </label>
          <label className="admin-field">
            <span>Also accept (aliases, one per line)</span>
            <textarea className="form-input" rows={3} value={aliases} onChange={(e) => setAliases(e.target.value)} />
          </label>
          <label className="admin-field admin-field-narrow">
            <span>Word limit (optional)</span>
            <input
              className="form-input"
              type="number"
              min={1}
              max={10}
              step={1}
              value={wordLimit}
              onChange={(e) => setWordLimit(e.target.value)}
              aria-describedby="word-limit-help"
            />
          </label>
          <p id="word-limit-help" className="admin-muted admin-field-wide">
            Marking ignores capitals, extra spaces, trailing punctuation, hyphens and British/American spelling. With a word
            limit, a longer answer is marked wrong, as in the exam (numbers don't count as words). Imported questions get the
            limit from their section's instructions, such as "NO MORE THAN TWO WORDS".
          </p>
        </div>
      )}

      <label className="admin-field">
        <span>Explanation shown after submission (optional)</span>
        <textarea className="form-input" rows={2} value={rationale} onChange={(e) => setRationale(e.target.value)} />
      </label>

      {error && <p className="form-banner form-banner-error" role="alert">{error}</p>}
      <div className="admin-actions">
        <button type="submit" className="button button-primary button-sm" disabled={saving}>
          {saving && <Loader2 size={14} className="spin" aria-hidden="true" />} {question ? "Save question" : "Add question"}
        </button>
        <button type="button" className="button button-secondary button-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

/** One-line summary of a question's answer, for the collapsed list. */
export function summarizeAnswer(key: AdminAnswerKey | null): string {
  if (!key) return "No answer key";
  const value = key.correct_answers;
  if (Array.isArray(value)) return value.join(" / ");
  if (value && typeof value === "object") return Object.values(value as Record<string, string>).join(", ");
  return String(value);
}
