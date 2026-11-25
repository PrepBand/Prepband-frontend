/** Resource library types (backend: app/api/v1/resources.py and
 * app/api/v1/admin_resources.py). */

export type ResourceKind = "link" | "video" | "pdf" | "document" | "image";
export type ResourceModule = "listening" | "reading" | "writing" | "speaking" | "general";
export type ResourceTrack = "academic" | "general" | "both";
export type ResourceLevel = "beginner" | "intermediate" | "advanced";
export type ResourceStatus = "draft" | "published" | "archived";

export const KIND_LABEL: Record<ResourceKind, string> = {
  link: "Link",
  video: "Video",
  pdf: "PDF",
  document: "Document",
  image: "Image",
};

export const MODULE_LABEL: Record<ResourceModule, string> = {
  listening: "Listening",
  reading: "Reading",
  writing: "Writing",
  speaking: "Speaking",
  general: "All skills",
};

export const TRACK_LABEL: Record<ResourceTrack, string> = {
  academic: "Academic",
  general: "General Training",
  both: "Both tracks",
};

/** Student view. */
export type ResourceCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  resource_count: number;
};

export type ResourceCard = {
  id: string;
  title: string;
  description: string | null;
  kind: ResourceKind;
  module: ResourceModule;
  track: ResourceTrack;
  level: ResourceLevel | null;
  tags: string[];
  category_slug: string;
  category_name: string;
  cover_url: string | null;
  cover_alt: string | null;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  is_external: boolean;
  published_at: string | null;
};

export type ResourcePage = { items: ResourceCard[]; total: number; query: string | null };

export type OpenResource = { url: string; expires_in: number | null };

/** Admin view. */
export type AdminResourceCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
  is_visible: boolean;
  resource_count: number;
  published_count: number;
};

export type AdminResource = {
  id: string;
  category_id: string;
  category_name: string;
  title: string;
  description: string | null;
  kind: ResourceKind;
  module: ResourceModule;
  track: ResourceTrack;
  level: ResourceLevel | null;
  tags: string[];
  cover_key: string | null;
  cover_url: string | null;
  cover_alt: string | null;
  file_key: string | null;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  external_url: string | null;
  source: string | null;
  licence: string | null;
  status: ResourceStatus;
  display_order: number;
  open_count: number;
  published_at: string | null;
  updated_at: string;
  problems: string[];
};

export type ResourceStorage = {
  configured: boolean;
  cover_max_bytes: number;
  file_max_bytes: number;
  cover_types: string[];
  file_types: string[];
};

export function formatBytes(bytes: number | null): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
