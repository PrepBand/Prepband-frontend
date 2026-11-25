/**
 * Microphone capture for the live examiner. One mic stream is shared by
 * turn-taking (VAD), speech recognition and the local replay recording.
 * Audio never leaves the browser (FR-LIVE-07): everything here works on
 * in-memory buffers.
 */

export const STT_SAMPLE_RATE = 16000;

export async function openMicrophone(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
  });
}

export function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

/** Averages samples down to the target rate (good enough for speech models). */
export function resample(input: Float32Array, fromRate: number, toRate = STT_SAMPLE_RATE): Float32Array {
  if (fromRate === toRate) return input.slice();
  const ratio = fromRate / toRate;
  const length = Math.floor(input.length / ratio);
  const output = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end; j += 1) sum += input[j];
    output[i] = end > start ? sum / (end - start) : input[start] ?? 0;
  }
  return output;
}

export function rms(frame: Float32Array): number {
  if (frame.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < frame.length; i += 1) sum += frame[i] * frame[i];
  return Math.sqrt(sum / frame.length);
}

/** 16-bit PCM mono WAV, for local replay and for uploading generated examiner clips. */
export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

export function concatFloat32(chunks: Float32Array[]): Float32Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

/**
 * Continuously reads the mic, reports a level for each frame, and keeps
 * the frames while a turn is being recorded. A ScriptProcessorNode is
 * used because it works in every browser that has getUserMedia; frames
 * are small (4096 samples, ~85 ms at 48 kHz).
 */
export class MicCapture {
  readonly context: AudioContext;
  readonly sampleRate: number;
  private source: MediaStreamAudioSourceNode;
  private processor: ScriptProcessorNode;
  private sink: GainNode;
  private recording: Float32Array[] | null = null;
  private listeners = new Set<(level: number, frame: Float32Array) => void>();

  constructor(readonly stream: MediaStream) {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.context = new AudioCtx();
    this.sampleRate = this.context.sampleRate;
    this.source = this.context.createMediaStreamSource(stream);
    this.processor = this.context.createScriptProcessor(4096, 1, 1);
    // A muted sink keeps the processor running without playing the mic back.
    this.sink = this.context.createGain();
    this.sink.gain.value = 0;
    this.processor.onaudioprocess = (event) => {
      const frame = new Float32Array(event.inputBuffer.getChannelData(0));
      if (this.recording) this.recording.push(frame);
      const level = rms(frame);
      this.listeners.forEach((listener) => listener(level, frame));
    };
    this.source.connect(this.processor);
    this.processor.connect(this.sink);
    this.sink.connect(this.context.destination);
  }

  async resume(): Promise<void> {
    if (this.context.state === "suspended") await this.context.resume();
  }

  onFrame(listener: (level: number, frame: Float32Array) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  startRecording(): void {
    this.recording = [];
  }

  /** Stops recording and returns the turn's audio at the mic's own sample rate. */
  stopRecording(): Float32Array {
    const chunks = this.recording ?? [];
    this.recording = null;
    return concatFloat32(chunks);
  }

  close(): void {
    this.processor.disconnect();
    this.source.disconnect();
    this.sink.disconnect();
    this.listeners.clear();
    void this.context.close();
  }
}
