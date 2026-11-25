import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { api, describeError } from "../../lib/apiClient";
import type { AuditOutcome, AuditPage } from "../../lib/adminTypes";

const PAGE_SIZE = 50;
const ENTITY_TYPES = ["test", "section", "question", "passage", "media_asset", "prompt", "certificate", "key"];

/** FR-ADMIN-08 audit trail: every admin change and every refused attempt
 * to use an admin route, newest first. Read-only; rows can't be edited. */
export function AdminAuditPage() {
  const [page, setPage] = useState<AuditPage | null>(null);
  const [error, setError] = useState("");
  const [offset, setOffset] = useState(0);
  const [outcome, setOutcome] = useState<AuditOutcome | "">("");
  const [entityType, setEntityType] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
    if (outcome) params.set("outcome", outcome);
    if (entityType) params.set("entity_type", entityType);
    setLoading(true);
    api
      .get<AuditPage>(`/admin/audit?${params}`)
      .then((data) => {
        setPage(data);
        setError("");
      })
      .catch((err) => setError(describeError(err, "Failed to load the audit log.")))
      .finally(() => setLoading(false));
  }, [offset, outcome, entityType]);

  useEffect(load, [load]);

  const from = page && page.total ? offset + 1 : 0;
  const to = page ? Math.min(offset + PAGE_SIZE, page.total) : 0;

  return (
    <AdminLayout title="Audit log">
      <div className="page-heading">
        <h1>Audit log.</h1>
        <p>Every admin change, who made it and whether it worked, plus refused attempts to reach admin pages. Entries can&rsquo;t be edited or removed.</p>
      </div>

      <div className="admin-toolbar">
        <select
          className="form-input admin-filter"
          value={outcome}
          onChange={(e) => {
            setOffset(0);
            setOutcome(e.target.value as AuditOutcome | "");
          }}
          aria-label="Filter by outcome"
        >
          <option value="">All outcomes</option>
          <option value="success">Succeeded</option>
          <option value="failed">Failed</option>
          <option value="denied">Refused (not an admin)</option>
        </select>
        <select
          className="form-input admin-filter"
          value={entityType}
          onChange={(e) => {
            setOffset(0);
            setEntityType(e.target.value);
          }}
          aria-label="Filter by what was changed"
        >
          <option value="">Everything</option>
          {ENTITY_TYPES.map((type) => (
            <option key={type} value={type}>{type.replace("_", " ")}</option>
          ))}
        </select>
        {page && <span className="admin-muted">{from}&ndash;{to} of {page.total}</span>}
        {loading && <Loader2 size={16} className="spin" aria-label="Loading" />}
      </div>

      {error && <p className="form-banner form-banner-error" role="alert">{error}</p>}

      {page && (
        <div className="dashboard-card admin-card admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Who</th>
                <th scope="col">Action</th>
                <th scope="col">Target</th>
                <th scope="col">Result</th>
                <th scope="col">Details</th>
              </tr>
            </thead>
            <tbody>
              {page.items.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <time dateTime={entry.created_at}>{new Date(entry.created_at).toLocaleString()}</time>
                  </td>
                  <td>
                    {entry.actor_email ?? entry.actor_id ?? "unknown"}
                    {entry.actor_role && <span className="admin-muted"> ({entry.actor_role})</span>}
                  </td>
                  <td><code>{entry.action}</code></td>
                  <td>
                    {entry.entity_type ? (
                      <>
                        {entry.entity_type}
                        {entry.entity_id && <span className="admin-muted"> {entry.entity_id.slice(0, 8)}</span>}
                      </>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>
                    <span className={`admin-pill admin-pill-${entry.outcome === "success" ? "success" : entry.outcome === "denied" ? "danger" : "accent"}`}>
                      {entry.outcome === "success" ? "ok" : entry.outcome} {entry.status_code}
                    </span>
                  </td>
                  <td>
                    {Object.keys(entry.details).length > 0 ? (
                      <details>
                        <summary>View</summary>
                        <pre className="admin-audit-details">{JSON.stringify(entry.details, null, 2)}</pre>
                      </details>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
              {page.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="admin-muted">No entries match.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {page && page.total > PAGE_SIZE && (
        <nav className="admin-pagination" aria-label="Audit log pages">
          <button type="button" className="button button-secondary button-sm" disabled={offset === 0 || loading} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
            Newer
          </button>
          <button type="button" className="button button-secondary button-sm" disabled={to >= page.total || loading} onClick={() => setOffset(offset + PAGE_SIZE)}>
            Older
          </button>
        </nav>
      )}
    </AdminLayout>
  );
}
