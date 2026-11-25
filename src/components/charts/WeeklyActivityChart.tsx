import { useMemo, useState } from "react";
import type { ProgressPoint } from "../../lib/attemptTypes";
import { tooltipShift } from "./ScoreTrendChart";
import { useElementWidth } from "./useElementWidth";

const HEIGHT = 170;
const PAD = { top: 18, right: 8, bottom: 26, left: 8 };
const GAP = 10;

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/**
 * Finished attempts per day over the last seven days, one series (bars in
 * categorical slot 1). Each bar carries its own hover/focus tooltip and an
 * accessible name; the count sits above each non-empty bar.
 */
export function WeeklyActivityChart({ points }: { points: ProgressPoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const { ref: frameRef, width: WIDTH } = useElementWidth<HTMLDivElement>(420);

  const days = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const list = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - i));
      return { date, count: 0 };
    });
    const index = new Map(list.map((d, i) => [dayKey(d.date), i]));
    for (const p of points) {
      const i = index.get(dayKey(new Date(p.submitted_at)));
      if (i != null) list[i].count += 1;
    }
    return list;
  }, [points]);

  const max = Math.max(1, ...days.map((d) => d.count));
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const barW = (WIDTH - PAD.left - PAD.right - GAP * 6) / 7;
  const total = days.reduce((sum, d) => sum + d.count, 0);

  return (
    <figure className="viz-root weekly-activity">
      <figcaption className="viz-head">
        <span className="viz-title">Finished sessions, last 7 days</span>
        <span className="viz-subtitle">{total} in total</span>
      </figcaption>
      <div className="viz-frame" ref={frameRef}>
        <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="group" aria-label="Finished sessions per day for the last 7 days">
          <line className="viz-baseline" x1={PAD.left} x2={WIDTH - PAD.right} y1={PAD.top + plotH} y2={PAD.top + plotH} />
          {days.map((day, i) => {
            const h = (day.count / max) * plotH;
            const x = PAD.left + i * (barW + GAP);
            const y = PAD.top + plotH - h;
            const label = day.date.toLocaleDateString(undefined, { weekday: "short" });
            const full = `${day.date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}: ${day.count} finished`;
            return (
              <g
                key={i}
                tabIndex={0}
                role="img"
                aria-label={full}
                className="viz-bar-group"
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
              >
                <rect className="viz-bar-hit" x={x - GAP / 2} y={PAD.top} width={barW + GAP} height={plotH} />
                {day.count > 0 && <path className="viz-bar" d={roundedTopBar(x, y, barW, h, 4)} />}
                {day.count > 0 && (
                  <text className="viz-bar-value" x={x + barW / 2} y={y - 5} textAnchor="middle">
                    {day.count}
                  </text>
                )}
                <text className="viz-axis-label" x={x + barW / 2} y={HEIGHT - 8} textAnchor="middle">
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
        {active != null && (
          <div
            className="viz-tooltip"
            style={{
              left: `${((PAD.left + active * (barW + GAP) + barW / 2) / WIDTH) * 100}%`,
              top: "12%",
              transform: tooltipShift((active + 0.5) / 7),
            }}
            role="presentation"
          >
            <strong>{days[active].count} finished</strong>
            <span>{days[active].date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}</span>
          </div>
        )}
      </div>
    </figure>
  );
}

/** A bar anchored to the baseline with only its data end rounded. */
function roundedTopBar(x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, h, w / 2);
  const bottom = y + h;
  return `M${x},${bottom} V${y + radius} Q${x},${y} ${x + radius},${y} H${x + w - radius} Q${x + w},${y} ${x + w},${y + radius} V${bottom} Z`;
}
