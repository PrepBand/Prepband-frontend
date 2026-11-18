import { BookOpen } from "lucide-react";
import { Link } from "react-router-dom";

export function Logo() {
  return (
    <Link className="brand" to="/" aria-label="Prepband home">
      <span className="brand-mark" aria-hidden="true">
        <BookOpen size={19} strokeWidth={2.2} />
      </span>
      <span>prepband</span>
    </Link>
  );
}
