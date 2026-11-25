import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Eye, Loader2, RotateCcw, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { DashboardSidebar } from "../components/dashboard/DashboardSidebar";
import { DashboardTopbar } from "../components/dashboard/DashboardTopbar";
import { QuestionRenderer } from "../components/engine/QuestionRenderer";
import { api, describeError } from "../lib/apiClient";
import type { MistakeOut, MistakesPage, RetryOut } from "../lib/attemptTypes";
import { useDashboardTheme } from "../lib/useDashboardTheme";

type Filter = "all" | "listening" | "reading";
const PAGE_SIZE = 20;

function formatAnswer(value: unknown): string {
  if (value == null || value === "") return "(no answer)";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).join(", ");
  return String(value);
}

/** Questions the student lost marks on, to try again (Listening/Reading). */
export function ReviewMistakesPage() {
  const { theme } = useDashboardTheme();
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState<MistakesPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (which: Filter, offset: number) => {
    setLoading(true);
    setError("");
    try {
      const query = `limit=${PAGE_SIZE}&offset=${offset}${which === "all" ? "" : `&module=${which}`}`;
      const next = await api.get<MistakesPage>(`/me/mistakes?${query}`);
      setPage((prev) => (offset > 0 && prev ? { ...next, items: [...prev.items, ...next.items] } : next));
    } catch (err) {
      setError(describeError(err, "Couldn't load your mistakes."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(filter, 0);
  }, [filter, load]);

  const counts = page?.by_module ?? { listening: 0, reading: 0 };
  const tabs: Array<[Filter, string, number]> = [
    ["all", "All", counts.listening + counts.reading],
    ["listening", "Listening", counts.listening],
    ["reading", "Reading", counts.reading],
  ];

  return (
    <div className="dashboard-shell" data-theme={theme}>
      <DashboardSidebar />
      <div className="dashboard-content">
        <DashboardTopbar label="Review mistakes" />

        <main className="dashboard-main dashboard-main-shell">
          <div className="page-heading-row">
            <div className="page-heading">
              <h1>Turn mistakes into marks.</h1>
              <p>
                Every Listening and Reading question you lost marks on, newest first. Try each one again; it drops off the list
                once you get it right in a real test.
              </p>
            </div>
          </div>

          <div className="review-filters" role="group" aria-label="Show mistakes from">
            {tabs.map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                className={`review-filter${filter === value ? " review-filter-active" : ""}`}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {label} <span className="review-filter-count">{count}</span>
              </button>
            ))}
          </div>

          {error && (
            <p className="form-banner form-banner-error form-banner-text" role="alert">
              {error}
            </p>
          )}

          {!error && page && page.total === 0 && !loading && (
            <div className="dashboard-card review-empty">
              <CheckCircle2 size={26} aria-hidden="true" />
              <h2>Nothing to review{filter === "all" ? "" : ` in ${filter === "listening" ? "Listening" : "Reading"}`}.</h2>
              <p>
                Finish a Listening or Reading test and any question you miss will appear here.{" "}
                <Link to="/app/practice">Go to Practice</Link>
              </p>
            </div>
          )}

          <ol className="review-list">
            {page?.items.map((item) => (
              <li key={item.question_id}>
                <MistakeCard item={item} />
              </li>
            ))}
          </ol>

          {loading && (
            <p className="page-loading" role="status">
              Loading…
            </p>
          )}
          {!loading && page && page.items.length < page.total && (
            <button type="button" className="button button-secondary" onClick={() => void load(filter, page.items.length)}>
              Show more ({page.total - page.items.length} left)
            </button>
          )}
        </main>
      </div>
    </div>
  );
}

function MistakeCard({ item }: { item: MistakeOut }) {
  const [answer, setAnswer] = useState<unknown>(null);
  const [result, setResult] = useState<RetryOut | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const check = async () => {
    setChecking(true);
    setError("");
    try {
      setResult(await api.post<RetryOut>(`/me/mistakes/${item.question_id}/check`, { response: answer }));
    } catch (err) {
      setError(describeError(err, "Couldn't check that answer."));
    } finally {
      setChecking(false);
    }
  };

  const reset = () => {
    setAnswer(null);
    setResult(null);
    setRevealed(false);
  };

  const showAnswer = revealed || result != null;
  const partly = result && !result.correct && result.credit > 0;

  return (
    <article className="dashboard-card review-card" aria-label={`${item.module} question from ${item.test_title}`}>
      <p className="review-meta">
        <span className="track-pill">{item.module === "listening" ? "Listening" : "Reading"}</span> {item.test_title}
        {item.submitted_at && ` · ${new Date(item.submitted_at).toLocaleDateString()}`} ·{" "}
        <Link to={`/app/results/${item.attempt_id}`}>See that test&rsquo;s results</Link>
      </p>
      {item.instructions && <p className="review-instructions">{item.instructions}</p>}

      <QuestionRenderer
        question={{ id: item.question_id, type: item.type, prompt: item.prompt, options: item.options, display_order: 0, marks: item.marks }}
        value={answer}
        onChange={(value) => {
          setAnswer(value);
          setResult(null);
        }}
        disabled={checking}
      />

      <div className="review-actions">
        <button type="button" className="button button-primary button-sm" onClick={() => void check()} disabled={checking || answer == null || answer === ""}>
          {checking && <Loader2 size={14} className="spin" aria-hidden="true" />} Check my answer
        </button>
        {!showAnswer && (
          <button type="button" className="button button-secondary button-sm" onClick={() => setRevealed(true)}>
            <Eye size={14} aria-hidden="true" /> Show the answer
          </button>
        )}
        {result && (
          <button type="button" className="button button-secondary button-sm" onClick={reset}>
            <RotateCcw size={14} aria-hidden="true" /> Try again
          </button>
        )}
      </div>

      <div aria-live="polite">
        {error && (
          <p className="form-banner form-banner-error" role="alert">
            {error}
          </p>
        )}
        {result && (
          <p className={`review-verdict ${result.correct ? "review-verdict-right" : "review-verdict-wrong"}`}>
            {result.correct ? <CheckCircle2 size={16} aria-hidden="true" /> : <XCircle size={16} aria-hidden="true" />}
            {result.correct ? "Correct this time." : partly ? `Partly right (${Math.round(result.credit * 100)}% of the marks).` : "Not yet."}
          </p>
        )}
      </div>

      {showAnswer && (
        <dl className="review-answers">
          <dt>Your answer in the test</dt>
          <dd>{formatAnswer(item.your_answer)}</dd>
          <dt>Correct answer</dt>
          <dd>{formatAnswer(result?.correct_answers ?? item.correct_answers)}</dd>
          {(result?.rationale ?? item.rationale) && (
            <>
              <dt>Why</dt>
              <dd>{result?.rationale ?? item.rationale}</dd>
            </>
          )}
        </dl>
      )}
    </article>
  );
}
