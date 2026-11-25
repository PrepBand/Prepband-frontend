import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { api, describeError } from "../../lib/apiClient";
import type { AdminUser } from "../../lib/adminTypes";

/** FR-ADMIN-06: a high-level, read-only student overview. Roles can only
 * be changed with SQL by design, so there's no role editor here. */
export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    api
      .get<AdminUser[]>("/admin/users")
      .then(setUsers)
      .catch((err) => setError(describeError(err, "Failed to load users.")));
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!users || !needle) return users ?? [];
    return users.filter(
      (user) => user.email.toLowerCase().includes(needle) || (user.display_name ?? "").toLowerCase().includes(needle),
    );
  }, [users, query]);

  return (
    <AdminLayout title="Users">
      <div className="page-heading">
        <h1>Who&rsquo;s practising.</h1>
        <p>Accounts, roles and attempt counts. No answers or private profile details are shown here.</p>
      </div>

      {error && <p className="form-banner form-banner-error" role="alert">{error}</p>}

      <div className="admin-toolbar">
        <input
          className="form-input admin-search"
          type="search"
          placeholder="Search by name or email"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search users"
        />
        {users && <span className="admin-muted">{filtered.length} of {users.length}</span>}
      </div>

      {!users && !error && (
        <p className="admin-muted">
          <Loader2 size={16} className="spin" aria-hidden="true" /> Loading…
        </p>
      )}

      {users && (
        <div className="dashboard-card admin-card admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Role</th>
                <th scope="col">Onboarded</th>
                <th scope="col">Attempts</th>
                <th scope="col">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id}>
                  <td>{user.display_name || "-"}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`admin-pill admin-pill-${user.role === "student" ? "neutral" : "accent"}`}>{user.role}</span>
                  </td>
                  <td>{user.onboarding_completed ? "Yes" : "No"}</td>
                  <td>
                    {user.attempts_submitted} submitted / {user.attempts_total}
                  </td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="admin-muted">No users match.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
