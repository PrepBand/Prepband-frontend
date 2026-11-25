import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AudioLines, Award, BarChart3, FileText, FlaskConical, LayoutGrid, Library, LogOut, Moon, ScrollText, Sun, Users } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Logo } from "../layout/Logo";
import { supabase } from "../../lib/supabaseClient";
import { useDashboardTheme } from "../../lib/useDashboardTheme";

type NavItem = { label: string; icon: LucideIcon; to: string; exact?: boolean };

const NAV: NavItem[] = [
  { label: "Overview", icon: LayoutGrid, to: "/admin", exact: true },
  { label: "Tests", icon: FileText, to: "/admin/tests" },
  { label: "Resources", icon: Library, to: "/admin/resources" },
  { label: "Analytics", icon: BarChart3, to: "/admin/analytics" },
  { label: "Users", icon: Users, to: "/admin/users" },
  { label: "Certificates", icon: Award, to: "/admin/certificates" },
  { label: "Audit log", icon: ScrollText, to: "/admin/audit" },
  { label: "Examiner", icon: AudioLines, to: "/admin/examiner" },
  { label: "Speech lab", icon: FlaskConical, to: "/admin/speech-lab" },
];

/** Same shell, sidebar and theme as the student workspace, with admin
 * navigation. Wrapped in RequireAdmin by every admin route. */
export function AdminLayout({ title, children }: { title: string; children: ReactNode }) {
  const { theme, toggleTheme } = useDashboardTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth/login", { replace: true });
  };

  return (
    <div className="dashboard-shell admin-shell" data-theme={theme}>
      <aside className="app-sidebar" aria-label="Admin navigation">
        <div className="app-sidebar-logo">
          <Logo />
          <span className="admin-badge">Admin</span>
        </div>
        <nav className="app-sidebar-nav">
          {NAV.map((item) => {
            const active = item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
            return (
              <Link key={item.to} to={item.to} className={`sidebar-link${active ? " sidebar-link-active" : ""}`}>
                <item.icon size={17} strokeWidth={1.9} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
          <button type="button" className="sidebar-link" onClick={handleLogout}>
            <LogOut size={17} strokeWidth={1.9} aria-hidden="true" />
            Log out
          </button>
        </nav>
      </aside>

      <div className="dashboard-content">
        <header className="dashboard-topbar">
          <span className="dashboard-breadcrumb">
            Admin <span aria-hidden="true">/</span> <strong>{title}</strong>
          </span>
          <div className="dashboard-topbar-actions">
            <button
              type="button"
              className="icon-button"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
            </button>
          </div>
        </header>
        <main className="dashboard-main dashboard-main-shell admin-main">{children}</main>
      </div>
    </div>
  );
}
