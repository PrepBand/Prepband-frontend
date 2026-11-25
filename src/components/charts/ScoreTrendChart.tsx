import { useMemo, useRef, useState, type PointerEvent } from "react";
import type { ProgressPoint } from "../../lib/attemptTypes";
import { useElementWidth } from "./useElementWidth";

/**
 * Estimated band over time for the two objectively marked skills
 * (Listening, Reading). Writing and Speaking have no band and are never
 * plotted (FR-WRITE-07, FR-SPEAK-08).
 *
 * One y-axis (band 0-9), 2px lines, 8px markers with a surface ring,
 * legend plus a direct label at each line's end, a crosshair tooltip that
 * snaps to the nearest attempt, and a table view for screen readers and
 * anyone who'd rather read numbers. Series colours are the validated
 * categorical slots 1-2 (see .viz-root in styles.css).
 */

type SeriesKey = "listening" | "reading";
const SERIES: { key: SeriesKey; label: string; color: string }[] = [
  { key: "listening", label: "Listening", color: "var(--series-1)" },
  { key: "reading", label: "Reading", color: "var(--series-2)" },
];

const HEIGHT = 220;
const PAD = { top: 16, right: 96, bottom: 30, left: 30 };
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;
const BAND_TICKS = [0, 3, 6, 9];

type Plotted = ProgressPoint & { x: number; y: number; series: (typeof SERIES)[number] };

/** Keeps the tooltip inside the card: centred mid-chart, edge-anchored near the sides. */
export function tooltipShift(fraction: number) {
  const x = fraction < 0.25 ? "-12px" : fraction > 0.75 ? "calc(-100% + 12px)" : "-50%";
  return `translate(${x}, calc(-100% - 12px))`;
}

function shortDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function ScoreTrendChart({ points, title }: { points: ProgressPoint[]; title: string }) {
  const [active, setActive] = useState<Plotted | null>(null);
  const [showTable, setShowTable] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const { ref: frameRef, width: WIDTH } = useElementWidth<HTMLElement>(480);
  const PLOT_W = WIDTH - PAD.left - PAD.right;

  const banded = useMemo(
    () =>
      points
        .filter((p) => (p.module === "listening" || p.module === "reading") && p.estimated_band != null)
        .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()),
    [points],
  );

  const plotted = useMemo<Plotted[]>(() => {
    if (banded.length === 0) return [];
    const times = banded.map((p) => new Date(p.submitted_at).getTime());
    const min = Math.min(...times);
    const span = Math.max(...times) - min;
    return banded.map((p, i) => ({
      ...p,
      x: PAD.left + (span === 0 ? PLOT_W / 2 : ((times[i] - min) / span) * PLOT_W),
      y: PAD.top + PLOT_H - ((p.estimated_band ?? 0) / 9) * PLOT_H,
      series: SERIES.find((s) => s.key === p.module)!,
    }));
  }, [banded, PLOT_W]);

  if (plotted.length === 0) return null;

  const bySeries = SERIES.map((series) => ({ series, pts: plotted.filter((p) => p.series.key === series.key) })).filter(
    (entry) => entry.pts.length > 0,
  );

  const onMove = (event: PointerEvent<SVGRectElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = plotted[0];
    for (const p of plotted) if (Math.abs(p.x - x) < Math.abs(nearest.x - x)) nearest = p;
    setActive(nearest);
  };

  const first = plotted[0];
  const last = plotted[plotted.length - 1];
  const tooltipLeft = active ? `${(active.x / WIDTH) * 100}%` : "0";
  const tooltipTop = active ? `${(active.y / HEIGHT) * 100}%` : "0";

  return (
    <figure className="viz-root score-trend" ref={frameRef}>
      <figcaption className="viz-head">
        <span className="viz-title">{title}</span>
        <span className="viz-legend" aria-hidden="true">
          {bySeries.map(({ series }) => (
            <span key={series.key} className="viz-legend-item">
              <span className="viz-swatch" style={{ background: series.color }} />
              {series.label}
            </span>
          ))}
        </span>
        <button type="button" className="viz-table-toggle" onClick={() => setShowTable((v) => !v)} aria-expanded={showTable}>
          {showTable ? "Show chart" : "Show as table"}
        </button>
      </figcaption>

      {!showTable && (
        <div className="viz-frame">
          <svg
            ref={svgRef}
            width={WIDTH}
            height={HEIGHT}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-label={`${title}. ${plotted.length} attempts. Use "Show as table" for every value.`}
          >
            {BAND_TICKS.map((band) => {
              const y = PAD.top + PLOT_H - (band / 9) * PLOT_H;
              return (
                <g key={band}>
                  <line className="viz-grid" x1={PAD.left} x2={PAD.left + PLOT_W} y1={y} y2={y} />
                  <text className="viz-axis-label" x={PAD.left - 8} y={y + 4} textAnchor="end">
                    {band}
                  </text>
                </g>
              );
            })}
            <text className="viz-axis-label" x={PAD.left} y={HEIGHT - 8} textAnchor="start">
              {shortDate(first.submitted_at)}
            </text>
            {last.submitted_at !== first.submitted_at && (
              <text className="viz-axis-label" x={PAD.left + PLOT_W} y={HEIGHT - 8} textAnchor="end">
                {shortDate(last.submitted_at)}
              </text>
            )}

            {bySeries.map(({ series, pts }) => (
              <g key={series.key}>
                {pts.length > 1 && (
                  <polyline
                    className="viz-line"
                    points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
                    style={{ stroke: series.color }}
                  />
                )}
                {pts.map((p) => (
                  <circle key={p.attempt_id} className="viz-dot" cx={p.x} cy={p.y} r={4.5} style={{ fill: series.color }} />
                ))}
                <text
                  className="viz-direct-label"
                  x={pts[pts.length - 1].x + 10}
                  y={pts[pts.length - 1].y + 4}
                >
                  {series.label} {pts[pts.length - 1].estimated_band?.toFixed(1)}
                </text>
              </g>
            ))}

            {active && (
              <>
                <line className="viz-crosshair" x1={active.x} x2={active.x} y1={PAD.top} y2={PAD.top + PLOT_H} />
                <circle className="viz-dot viz-dot-active" cx={active.x} cy={active.y} r={6} style={{ fill: active.series.color }} />
              </>
            )}
            <rect
              className="viz-hit"
              x={PAD.left - 10}
              y={PAD.top}
              width={PLOT_W + 20}
              height={PLOT_H}
              onPointerMove={onMove}
              onPointerLeave={() => setActive(null)}
            />
          </svg>
          {active && (
            <div className="viz-tooltip" style={{ left: tooltipLeft, top: tooltipTop, transform: tooltipShift(active.x / WIDTH) }} role="presentation">
              <strong>Band {active.estimated_band?.toFixed(1)}</strong>
              <span>
                {active.series.label} · {active.raw_score}/{active.max_score} correct
              </span>
              <span>{active.test_title}</span>
              <span>{new Date(active.submitted_at).toLocaleString()}</span>
            </div>
          )}
        </div>
      )}

      {showTable && (
        <table className="viz-table">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Skill</th>
              <th scope="col">Test</th>
              <th scope="col">Score</th>
              <th scope="col">Est. band</th>
            </tr>
          </thead>
          <tbody>
            {plotted.map((p) => (
              <tr key={p.attempt_id}>
                <td>{new Date(p.submitted_at).toLocaleDateString()}</td>
                <td>{p.series.label}</td>
                <td>{p.test_title}</td>
                <td>
                  {p.raw_score}/{p.max_score}
                </td>
                <td>{p.estimated_band?.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="viz-note">Bands are approximate estimates from a simple percentage conversion, not official IELTS scores.</p>
    </figure>
  );
}
