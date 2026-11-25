import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

type Props = {
  src: string;
  mode: "practice" | "exam";
};

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

/**
 * Practice mode gets the full native player (seek bar, replay freely).
 * Exam mode (FR-LIST-03) deliberately exposes no seek bar - just play/
 * pause and an elapsed-time readout, so a student can't rewind or skip
 * ahead the way they could in practice.
 */
export function AudioPlayer({ src, mode }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (mode !== "exam") return;
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => setElapsed(audio.currentTime);
    const onEnded = () => setPlaying(false);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, [mode]);

  if (mode === "practice") {
    return <audio className="engine-audio" controls src={src} />;
  }

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
    }
  };

  return (
    <div className="engine-audio engine-audio-exam">
      <audio ref={audioRef} src={src} />
      <button type="button" className="icon-button engine-audio-toggle" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <span className="engine-audio-time">{formatTime(elapsed)}</span>
      <span className="engine-audio-note">Exam mode: no rewinding or fast-forwarding.</span>
    </div>
  );
}
