import { Link } from "react-router-dom";
import { SKILL_META } from "../../data/practice";
import type { MockModuleResult } from "../../lib/attemptTypes";
import { isModuleFinished, moduleOutcome, moduleProvenance } from "../../lib/fullMock";

/**
 * FR-MOCK-05/06: per-module outcome with its provenance, then the overall
 * band row - "Not available" whenever any module has no valid band.
 */
export function MockResultsTable({
  modules,
  overallBand,
  overallNote,
  bandNote,
  linkToAttempts = true,
}: {
  modules: MockModuleResult[];
  overallBand: number | null;
  overallNote: string;
  bandNote?: string;
  linkToAttempts?: boolean;
}) {
  return (
    <div className="mock-results">
      <table className="mock-results-table">
        <caption className="sr-only">Results by module</caption>
        <thead>
          <tr>
            <th scope="col">Module</th>
            <th scope="col">Outcome</th>
            <th scope="col">How it was scored</th>
            {linkToAttempts && (
              <th scope="col">
                <span className="sr-only">Review</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {modules.map((result) => {
            const meta = SKILL_META[result.module];
            const Icon = meta.icon;
            return (
              <tr key={result.module}>
                <th scope="row">
                  <span className="mock-results-module">
                    <Icon size={16} aria-hidden="true" /> {meta.label}
                  </span>
                </th>
                <td>{moduleOutcome(result)}</td>
                <td className="mock-results-source">{moduleProvenance(result)}</td>
                {linkToAttempts && (
                  <td className="mock-results-link">
                    {result.attempt_id && isModuleFinished(result.status) && (
                      <Link to={`/app/results/${result.attempt_id}`}>
                        Review <span className="sr-only">{meta.label}</span> answers
                      </Link>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
          <tr className="mock-results-overall">
            <th scope="row">Overall band</th>
            <td colSpan={linkToAttempts ? 3 : 2}>{overallBand == null ? "Not available" : `${overallBand.toFixed(1)} (unofficial estimate)`}</td>
          </tr>
        </tbody>
      </table>
      <p className="mock-results-note">{overallNote}</p>
      {bandNote && <p className="mock-results-note">{bandNote}</p>}
    </div>
  );
}
