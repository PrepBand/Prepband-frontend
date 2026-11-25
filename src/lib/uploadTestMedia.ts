import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

export type UploadedMedia = {
  storage_key: string;
  public_url: string;
  content_type: string;
  size_bytes: number;
  type: "audio" | "image";
};

export const AUDIO_ACCEPT = "audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/wave,audio/ogg,audio/webm,audio/mp4,audio/x-m4a,audio/aac";
const MAX_AUDIO_BYTES = 40 * 1024 * 1024;

/** Client-side mirror of the Edge Function's checks, so a bad file fails
 * before it's sent. The function re-checks everything. */
export function checkAudioFile(file: File): string | null {
  if (!file.type.startsWith("audio/")) return "Choose an audio file (MP3, WAV, OGG, WebM, M4A or AAC).";
  if (file.size > MAX_AUDIO_BYTES) return "Audio must be 40MB or smaller.";
  return null;
}

export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function checkImageFile(file: File): string | null {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return "Choose a JPEG, PNG or WebP image.";
  if (file.size > MAX_IMAGE_BYTES) return "Images must be 5MB or smaller.";
  return null;
}

/** Reads an audio file's length in the browser, so the admin doesn't have
 * to type it. Resolves to null if the browser can't decode it. */
export function readAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(audio.duration) ? Math.round(audio.duration) : null);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    audio.src = url;
  });
}

/**
 * Stores a file in R2 through the admin-only `upload-test-media` Edge
 * Function. Returns where it landed; the caller records that on a
 * media_assets row through the backend API.
 */
export async function uploadTestMedia(file: File, testVersionId: string): Promise<UploadedMedia> {
  const form = new FormData();
  form.append("file", file);
  form.append("test_version_id", testVersionId);

  const { data, error } = await supabase.functions.invoke<UploadedMedia>("upload-test-media", { body: form });
  if (error) {
    let message = error.message;
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => null);
      if (body?.error) message = body.error;
    }
    throw new Error(message);
  }
  if (!data) throw new Error("Upload returned no data.");
  return data;
}

/**
 * Phase 5: stores a voice clip for one of the live examiner's fixed lines
 * (examiner_phrases). Same admin-only Edge Function, `purpose=examiner_phrase`,
 * so no test version is involved. The caller saves the returned URL on the
 * phrase through the backend.
 */
export async function uploadExaminerPhraseAudio(file: File): Promise<UploadedMedia> {
  const form = new FormData();
  form.append("file", file);
  form.append("purpose", "examiner_phrase");

  const { data, error } = await supabase.functions.invoke<UploadedMedia>("upload-test-media", { body: form });
  if (error) {
    let message = error.message;
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => null);
      if (body?.error) message = body.error;
    }
    throw new Error(message);
  }
  if (!data) throw new Error("Upload returned no data.");
  return data;
}
