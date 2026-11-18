import { useEffect } from "react";
import { Sparkles, X } from "lucide-react";

type ComingSoonModalProps = {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
};

export function ComingSoonModal({ open, title, description, onClose }: ComingSoonModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <span className="modal-icon" aria-hidden="true">
          <Sparkles size={24} />
        </span>
        <h2>{title}</h2>
        <p>{description}</p>
        <button type="button" className="button button-secondary modal-close" onClick={onClose}>
          <X size={15} aria-hidden="true" /> Close
        </button>
      </div>
    </div>
  );
}
