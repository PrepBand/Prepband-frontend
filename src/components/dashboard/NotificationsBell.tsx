import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="notifications-bell" ref={wrapRef}>
      <button
        type="button"
        className="icon-button"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Bell size={18} aria-hidden="true" />
      </button>
      {open && (
        <div className="notifications-panel" role="dialog" aria-label="Notifications">
          <strong>Notifications</strong>
          <p>No notifications yet. We&rsquo;ll let you know when there&rsquo;s something new.</p>
        </div>
      )}
    </div>
  );
}
