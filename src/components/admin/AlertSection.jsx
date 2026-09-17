import { useState } from "react";
import { ChevronDown } from "lucide-react";

// The shared collapsible shell for every Today-tab alert. Collapsed it is a
// single line — a tone dot, the title, the count, and a chevron — so seven
// alerts read as seven quiet rows, not seven shouting panels. Expanded it
// shows whatever children the alert renders (its list, buttons, subtitle).
//
// tone controls the dot + chevron colour only:
//   "problem" (signal/amber) — failed emails, overdue balances. Loud.
//   "action"  (sea/teal)      — time-sensitive owner action (grace, undo, text).
//   "info"    (neutral)       — normal business (new bookings, enquiries).
//
// Self-hides when count is 0 and forceShow is false, so an empty alert renders
// nothing — the Today tab's empty state handles the "nothing needs me" case.
export default function AlertSection({ title, count = 0, tone = "info", defaultOpen = false, forceShow = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  if (count === 0 && !forceShow) return null;

  const dot = tone === "problem" ? "bg-signal" : tone === "action" ? "bg-sea" : "bg-white/30";
  const chev = tone === "problem" ? "text-signal" : tone === "action" ? "text-sea" : "text-white/50";

  return (
    <div className="border-b border-white/10">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 py-3.5 text-left min-h-[44px]"
      >
        <span className={`w-2 h-2 rounded-full ${dot} flex-shrink-0`} />
        <span className="text-sm text-white/90 flex-1">{title}</span>
        <span className="text-sm tnum text-white/60">{count}</span>
        <ChevronDown className={`w-4 h-4 ${chev} flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="pb-5 pt-1">{children}</div>}
    </div>
  );
}