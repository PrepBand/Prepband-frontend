import { useEffect, useRef, useState } from "react";
import { Copy, Loader2, Mic, Play, Square } from "lucide-react";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { MicCapture, openMicrophone, resample, STT_SAMPLE_RATE, stopStream } from "../../lib/live/audio";
import { detectCapabilities, disabledTiers, setDisabledTiers, type Capabilities } from "../../lib/live/capabilities";
import { JOB_LABEL, tierById, tiersFor, type JobId, type TierId } from "../../lib/live/catalog";
import { createSttEngine } from "../../lib/live/stt";
import { createVoiceEngine } from "../../lib/live/tts";
import { wordErrorRate } from "../../lib/live/wer";

type SttRow = { id: TierId; loadSeconds?: number; transcribeSeconds?: number; text?: string; wer?: number | null; error?: string; running?: boolean };
type VoiceRow = { id: TierId; loadSeconds?: number; firstAudioSeconds?: number; error?: string; running?: boolean; play?: () => void };

const SAMPLE_REFERENCE =
  "I live in a fairly big city, and what I like most about it is that there's always something going on at the weekend.";
const VOICE_SENTENCE = "Now, in this first part, I'd like to ask you some questions about yourself.";
// The last tier of each job is the safety net and can't be switched off.
const SWITCHABLE: TierId[] = ["whisper", "moonshine", "vosk", "kokoro", "piper", "browser-voice", "silero", "qwen", "smollm", "llama"];

const secondsSince = (start: number) => Math.round((performance.now() - start) / 100) / 10;

type RecognitionCtor = new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  start: () => void;
  stop: () => void;
};

/**
 * Phase 5 step 5.1: benchmark every tier on this device (download/load
 * time, speed, word error rate) and switch tiers off on this browser to
 * test the fallbacks (the forced-failure exit test).
 */
export function AdminSpeechLabPage() {
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [disabled, setDisabled] = useState<Set<TierId>>(() => disabledTiers());
  const [reference, setReference] = useState(SAMPLE_REFERENCE);
  const [audio, setAudio] = useState<Float32Array | null>(null);
  const [recording, setRecording] = useState(false);
  const [includeCloud, setIncludeCloud] = useState(false);
  const [webSpeechText, setWebSpeechText] = useState<string | null>(null);
  const [sttRows, setSttRows] = useState<SttRow[]>(() => tiersFor("stt").map((t) => ({ id: t.id })));
  const [voiceRows, setVoiceRows] = useState<VoiceRow[]>(() => tiersFor("voice").map((t) => ({ id: t.id })));
  const [error, setError] = useState("");
  const stopRecordingRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    void detectCapabilities().then(setCaps);
  }, []);

  const toggleTier = (id: TierId) => {
    const next = new Set(disabled);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setDisabled(next);
    setDisabledTiers([...next]);
  };

  const recordSample = async () => {
    setError("");
    setWebSpeechText(null);
    try {
      const stream = await openMicrophone();
      const mic = new MicCapture(stream);
      await mic.resume();
      mic.startRecording();
      let recognition: InstanceType<RecognitionCtor> | null = null;
      const finals: string[] = [];
      const w = window as unknown as Record<string, RecognitionCtor>;
      const Recognition = w.SpeechRecognition || w.webkitSpeechRecognition;
      if (includeCloud && Recognition) {
        recognition = new Recognition();
        recognition.lang = "en-GB";
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.onresult = (event) => {
          for (let i = event.resultIndex; i < event.results.length; i += 1) if (event.results[i].isFinal) finals.push(event.results[i][0].transcript);
        };
        recognition.start();
      }
      setRecording(true);
      const finish = () => {
        recognition?.stop();
        const raw = mic.stopRecording();
        setAudio(resample(raw, mic.sampleRate));
        mic.close();
        stopStream(stream);
        setRecording(false);
        stopRecordingRef.current = null;
        setTimeout(() => setWebSpeechText(recognition ? finals.join(" ") : null), 1200);
      };
      stopRecordingRef.current = finish;
      setTimeout(() => stopRecordingRef.current?.(), 20000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't use the microphone.");
    }
  };

  const loadFile = async (file: File) => {
    setError("");
    try {
      const context = new AudioContext();
      const decoded = await context.decodeAudioData(await file.arrayBuffer());
      setAudio(resample(decoded.getChannelData(0), decoded.sampleRate));
      void context.close();
      setWebSpeechText(null);
    } catch {
      setError("That file couldn't be decoded. Use WAV, MP3 or OGG.");
    }
  };

  const updateStt = (id: TierId, update: Partial<SttRow>) => setSttRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...update } : r)));
  const updateVoice = (id: TierId, update: Partial<VoiceRow>) => setVoiceRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...update } : r)));

  const runStt = async () => {
    if (!audio) return;
    for (const tier of tiersFor("stt")) {
      if (tier.id === "webspeech") {
        updateStt(tier.id, webSpeechText != null
          ? { text: webSpeechText, wer: wordErrorRate(reference, webSpeechText), error: undefined }
          : { error: "Runs live while you speak: tick “include browser recognition” and record a sample." });
        continue;
      }
      updateStt(tier.id, { running: true, error: undefined, text: undefined, wer: undefined });
      const engine = createSttEngine(tier.id, caps?.webgpu ?? false);
      try {
        const loadStart = performance.now();
        await engine.load(() => undefined);
        const loadSeconds = secondsSince(loadStart);
        const runStart = performance.now();
        const text = await engine.transcribe(audio);
        updateStt(tier.id, { running: false, loadSeconds, transcribeSeconds: secondsSince(runStart), text, wer: wordErrorRate(reference, text) });
      } catch (err) {
        updateStt(tier.id, { running: false, error: err instanceof Error ? err.message : String(err) });
      } finally {
        engine.dispose();
      }
    }
  };

  const runVoices = async () => {
    const context = new AudioContext();
    for (const tier of tiersFor("voice")) {
      if (tier.id === "captions") {
        updateVoice(tier.id, { loadSeconds: 0, firstAudioSeconds: 0 });
        continue;
      }
      updateVoice(tier.id, { running: true, error: undefined });
      const engine = createVoiceEngine(tier.id, caps?.webgpu ?? false);
      try {
        const loadStart = performance.now();
        await engine.load(() => undefined);
        const loadSeconds = secondsSince(loadStart);
        if (tier.id === "browser-voice") {
          updateVoice(tier.id, {
            running: false,
            loadSeconds,
            firstAudioSeconds: 0,
            play: () => window.speechSynthesis.speak(new SpeechSynthesisUtterance(VOICE_SENTENCE)),
          });
          continue;
        }
        const genStart = performance.now();
        const output = await engine.synthesize(VOICE_SENTENCE);
        const firstAudioSeconds = secondsSince(genStart);
        let buffer: AudioBuffer | null = null;
        if (output instanceof Blob) buffer = await context.decodeAudioData(await output.arrayBuffer());
        else if (output) {
          buffer = context.createBuffer(1, output.samples.length, output.sampleRate);
          buffer.copyToChannel(new Float32Array(output.samples), 0);
        }
        updateVoice(tier.id, {
          running: false,
          loadSeconds,
          firstAudioSeconds,
          play: buffer
            ? () => {
                const source = context.createBufferSource();
                source.buffer = buffer;
                source.connect(context.destination);
                source.start();
              }
            : undefined,
        });
      } catch (err) {
        updateVoice(tier.id, { running: false, error: err instanceof Error ? err.message : String(err) });
      }
    }
  };

  const report = {
    device: caps,
    userAgent: navigator.userAgent,
    audioSeconds: audio ? Math.round((audio.length / STT_SAMPLE_RATE) * 10) / 10 : null,
    speechToText: sttRows.map(({ running: _r, ...row }) => row),
    voice: voiceRows.map(({ running: _r, play: _p, ...row }) => row),
  };

  return (
    <AdminLayout title="Speech lab">
      <div className="page-heading">
        <h1>Test the speaking models on this device.</h1>
        <p>
          Each job of the live examiner has a main model and three fallbacks. Run them here to compare speed and accuracy, and switch
          tiers off on this browser to check that the fallbacks take over.
        </p>
      </div>
      {error && (
        <p className="form-banner form-banner-error" role="alert">
          {error}
        </p>
      )}

      <section className="dashboard-card admin-card">
        <h2>This device</h2>
        {caps ? (
          <p className="admin-muted">
            WebGPU {caps.webgpu ? "yes" : "no"} · memory {caps.memoryGb ?? "unknown"} GB · {caps.mobile ? "mobile" : "desktop"} · browser
            voice {caps.speechSynthesis ? "yes" : "no"} · browser recognition {caps.speechRecognition ? "yes" : "no"}
          </p>
        ) : (
          <Loader2 size={16} className="spin" aria-hidden="true" />
        )}
      </section>

      <section className="dashboard-card admin-card">
        <h2>Force fallbacks on this browser</h2>
        <p className="admin-muted">
          Switched-off tiers are skipped by the live examiner in this browser only, so you can test every fallback. The last tier of
          each job (browser recognition, captions, the button and the examiner script) always stays on.
        </p>
        {(["stt", "voice", "turns", "followups"] as JobId[]).map((job) => (
          <fieldset key={job} className="speech-lab-tiers">
            <legend>{JOB_LABEL[job]}</legend>
            {tiersFor(job).map((tier) => (
              <label key={tier.id}>
                <input
                  type="checkbox"
                  disabled={!SWITCHABLE.includes(tier.id)}
                  checked={!disabled.has(tier.id)}
                  onChange={() => toggleTier(tier.id)}
                />
                {tier.rank}. {tier.name}
              </label>
            ))}
          </fieldset>
        ))}
      </section>

      <section className="dashboard-card admin-card">
        <h2>Speech recognition</h2>
        <label className="admin-field">
          <span>What the sample says (reference for the word error rate)</span>
          <textarea className="form-input" rows={2} value={reference} onChange={(e) => setReference(e.target.value)} />
        </label>
        <label className="speech-lab-check">
          <input type="checkbox" checked={includeCloud} onChange={(e) => setIncludeCloud(e.target.checked)} /> Include browser recognition
          while recording (sends the audio to Google/Microsoft)
        </label>
        <div className="admin-actions">
          {recording ? (
            <button type="button" className="button button-primary" onClick={() => stopRecordingRef.current?.()}>
              <Square size={15} aria-hidden="true" /> Stop recording
            </button>
          ) : (
            <button type="button" className="button button-secondary" onClick={() => void recordSample()}>
              <Mic size={15} aria-hidden="true" /> Record a sample (read the reference aloud)
            </button>
          )}
          <label className="button button-secondary">
            Use an audio file
            <input type="file" accept="audio/*" hidden onChange={(e) => e.target.files?.[0] && void loadFile(e.target.files[0])} />
          </label>
          <button type="button" className="button button-primary" disabled={!audio || recording} onClick={() => void runStt()}>
            Run all four
          </button>
        </div>
        {audio && <p className="admin-muted">Sample ready: {(audio.length / STT_SAMPLE_RATE).toFixed(1)} s.</p>}
        <table className="mock-results-table speech-lab-table">
          <thead>
            <tr>
              <th scope="col">Tier</th>
              <th scope="col">Load</th>
              <th scope="col">Transcribe</th>
              <th scope="col">Word error rate</th>
              <th scope="col">Transcript</th>
            </tr>
          </thead>
          <tbody>
            {sttRows.map((row) => (
              <tr key={row.id}>
                <th scope="row">
                  {tierById(row.id).rank}. {tierById(row.id).name}
                </th>
                <td>{row.running ? <Loader2 size={14} className="spin" aria-label="Running" /> : row.loadSeconds != null ? `${row.loadSeconds} s` : "-"}</td>
                <td>{row.transcribeSeconds != null ? `${row.transcribeSeconds} s` : "-"}</td>
                <td>{row.wer != null ? `${Math.round(row.wer * 100)}%` : "-"}</td>
                <td>{row.error ? <span className="admin-warning-text">{row.error}</span> : row.text ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="dashboard-card admin-card">
        <h2>Examiner voice</h2>
        <p className="admin-muted">Test sentence: &ldquo;{VOICE_SENTENCE}&rdquo;</p>
        <button type="button" className="button button-primary" onClick={() => void runVoices()}>
          Run all four
        </button>
        <table className="mock-results-table speech-lab-table">
          <thead>
            <tr>
              <th scope="col">Tier</th>
              <th scope="col">Load</th>
              <th scope="col">Time to audio</th>
              <th scope="col">Listen</th>
            </tr>
          </thead>
          <tbody>
            {voiceRows.map((row) => (
              <tr key={row.id}>
                <th scope="row">
                  {tierById(row.id).rank}. {tierById(row.id).name}
                </th>
                <td>{row.running ? <Loader2 size={14} className="spin" aria-label="Running" /> : row.loadSeconds != null ? `${row.loadSeconds} s` : "-"}</td>
                <td>{row.firstAudioSeconds != null ? `${row.firstAudioSeconds} s` : "-"}</td>
                <td>
                  {row.error ? (
                    <span className="admin-warning-text">{row.error}</span>
                  ) : row.play ? (
                    <button type="button" className="button button-secondary button-sm" onClick={row.play}>
                      <Play size={14} aria-hidden="true" /> Play
                    </button>
                  ) : row.id === "captions" ? (
                    "Text on screen"
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="admin-muted">
          The follow-up language models (Qwen2.5, SmolLM2, Llama 3.2) are 0.9&ndash;1.8 GB each and need WebGPU; they load from the
          student&rsquo;s &ldquo;Smarter follow-up questions&rdquo; option and fall back to the examiner script.
        </p>
      </section>

      <section className="dashboard-card admin-card">
        <h2>Report</h2>
        <button type="button" className="button button-secondary" onClick={() => void navigator.clipboard.writeText(JSON.stringify(report, null, 2))}>
          <Copy size={15} aria-hidden="true" /> Copy results as JSON
        </button>
      </section>
    </AdminLayout>
  );
}
