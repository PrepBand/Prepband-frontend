import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, FileText, Library, Loader2, Search, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { DashboardSidebar } from "../components/dashboard/DashboardSidebar";
import { DashboardTopbar } from "../components/dashboard/DashboardTopbar";
import { api, describeError } from "../lib/apiClient";
import {
  KIND_LABEL,
  MODULE_LABEL,
  TRACK_LABEL,
  formatBytes,
  type OpenResource,
  type ResourceCard,
  type ResourceCategory,
  type ResourcePage,
} from "../lib/resourceTypes";
import { useDashboardTheme } from "../lib/useDashboardTheme";

const PAGE_SIZE = 24;
const FILTER_KEYS = ["q", "category", "module", "kind", "track"] as const;

/** The resource library: search, category chips and filters (kept in the
 * URL so a search can be shared or bookmarked), and cards that open each
 * resource through a short-lived link. */
export function ResourcesPage() {
  const { theme } = useDashboardTheme();
  const [params, setParams] = useSearchParams();
  const [categories, setCategories] = useState<ResourceCategory[]>([]);
  const [page, setPage] = useState<ResourcePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [typed, setTyped] = useState(params.get("q") ?? "");

  // The active filters as one encoded string: what the API gets, and what
  // the loading effect depends on.
  const filterQuery = (() => {
    const query = new URLSearchParams();
    for (const key of FILTER_KEYS) {
      const value = params.get(key);
      if (value) query.set(key, value);
    }
    return query.toString();
  })();

  useEffect(() => {
    api
      .get<ResourceCategory[]>("/resource-categories")
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  // Search as you type, after a short pause. Replaces the history entry so
  // Back doesn't step through every keystroke.
  useEffect(() => {
    const handle = setTimeout(() => {
      setParams(
        (prev) => {
          const wanted = typed.trim();
          if ((prev.get("q") ?? "") === wanted) return prev;
          const next = new URLSearchParams(prev);
          if (wanted) next.set("q", wanted);
          else next.delete("q");
          return next;
        },
        { replace: true },
      );
    }, 300);
    return () => clearTimeout(handle);
  }, [typed, setParams]);

  const load = useCallback(
    async (offset: number) => {
      setLoading(true);
      setError("");
      const query = new URLSearchParams(filterQuery);
      query.set("limit", String(PAGE_SIZE));
      query.set("offset", String(offset));
      try {
        const next = await api.get<ResourcePage>(`/resources?${query}`);
        setPage((prev) => (offset > 0 && prev ? { ...next, items: [...prev.items, ...next.items] } : next));
      } catch (err) {
        setError(describeError(err, "Couldn't load resources."));
      } finally {
        setLoading(false);
      }
    },
    [filterQuery],
  );

  useEffect(() => {
    void load(0);
  }, [load]);

  function update(key: (typeof FILTER_KEYS)[number], value: string) {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  }

  const clearAll = () => {
    setTyped("");
    setParams(new URLSearchParams());
  };

  const activeCategory = params.get("category") ?? "";
  const anyFilter = FILTER_KEYS.some((key) => params.get(key));

  return (
    <div className="dashboard-shell" data-theme={theme}>
      <DashboardSidebar />
      <div className="dashboard-content">
        <DashboardTopbar label="Resources" />

        <main className="dashboard-main dashboard-main-shell">
          <div className="page-heading">
            <h1>Guides for every step of the journey.</h1>
            <p>Strategy guides, sample answers, vocabulary and worksheets for all four skills.</p>
          </div>

          <div className="resource-search" role="search" aria-label="Find resources">
            <label className="resource-search-box">
              <Search size={18} aria-hidden="true" />
              <span className="sr-only">Search resources</span>
              <input
                type="search"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="Search guides, word lists, sample answers…"
                maxLength={100}
              />
            </label>
            <div className="resource-filter-row">
              <label>
                <span className="sr-only">Skill</span>
                <select className="form-input" value={params.get("module") ?? ""} onChange={(e) => update("module", e.target.value)}>
                  <option value="">All skills</option>
                  {(["listening", "reading", "writing", "speaking", "general"] as const).map((m) => (
                    <option key={m} value={m}>{m === "general" ? "General" : MODULE_LABEL[m]}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="sr-only">Type</span>
                <select className="form-input" value={params.get("kind") ?? ""} onChange={(e) => update("kind", e.target.value)}>
                  <option value="">All types</option>
                  {(Object.keys(KIND_LABEL) as (keyof typeof KIND_LABEL)[]).map((k) => (
                    <option key={k} value={k}>{KIND_LABEL[k]}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="sr-only">Track</span>
                <select className="form-input" value={params.get("track") ?? ""} onChange={(e) => update("track", e.target.value)}>
                  <option value="">Both tracks</option>
                  <option value="academic">Academic</option>
                  <option value="general">General Training</option>
                </select>
              </label>
              {anyFilter && (
                <button type="button" className="button button-secondary button-sm" onClick={clearAll}>
                  <X size={14} aria-hidden="true" /> Clear all
                </button>
              )}
            </div>
          </div>

          <nav className="resource-chips" aria-label="Categories">
            <button
              type="button"
              className={`resource-chip${activeCategory === "" ? " resource-chip-active" : ""}`}
              aria-pressed={activeCategory === ""}
              onClick={() => update("category", "")}
            >
              All
            </button>
            {categories
              .filter((c) => c.resource_count > 0 || c.slug === activeCategory)
              .map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`resource-chip${activeCategory === c.slug ? " resource-chip-active" : ""}`}
                  aria-pressed={activeCategory === c.slug}
                  title={c.description ?? undefined}
                  onClick={() => update("category", activeCategory === c.slug ? "" : c.slug)}
                >
                  {c.name} <span className="resource-chip-count">{c.resource_count}</span>
                </button>
              ))}
          </nav>

          <p className="resource-count" role="status" aria-live="polite">
            {loading && !page ? "Loading…" : page ? `${page.total} resource${page.total === 1 ? "" : "s"}${page.query ? ` for "${page.query}"` : ""}` : ""}
          </p>

          {error && (
            <p className="form-banner form-banner-error form-banner-text" role="alert">
              {error}
            </p>
          )}

          {page && page.total === 0 && !loading && !error && (
            <div className="dashboard-card stage-card">
              <span className="stage-icon" aria-hidden="true">
                <Library size={28} />
              </span>
              <h2>{anyFilter ? "Nothing matches that yet." : "Resources are on their way."}</h2>
              <p>
                {anyFilter
                  ? "Try fewer words or a different category. We note searches that find nothing, so the library grows where it's needed."
                  : "We're building a library of strategy guides and sample answers for Listening, Reading, Writing and Speaking."}
              </p>
              {anyFilter && (
                <button type="button" className="button button-primary stage-cta" onClick={clearAll}>
                  Show everything
                </button>
              )}
            </div>
          )}

          <ul className="resource-grid">
            {page?.items.map((item) => (
              <li key={item.id}>
                <ResourceTile item={item} />
              </li>
            ))}
          </ul>

          {page && page.items.length < page.total && (
            <button type="button" className="button button-secondary" onClick={() => void load(page.items.length)} disabled={loading}>
              {loading && <Loader2 size={14} className="spin" aria-hidden="true" />} Show more ({page.total - page.items.length} left)
            </button>
          )}
        </main>
      </div>
    </div>
  );
}

function ResourceTile({ item }: { item: ResourceCard }) {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");
  const headingId = `resource-${item.id}`;
  const busy = useRef(false);

  const open = async () => {
    if (busy.current) return;
    busy.current = true;
    setOpening(true);
    setError("");
    // Open the tab inside the click (so pop-up blockers allow it), then
    // point it at the short-lived link once the API returns it.
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    try {
      const { url } = await api.post<OpenResource>(`/resources/${item.id}/open`);
      if (tab) tab.location.replace(url);
      else window.location.assign(url);
    } catch (err) {
      tab?.close();
      setError(describeError(err, "Couldn't open this resource."));
    } finally {
      busy.current = false;
      setOpening(false);
    }
  };

  const meta = [MODULE_LABEL[item.module], item.track !== "both" ? TRACK_LABEL[item.track] : null, item.level ? item.level[0].toUpperCase() + item.level.slice(1) : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="dashboard-card resource-card" aria-labelledby={headingId}>
      <div className="resource-cover">
        {item.cover_url ? <img src={item.cover_url} alt={item.cover_alt ?? ""} loading="lazy" /> : <FileText size={32} aria-hidden="true" />}
      </div>
      <div className="resource-body">
        <p className="resource-category">{item.category_name}</p>
        <h2 id={headingId}>{item.title}</h2>
        {item.description && <p className="resource-description">{item.description}</p>}
        <p className="resource-meta">
          {meta}
          {item.size_bytes ? ` · ${KIND_LABEL[item.kind]} · ${formatBytes(item.size_bytes)}` : ` · ${KIND_LABEL[item.kind]}`}
        </p>
        <button type="button" className="button button-primary button-sm resource-open" onClick={() => void open()} disabled={opening} aria-describedby={headingId}>
          {opening ? <Loader2 size={14} className="spin" aria-hidden="true" /> : <ExternalLink size={14} aria-hidden="true" />}
          {item.is_external ? (item.kind === "video" ? "Watch" : "Visit link") : "Open"}
          <span className="sr-only"> (opens in a new tab)</span>
        </button>
        {error && (
          <p className="form-banner form-banner-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </article>
  );
}
