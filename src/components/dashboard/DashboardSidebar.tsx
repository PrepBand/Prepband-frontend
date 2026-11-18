import type { LucideIcon } from "lucide-react";
import { Award, BarChart3, BookOpen, FileText, History, LayoutGrid, LogOut, Mail, Scale } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Logo } from "../layout/Logo";
import { supabase } from "../../lib/supabaseClient";

type NavItem = { label: string; icon: LucideIcon; to: string };

const primaryNav: NavItem[] = [
  { label: "Overview", icon: LayoutGrid, to: "/app/dashboard" },
  { label: "Practice", icon: BookOpen, to: "/app/practice" },
  { label: "Mock tests", icon: FileText, to: "/app/mock-tests" },
];

const learningNav: NavItem[] = [
  { label: "My progress", icon: BarChart3, to: "/app/progress" },
  { label: "Practice history", icon: History, to: "/app/practice-history" },
  { label: "Certificates", icon: Award, to: "/app/certificates" },
];

export function DashboardSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth/login", { replace: true });
  };

  const renderItem = (item: NavItem) => {
    const active = location.pathname === item.to;
    return (
      <Link key={item.label} to={item.to} className={`sidebar-link${active ? " sidebar-link-active" : ""}`}>
        <item.icon size={17} strokeWidth={1.9} aria-hidden="true" />
        {item.label}
      </Link>
    );
  };

  return (
    <aside className="app-sidebar" aria-label="Dashboard navigation">
      <div className="app-sidebar-logo">
        <Logo />
      </div>
      <nav className="app-sidebar-nav">
        {primaryNav.map(renderItem)}
        <span className="app-nav-group-label">Your learning</span>
        {learningNav.map(renderItem)}
        <Link
          to="/legal"
          className={`sidebar-link${location.pathname === "/legal" ? " sidebar-link-active" : ""}`}
        >
          <Scale size={17} strokeWidth={1.9} aria-hidden="true" />
          Legal
        </Link>
        <Link
          to="/contact"
          className={`sidebar-link${location.pathname === "/contact" ? " sidebar-link-active" : ""}`}
        >
          <Mail size={17} strokeWidth={1.9} aria-hidden="true" />
          Contact us
        </Link>
        <button type="button" className="sidebar-link" onClick={handleLogout}>
          <LogOut size={17} strokeWidth={1.9} aria-hidden="true" />
          Log out
        </button>
      </nav>
    </aside>
  );
}
