import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Loader2, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { api, describeError } from "../../lib/apiClient";
import {
  KIND_LABEL,
  MODULE_LABEL,
  type AdminResource,
  type AdminResourceCategory,
  type ResourceStatus,
  type ResourceStorage,
} from "../../lib/resourceTypes";

const STATUS_PILL: Record<ResourceStatus, string> = {
  draft: "admin-pill",
  published: "admin-pill admin-pill-success",
  archived: "admin-pill admin-pill-danger",
};

/** The resource library: every resource with its status, plus the
 * categories students browse by. */
export function AdminResourcesPage() {
  const [resources, setResources] = useState<AdminResource[] | null>(null);
  const [categories, setCategories] = useState<AdminResourceCategory[] | null>(null);
  const [storage, setStorage] = useState<ResourceStorage | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"" | ResourceStatus>("");
  const [categoryId, setCategoryId] = useState("");
  const [query, setQuery] = useState("");

  const loadCategories = useCallback(() => {
    api
      .get<AdminResourceCategory[]>("/admin/resource-categories")
      .then(setCategories)
      .catch((err) => setError(describeError(err, "Failed to load categories.")));
  }, []);

  const loadResources = useCallback(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (categoryId) params.set("category_id", categoryId);
    api
      .get<AdminResource[]>(`/admin/resources${params.size ? `?${params}` : ""}`)
      .then(setResources)
      .catch((err) => setError(describeError(err, "Failed to load resources.")));
  }, [status, categoryId]);

  useEffect(loadCategories, [loadCategories]);
  useEffect(loadResources, [loadResources]);
  useEffect(() => {
    api.get<ResourceStorage>("/admin/resources/storage").then(setStorage).catch(() => setStorage(null));
  }, []);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!resources || !needle) return resources ?? [];
    return resources.filter((r) => [r.title, r.description ?? "", r.tags.join(" ")].some((v) => v.toLowerCase().includes(needle)));
  }, [resources, query]);

  return (
    <AdminLayout title="Resources">
      <div className="page-heading-row">
        <div className="page-heading">
          <h1>Resources.</h1>
          <p>Guides, sample answers, worksheets and links for students. Files are private: only signed-in students can open them.</p>
        </div>
        <Link className="button button-primary" to="/admin/resources/new">
          <Plus size={16} aria-hidden="true" /> New resource
        </Link>
      </div>

      {storage && !storage.configured && (
        <p className="form-banner form-banner-error form-banner-text" role="status">
          File storage isn&rsquo;t configured on the server yet, so covers and files can&rsquo;t be uploaded. Set the R2_* variables
          on Render (see the runbook).
        </p>
      )}
      {error && <p className="form-banner form-banner-error" role="alert">{error}</p>}

      <section aria-labelledby="resources-heading">
        <h2 id="resources-heading" className="admin-section-title">All resources</h2>
        <div className="admin-toolbar">
          <input
            className="form-input admin-search"
            type="search"
            placeholder="Search titles, descriptions and tags"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search resources"
          />
          <select className="form-input" value={status} onChange={(e) => setStatus(e.target.value as "" | ResourceStatus)} aria-label="Filter by status">
            <option value="">Any status</option>
            <option value="draft">Drafts</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          <select className="form-input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Filter by category">
            <option value="">Any category</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {resources && <span className="admin-muted">{shown.length} of {resources.length}</span>}
        </div>

        {!resources && !error && (
          <p className="admin-muted">
            <Loader2 size={16} className="spin" aria-hidden="true" /> Loading…
          </p>
        )}

        {resources && (
          <div className="dashboard-card admin-card admin-table-wrap">
            <table className="admin-table admin-resource-table">
              <thead>
                <tr>
                  <th scope="col"><span className="sr-only">Cover</span></th>
                  <th scope="col">Title</th>
                  <th scope="col">Category</th>
                  <th scope="col">Type</th>
                  <th scope="col">Skill</th>
                  <th scope="col">Status</th>
                  <th scope="col">Opens</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.cover_url ? (
                        <img className="admin-resource-thumb" src={r.cover_url} alt="" loading="lazy" />
                      ) : (
                        <span className="admin-resource-thumb admin-resource-thumb-empty" aria-hidden="true" />
                      )}
                    </td>
                    <td>
                      <Link to={`/admin/resources/${r.id}`}>{r.title}</Link>
                      {r.status === "draft" && r.problems.length > 0 && (
                        <span className="admin-muted"> · {r.problems.length} to do before publishing</span>
                      )}
                    </td>
                    <td>{r.category_name}</td>
                    <td>{KIND_LABEL[r.kind]}</td>
                    <td>{MODULE_LABEL[r.module]}</td>
                    <td><span className={STATUS_PILL[r.status]}>{r.status}</span></td>
                    <td>{r.open_count}</td>
                  </tr>
                ))}
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={7} className="admin-muted">
                      {resources.length === 0 ? "No resources yet. Add the first one." : "No resources match."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <CategoryManager categories={categories} onChange={() => { loadCategories(); loadResources(); }} />
    </AdminLayout>
  );
}

function CategoryManager({ categories, onChange }: { categories: AdminResourceCategory[] | null; onChange: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const run = async (action: () => Promise<unknown>, fallback: string) => {
    setBusy(true);
    setError("");
    try {
      await action();
      onChange();
      return true;
    } catch (err) {
      setError(describeError(err, fallback));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) {
      setError("Give the category a name of at least 2 characters.");
      return;
    }
    const next = (categories?.reduce((max, c) => Math.max(max, c.display_order), 0) ?? 0) + 10;
    const ok = await run(
      () => api.post("/admin/resource-categories", { name: name.trim(), description: description.trim() || null, display_order: next }),
      "Couldn't add the category.",
    );
    if (ok) {
      setName("");
      setDescription("");
    }
  };

  /** Swaps two neighbours, then renumbers the whole list 10, 20, 30...
   * so ties left by older edits can't make the order ambiguous. */
  const move = (index: number, direction: -1 | 1) => {
    if (!categories || !categories[index + direction]) return;
    const reordered = [...categories];
    [reordered[index], reordered[index + direction]] = [reordered[index + direction], reordered[index]];
    void run(async () => {
      for (const [position, category] of reordered.entries()) {
        const wanted = (position + 1) * 10;
        if (category.display_order !== wanted) {
          await api.patch(`/admin/resource-categories/${category.id}`, { display_order: wanted });
        }
      }
    }, "Couldn't reorder.");
  };

  return (
    <section className="admin-section" aria-labelledby="categories-heading">
      <h2 id="categories-heading" className="admin-section-title">Categories</h2>
      <p className="admin-muted">Students browse by these. Hiding a category hides its resources; a category with resources can&rsquo;t be deleted.</p>
      {error && <p className="form-banner form-banner-error" role="alert">{error}</p>}

      {categories && (
        <ul className="admin-category-list">
          {categories.map((c, index) => (
            <li key={c.id} className="dashboard-card admin-card admin-category-row">
              <div className="admin-category-text">
                {editing === c.id ? (
                  <form
                    className="admin-inline-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void run(() => api.patch(`/admin/resource-categories/${c.id}`, { name: editName.trim() }), "Couldn't rename.").then(
                        (ok) => ok && setEditing(null),
                      );
                    }}
                  >
                    <label className="sr-only" htmlFor={`rename-${c.id}`}>New name for {c.name}</label>
                    <input id={`rename-${c.id}`} className="form-input" value={editName} maxLength={60} onChange={(e) => setEditName(e.target.value)} />
                    <button type="submit" className="button button-primary button-sm" disabled={busy}>Save</button>
                    <button type="button" className="button button-secondary button-sm" onClick={() => setEditing(null)}>Cancel</button>
                  </form>
                ) : (
                  <>
                    <strong>{c.name}</strong>
                    {!c.is_visible && <span className="admin-pill">hidden</span>}
                    <span className="admin-muted">
                      {c.published_count} published · {c.resource_count} total
                    </span>
                  </>
                )}
              </div>
              {editing !== c.id && (
                <div className="admin-actions">
                  <button type="button" className="button button-secondary button-sm" onClick={() => move(index, -1)} disabled={busy || index === 0} aria-label={`Move ${c.name} up`}>
                    <ArrowUp size={14} aria-hidden="true" />
                  </button>
                  <button type="button" className="button button-secondary button-sm" onClick={() => move(index, 1)} disabled={busy || index === categories.length - 1} aria-label={`Move ${c.name} down`}>
                    <ArrowDown size={14} aria-hidden="true" />
                  </button>
                  <button type="button" className="button button-secondary button-sm" onClick={() => { setEditing(c.id); setEditName(c.name); }}>
                    Rename
                  </button>
                  <button
                    type="button"
                    className="button button-secondary button-sm"
                    onClick={() => void run(() => api.patch(`/admin/resource-categories/${c.id}`, { is_visible: !c.is_visible }), "Couldn't change visibility.")}
                    disabled={busy}
                  >
                    {c.is_visible ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />} {c.is_visible ? "Hide" : "Show"}
                  </button>
                  <button
                    type="button"
                    className="button button-secondary button-sm admin-danger"
                    onClick={() => {
                      if (window.confirm(`Delete the category "${c.name}"?`)) {
                        void run(() => api.delete(`/admin/resource-categories/${c.id}`), "Couldn't delete the category.");
                      }
                    }}
                    disabled={busy || c.resource_count > 0}
                    title={c.resource_count > 0 ? "Move or delete its resources first" : undefined}
                  >
                    <Trash2 size={14} aria-hidden="true" /> Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <form className="dashboard-card admin-card admin-form" onSubmit={add} aria-labelledby="new-category-heading">
        <h3 id="new-category-heading">Add a category</h3>
        <div className="admin-form-grid">
          <label className="admin-field">
            <span>Name</span>
            <input className="form-input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="admin-field admin-field-wide">
            <span>Short description (optional)</span>
            <input className="form-input" value={description} maxLength={300} onChange={(e) => setDescription(e.target.value)} />
          </label>
        </div>
        <div className="admin-actions">
          <button type="submit" className="button button-primary button-sm" disabled={busy}>
            {busy && <Loader2 size={14} className="spin" aria-hidden="true" />} Add category
          </button>
        </div>
      </form>
    </section>
  );
}
