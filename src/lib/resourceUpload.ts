import { api, ApiError } from "./apiClient";

/**
 * Uploads a resource cover or file straight from the browser to the private
 * R2 bucket:
 *   1. the API checks type and size and returns a 10-minute signed PUT URL
 *      bound to exactly that type and size;
 *   2. the browser PUTs the bytes to R2 (they never pass through our server);
 *   3. the caller saves the returned key on the resource, and the API then
 *      checks the stored file really is that type.
 *
 * Covers are first resized in the browser (longest side 1200 px, WebP), so
 * students download ~100 KB instead of a multi-megabyte photo.
 */

export type UploadPurpose = "cover" | "file";
export type Uploaded = { key: string; contentType: string; fileName: string; size: number };

type UploadTicket = { key: string; upload_url: string; headers: Record<string, string>; expires_in: number };

const COVER_MAX_SIDE = 1200;

export async function shrinkCover(file: File): Promise<Blob> {
  if (typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, COVER_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
    // Some browsers can't encode WebP and silently return PNG; keep whichever is smaller.
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file; // not decodable here: let the server's type check decide
  }
}

export async function uploadResourceFile(purpose: UploadPurpose, file: File): Promise<Uploaded> {
  const body: Blob = purpose === "cover" ? await shrinkCover(file) : file;
  const contentType = body.type || file.type;
  const ticket = await api.post<UploadTicket>("/admin/resources/uploads", {
    purpose,
    file_name: file.name,
    content_type: contentType,
    size_bytes: body.size,
  });

  let response: Response;
  try {
    // Content-Length is set by the browser from the body; R2 checks it
    // against the size the URL was signed for.
    response = await fetch(ticket.upload_url, { method: "PUT", headers: ticket.headers, body });
  } catch {
    throw new ApiError(0, "upload_failed", "The upload couldn't reach file storage. Check your connection and try again.");
  }
  if (!response.ok) {
    throw new ApiError(response.status, "upload_failed", "File storage refused the upload. Try again, or try a smaller file.");
  }
  return { key: ticket.key, contentType, fileName: file.name, size: body.size };
}
