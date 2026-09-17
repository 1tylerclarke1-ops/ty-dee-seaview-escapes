import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import AlertSection from "@/components/admin/AlertSection";

// Today-tab alert: contact-form enquiries not yet resolved. Split out of the
// old NewBookingsBanner so it collapses to its own row. Each enquiry shows how
// long it has waited (overdue once older than 24 hours) and a Resolve action;
// resolving persists (enquiry_resolved) so an unanswered enquiry can't slip
// away unread. Reports its count up to the Today tab for the empty-state check.
export default function UnansweredEnquiriesAlert({ onCount }) {
  const [contacts, setContacts] = useState([]);
  const [resolving, setResolving] = useState(null);

  const load = useCallback(async () => {
    try {
      const cs = await base44.entities.Contact.list(null, 500);
      setContacts(cs || []);
    } catch {
      setContacts([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const unanswered = contacts
    .filter((c) => c.last_enquiry_message && c.last_enquiry_at && c.enquiry_resolved !== true)
    .sort((a, b) => new Date(b.last_enquiry_at) - new Date(a.last_enquiry_at));

  useEffect(() => { onCount?.(unanswered.length); }, [unanswered, onCount]);

  const resolveEnquiry = async (id) => {
    setResolving(id);
    try {
      await base44.entities.Contact.update(id, { enquiry_resolved: true });
      await load();
    } finally {
      setResolving(null);
    }
  };

  return (
    <AlertSection title="Unanswered enquiries" count={unanswered.length} tone="info">
      <ul className="divide-y divide-white/10">
        {unanswered.slice(0, 12).map((c) => {
          const overdue =
            Date.now() - new Date(c.last_enquiry_at).getTime() > 24 * 3600 * 1000;
          return (
            <li key={c.id} className="py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <div className="min-w-0">
                  <span className="text-white font-medium">{c.name || "(no name)"}</span>
                  <span className="text-white/50">
                    {" "}· {c.email || "no email"}{c.phone ? ` · ${c.phone}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {overdue && (
                    <span className="text-xs uppercase tracking-wide text-signal border border-signal/40 px-2 py-1">
                      Overdue
                    </span>
                  )}
                  <span className="text-sm text-white/60 tnum">
                    waiting {waitingLabel(c.last_enquiry_at)}
                  </span>
                  <button
                    type="button"
                    onClick={() => resolveEnquiry(c.id)}
                    disabled={resolving === c.id}
                    className="text-sm text-white/80 hover:text-white border border-white/20 hover:border-white/40 px-3 py-1.5 disabled:opacity-50 min-h-[36px]"
                  >
                    {resolving === c.id ? "Resolving…" : "Resolve"}
                  </button>
                </div>
              </div>
              {c.last_enquiry_message && (
                <p className="mt-2 text-sm text-white/70 break-words">
                  “{c.last_enquiry_message.slice(0, 280)}”
                </p>
              )}
            </li>
          );
        })}
        {unanswered.length > 12 && (
          <li className="py-2 text-white/40 text-sm">+ {unanswered.length - 12} more — see Guest list in Settings</li>
        )}
      </ul>
    </AlertSection>
  );
}

function waitingLabel(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return "just now";
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remM = mins % 60;
  if (hrs < 24) return remM ? `${hrs}h ${remM}m` : `${hrs}h`;
  const days = Math.floor(hrs / 24);
  const remH = hrs % 24;
  return remH ? `${days}d ${remH}h` : `${days}d`;
}