import { useEffect, useRef } from "react";
import type { Activity } from "../../lib/live/useLiveExaminer";

const STATE_LABEL: Record<Activity, string> = {
  idle: "Examiner",
  speaking: "Speaking",
  listening: "Listening to you",
  thinking: "Thinking",
  preparing: "Waiting while you prepare",
};

/**
 * An illustrated (deliberately not photo-realistic) examiner. The mouth
 * follows the voice's volume; eyes blink; a ring shows when it is
 * listening. Always captioned as an AI practice examiner (FR-LIVE-08).
 */
export function ExaminerAvatar({ activity, level }: { activity: Activity; level: () => number }) {
  const mouth = useRef<SVGEllipseElement>(null);

  useEffect(() => {
    let frame = 0;
    let smooth = 0;
    const tick = () => {
      const target = activity === "speaking" ? level() : 0;
      smooth = smooth * 0.6 + target * 0.4;
      mouth.current?.setAttribute("ry", String(1.6 + smooth * 9));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [activity, level]);

  return (
    <figure className={`examiner-avatar is-${activity}`}>
      <svg viewBox="0 0 160 160" role="img" aria-label={`AI practice examiner: ${STATE_LABEL[activity]}`}>
        <circle className="examiner-ring" cx="80" cy="80" r="76" />
        <circle className="examiner-bg" cx="80" cy="80" r="70" />
        <path className="examiner-body" d="M30 150 C34 118 56 106 80 106 C104 106 126 118 130 150 Z" />
        <path className="examiner-collar" d="M66 108 L80 126 L94 108 Z" />
        <rect className="examiner-neck" x="72" y="92" width="16" height="18" rx="6" />
        <ellipse className="examiner-face" cx="80" cy="66" rx="30" ry="34" />
        <path className="examiner-hair" d="M50 62 C48 36 66 26 82 27 C100 28 114 40 110 64 C104 50 92 44 80 44 C68 44 56 50 50 62 Z" />
        <g className="examiner-eyes">
          <ellipse cx="69" cy="66" rx="3.2" ry="3.6" />
          <ellipse cx="91" cy="66" rx="3.2" ry="3.6" />
        </g>
        <path className="examiner-brow" d="M63 58 Q69 55 75 58 M85 58 Q91 55 97 58" />
        <ellipse ref={mouth} className="examiner-mouth" cx="80" cy="84" rx="7" ry="1.6" />
      </svg>
      <figcaption>
        <strong>AI practice examiner</strong>
        <span>{STATE_LABEL[activity]}</span>
      </figcaption>
    </figure>
  );
}
