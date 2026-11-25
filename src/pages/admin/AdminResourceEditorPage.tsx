import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Archive, CheckCircle2, FileUp, ImageUp, Loader2, Send, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { api, describeError } from "../../lib/apiClient";
import {
  KIND_LABEL,
  MODULE_LABEL,
  TRACK_LABEL,
  formatBytes,
  type AdminResource,
  type AdminResourceCategory,
  type ResourceKind,
  type ResourceLevel,
  type ResourceModule,
  type ResourceTrack,
} from "../../lib/resourceTypes";
import { uploadResourceFile } from "../../lib/resourceUpload";

const FILE_ACCEPT: Partial<Record<ResourceKind, string>> = {
  pdf: "application/pdf",
  document: ".docx,.pptx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation",
  image: "image/jpeg,image/png,image/webp",
};

type Form = {
  category_id: string;
  title: string;
  description: string;
  kind: ResourceKind;
  module: ResourceModule;
  track: ResourceTrack;
  level: "" | ResourceLevel;
  tags: string;
  cover_alt: string;
  external_url: string;
  source: string;
  licence: string;
};

const EMPTY: Form = {
  category_id: "",
  title: "",
  description: "",
  kind: "pdf",
  module: "general",
  track: "both",
  level: "",
  tags: "",
  cover_alt: "",
  external_url: "",
  source: "",
  licence: "",
};

function toForm(r: AdminResource): Form {
  return {
    category_id: r.category_id,
    title: r.title,
    description: r.description ?? "",
    kind: r.kind,
    module: r.module,
    track: r.track,
    level: r.level ?? "",
    tags: r.tags.join(", "),
    cover_alt: r.cover_alt ?? "",
    external_url: r.external_url ?? "",
    source: r.source ?? "",
    licence: r.licence ?? "",
  };
}

/** Create or edit one resource: details, cover, file or link, licence, and
 * publishing. Uploads go straight to private storage. */
export function AdminResourceEditorPage() {
  const { resourceId } = useParams();
  const isNew = !resourceId || resourceId === "new";
  const navigate = useNavigate();
  const [categories, setCategories] = useState<AdminResourceCategory[]>([]);
  const [resource, setResource] = useState<AdminResource | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [pending, setPending] = useState<{ cover?: { key: string }; file?: { key: string; contentType: string; fileName: string; size: number } }>({});
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<"" | "saving" | "cover" | "file" | "status" | "delete">("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const coverInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .get<AdminResourceCategory[]>("/admin/resource-categories")
      .then((list) => {
        setCategories(list);
        setForm((prev) => (prev.category_id || !list.length ? prev : { ...prev, category_id: list[0].id }));
      })
      .catch((err) => setError(describeError(err, "Failed to load categories.")));
  }, []);

  useEffect(() => {
    if (isNew) return;
    api
      .get<AdminResource>(`/admin/resources/${resourceId}`)
      .then((r) => {
        setResource(r);
        setForm(toForm(r));
        setCoverPreview(r.cover_url);
      })
      .catch((err) => setError(describeError(err, "Failed to load this resource.")));
  }, [isNew, resourceId]);

  useEffect(() => () => {
    if (coverPreview?.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
  }, [coverPreview]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  const isLink = form.kind === "link" || form.kind === "video";

  const upload = async (purpose: "cover" | "file", file: File | undefined) => {
    if (!file) return;
    setBusy(purpose);
    setError("");
    setNotice("");
    try {
      const uploaded = await uploadResourceFile(purpose, file);
      if (purpose === "cover") {
        setPending((prev) => ({ ...prev, cover: { key: uploaded.key } }));
        setCoverPreview(URL.createObjectURL(file));
      } else {
        setPending((prev) => ({ ...prev, file: uploaded }));
      }
      setNotice(`${purpose === "cover" ? "Cover" : "File"} uploaded. Save to attach it.`);
    } catch (err) {
      setError(describeError(err, "The upload failed."));
    } finally {
      setBusy("");
    }
  };

  const payload = () => ({
    category_id: form.category_id,
    title: form.title.trim(),
    description: form.description.trim() || null,
    kind: form.kind,
    module: form.module,
    track: form.track,
    level: form.level || null,
    tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    cover_alt: form.cover_alt.trim() || null,
    external_url: isLink ? form.external_url.trim() || null : null,
    source: form.source.trim() || null,
    licence: form.licence.trim() || null,
    ...(pending.cover ? { cover_key: pending.cover.key } : {}),
    ...(pending.file && !isLink
      ? { file_key: pending.file.key, file_name: pending.file.fileName, file_content_type: pending.file.contentType }
      : {}),
  });

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (form.title.trim().length < 3) {
      setError("Give the resource a title of at least 3 characters.");
      return;
    }
    if (!form.category_id) {
      setError("Choose a category.");
      return;
    }
    setBusy("saving");
    setError("");
    setNotice("");
    try {
      const saved = isNew
        ? await api.post<AdminResource>("/admin/resources", payload())
        : await api.patch<AdminResource>(`/admin/resources/${resourceId}`, payload());
      setPending({});
      setResource(saved);
      setForm(toForm(saved));
      setNotice("Saved.");
      if (isNew) navigate(`/admin/resources/${saved.id}`, { replace: true });
    } catch (err) {
      setError(describeError(err, "Couldn't save."));
    } finally {
      setBusy("");
    }
  };

  const setStatus = async (status: "draft" | "published" | "archived") => {
    if (!resource) return;
    setBusy("status");
    setError("");
    setNotice("");
    try {
      const updated = await api.post<AdminResource>(`/admin/resources/${resource.id}/status`, { status });
      setResource(updated);
      setNotice(status === "published" ? "Published: students can see it now." : status === "archived" ? "Archived: hidden from students." : "Moved back to draft.");
    } catch (err) {
      setError(describeError(err, "Couldn't change the status."));
    } finally {
      setBusy("");
    }
  };

  const remove = async () => {
    if (!resource || !window.confirm(`Delete "${resource.title}" and its files? This can't be undone.`)) return;
    setBusy("delete");
    try {
      await api.delete(`/admin/resources/${resource.id}`);
      navigate("/admin/resources", { replace: true });
    } catch (err) {
      setError(describeError(err, "Couldn't delete."));
      setBusy("");
    }
  };

  const unsaved = Boolean(pending.cover || pending.file);
  const currentFile = pending.file
    ? `${pending.file.fileName} (${formatBytes(pending.file.size)}, not saved yet)`
    : resource?.file_name
      ? `${resource.file_name} (${formatBytes(resource.size_bytes)})`
      : null;

  return (
    <AdminLayout title={isNew ? "New resource" : "Edit resource"}>
      <Link className="admin-back" to="/admin/resources">
        <ArrowLeft size={14} aria-hidden="true" /> All resources
      </Link>
      <div className="page-heading-row">
        <div className="page-heading">
          <h1>{isNew ? "New resource." : resource?.title ?? "Loading…"}</h1>
          {resource && (
            <p>
              Status: <strong>{resource.status}</strong> · opened {resource.open_count} time{resource.open_count === 1 ? "" : "s"}
            </p>
          )}
        </div>
        {resource && (
          <div className="admin-actions">
            {resource.status !== "published" && (
              <button type="button" className="button button-primary" onClick={() => void setStatus("published")} disabled={!!busy || unsaved || resource.problems.length > 0}>
                <Send size={15} aria-hidden="true" /> Publish
              </button>
            )}
            {resource.status === "published" && (
              <button type="button" className="button button-secondary" onClick={() => void setStatus("archived")} disabled={!!busy}>
                <Archive size={15} aria-hidden="true" /> Archive
              </button>
            )}
            {resource.status === "archived" && (
              <button type="button" className="button button-secondary" onClick={() => void setStatus("draft")} disabled={!!busy}>
                Back to draft
              </button>
            )}
          </div>
        )}
      </div>

      <div aria-live="polite">
        {error && <p className="form-banner form-banner-error" role="alert">{error}</p>}
        {notice && <p className="form-banner form-banner-success">{notice}</p>}
      </div>

      {resource && resource.status !== "published" && resource.problems.length > 0 && (
        <div className="dashboard-card admin-card admin-problems">
          <h2>Before publishing</h2>
          <ul>
            {resource.problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}
      {resource && resource.status !== "published" && resource.problems.length === 0 && !unsaved && (
        <p className="admin-muted">
          <CheckCircle2 size={14} aria-hidden="true" /> Ready to publish.
        </p>
      )}

      <form className="dashboard-card admin-card admin-form" onSubmit={save} aria-label="Resource details">
        <div className="admin-form-grid">
          <label className="admin-field admin-field-wide">
            <span>Title</span>
            <input className="form-input" value={form.title} maxLength={140} onChange={(e) => set("title", e.target.value)} required />
          </label>
          <label className="admin-field admin-field-wide">
            <span>Short description</span>
            <textarea className="form-input" rows={3} value={form.description} maxLength={1000} onChange={(e) => set("description", e.target.value)} />
          </label>
          <label className="admin-field">
            <span>Category</span>
            <select className="form-input" value={form.category_id} onChange={(e) => set("category_id", e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.is_visible ? "" : " (hidden)"}</option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>Type</span>
            <select className="form-input" value={form.kind} onChange={(e) => set("kind", e.target.value as ResourceKind)} disabled={!isNew && resource?.status === "published"}>
              {(Object.keys(KIND_LABEL) as ResourceKind[]).map((k) => (
                <option key={k} value={k}>{KIND_LABEL[k]}</option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>Skill</span>
            <select className="form-input" value={form.module} onChange={(e) => set("module", e.target.value as ResourceModule)}>
              {(Object.keys(MODULE_LABEL) as ResourceModule[]).map((m) => (
                <option key={m} value={m}>{MODULE_LABEL[m]}</option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>Track</span>
            <select className="form-input" value={form.track} onChange={(e) => set("track", e.target.value as ResourceTrack)}>
              {(Object.keys(TRACK_LABEL) as ResourceTrack[]).map((t) => (
                <option key={t} value={t}>{TRACK_LABEL[t]}</option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>Level (optional)</span>
            <select className="form-input" value={form.level} onChange={(e) => set("level", e.target.value as "" | ResourceLevel)}>
              <option value="">Any level</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>
          <label className="admin-field admin-field-wide">
            <span>Tags (comma separated, up to 12)</span>
            <input className="form-input" value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="task 2, opinion essay" />
          </label>
        </div>

        <fieldset className="admin-fieldset">
          <legend>Cover image</legend>
          <div className="admin-resource-cover">
            {coverPreview ? (
              <img src={coverPreview} alt={form.cover_alt || "Cover preview"} />
            ) : (
              <span className="admin-resource-cover-empty">No cover yet</span>
            )}
            <div className="admin-resource-cover-controls">
              <input
                ref={coverInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                id="cover-input"
                onChange={(e) => void upload("cover", e.target.files?.[0])}
              />
              <button type="button" className="button button-secondary button-sm" onClick={() => coverInput.current?.click()} disabled={!!busy}>
                {busy === "cover" ? <Loader2 size={14} className="spin" aria-hidden="true" /> : <ImageUp size={14} aria-hidden="true" />}{" "}
                {coverPreview ? "Replace cover" : "Upload cover"}
              </button>
              <span className="admin-muted">JPEG, PNG or WebP, up to 5 MB. Resized to 1200 px before upload.</span>
              <label className="admin-field">
                <span>Alt text (what the image shows)</span>
                <input className="form-input" value={form.cover_alt} maxLength={200} onChange={(e) => set("cover_alt", e.target.value)} />
              </label>
            </div>
          </div>
        </fieldset>

        <fieldset className="admin-fieldset">
          <legend>{isLink ? "Link" : "File"}</legend>
          {isLink ? (
            <label className="admin-field admin-field-wide">
              <span>{form.kind === "video" ? "Video address (for example a YouTube link)" : "Web address"}</span>
              <input className="form-input" type="url" inputMode="url" value={form.external_url} placeholder="https://" onChange={(e) => set("external_url", e.target.value)} />
            </label>
          ) : (
            <div className="admin-resource-file">
              <input
                ref={fileInput}
                type="file"
                accept={FILE_ACCEPT[form.kind]}
                className="sr-only"
                id="file-input"
                onChange={(e) => void upload("file", e.target.files?.[0])}
              />
              <button type="button" className="button button-secondary button-sm" onClick={() => fileInput.current?.click()} disabled={!!busy}>
                {busy === "file" ? <Loader2 size={14} className="spin" aria-hidden="true" /> : <FileUp size={14} aria-hidden="true" />}{" "}
                {currentFile ? "Replace file" : "Upload file"}
              </button>
              <span className="admin-muted">
                {currentFile ?? "No file yet."} {form.kind === "pdf" ? "PDF" : form.kind === "document" ? "Word (.docx) or PowerPoint (.pptx)" : "JPEG, PNG or WebP"}, up to 25 MB.
              </span>
            </div>
          )}
        </fieldset>

        <fieldset className="admin-fieldset">
          <legend>Source and licence</legend>
          <div className="admin-form-grid">
            <label className="admin-field">
              <span>Licence</span>
              <input className="form-input" value={form.licence} maxLength={120} onChange={(e) => set("licence", e.target.value)} placeholder="Original, CC BY 4.0, Linked only…" />
            </label>
            <label className="admin-field admin-field-wide">
              <span>Source (who made it, where it came from)</span>
              <input className="form-input" value={form.source} maxLength={300} onChange={(e) => set("source", e.target.value)} />
            </label>
          </div>
          <p className="admin-muted">Only original or properly licensed material. Linking to a page is fine; copying someone else&rsquo;s file isn&rsquo;t.</p>
        </fieldset>

        <div className="admin-actions">
          <button type="submit" className="button button-primary" disabled={!!busy}>
            {busy === "saving" && <Loader2 size={15} className="spin" aria-hidden="true" />} {isNew ? "Create draft" : unsaved ? "Save changes (uploads pending)" : "Save changes"}
          </button>
          {resource && (
            <button type="button" className="button button-secondary admin-danger" onClick={() => void remove()} disabled={!!busy}>
              <Trash2 size={15} aria-hidden="true" /> Delete
            </button>
          )}
        </div>
      </form>
    </AdminLayout>
  );
}
