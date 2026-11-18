import type { ReactNode } from "react";
import { BookOpen, BookOpenText, Headphones, Mic2, PenLine } from "lucide-react";
import { Logo } from "../layout/Logo";

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
};

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="auth-page">
      <div className="auth-blob blob-a" aria-hidden="true" />
      <div className="auth-blob blob-b" aria-hidden="true" />
      <div className="auth-blob blob-c" aria-hidden="true" />

      <div className="auth-brand-corner">
        <Logo />
      </div>

      <div className="auth-stage">
        <div className="auth-illustration">
          <div className="auth-illustration-art" aria-hidden="true">
            <div className="auth-illustration-core">
              <BookOpen size={36} strokeWidth={1.7} />
            </div>
            <span className="auth-chip chip-headphones"><Headphones size={18} /></span>
            <span className="auth-chip chip-reading"><BookOpenText size={18} /></span>
            <span className="auth-chip chip-pen"><PenLine size={18} /></span>
            <span className="auth-chip chip-mic"><Mic2 size={18} /></span>
          </div>
          <div className="auth-illustration-copy">
            <h2>Small steps,<br />big next chapters.</h2>
            <p>Practice Listening, Reading, Writing and Speaking with Prepband. Honest feedback, steady progress.</p>
          </div>
        </div>

        <div className="auth-card">
          <h1>{title}</h1>
          <p className="auth-subtitle">{subtitle}</p>
          {children}
          <div className="auth-footer-link">{footer}</div>
        </div>
      </div>
    </div>
  );
}
