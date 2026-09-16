import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

// The primary, email-independent record for owner awareness. Shows an
// unmissable count of paid bookings created since the owner last marked the
// dashboard seen, plus a list of unanswered contact-form enquiries with how
// long each has been waiting (overdue once older than 24 hours). Bookings
// clear on "Mark all as seen"; enquiries persist until individually resolved,
// so an unanswered enquiry can't slip away unread. This cannot be throttled
// or filtered by any email cap — the daily digest email is only a convenience
// on top of this. Also surfaces the last digest send status so a
// throttled/failed digest is flagged, not silently lost.
export default function NewBookingsBanner() {
  const [state, setState] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [resolving, setResolving] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bs, cs, rows] = await Promise.all([
        base44.entities.Booking.list("-created_date", 500),
        base44.entities.Contact.list(null, 500),
        base44.entities.AdminState.list(null, 10),
      ]);
      setBookings(bs || []);
      setContacts(cs || []);
      setState((rows && rows[0]) || null);
    } catch {
      setBookings([]);
      setContacts([]);
      setState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const lastViewed = state?.last_viewed_at ? new Date(state.last_viewed_at) : null;
  const newBookings = bookings.filter((b) => {
    if (!["deposit_paid", "confirmed"].includes(b.status)) return false;
    if (!lastViewed) return true;
    return new Date(b.created_date) > lastViewed;
  });

  const unansweredEnquiries = contacts
    .filter((c) => c.last_enquiry_message && c.last_enquiry_at && c.enquiry_resolved !== true)
    .sort((a, b) => new Date(b.last_enquiry_at) - new Date(a.last_enquiry_at));

  const markSeen = async () => {
    setMarking(true);
    try {
      await base44.functions.invoke("markBookingsSeen", {});
      await load();
    } finally {
      setMarking(false);
    }
  };

  const resolveEnquiry = async (id) => {
    setResolving(id);
    try {
      await base44.entities.Contact.update(id, { enquiry_resolved: true });
      await load();
    } finally {
      setResolving(null);
    }
  };

  const digestFailed =
    state && state.last_digest_sent_at && state.last_digest_ok === false;

  if (loading) {
    return (
      <div className="mb-10 text-white/40 text-sm">Checking for new bookings and enquiries…</div>
    );
  }

  return (
    <div className="mb-10">
      <div className="border border-white/15 bg-white/[0.03] p-6 md:p-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm text-white/50">Primary record — not email-dependent</p>
            <h2 className="text-2xl md:text-3xl text-white mt-1">
              {newBookings.length === 0
                ? "No new bookings since you last looked"
                : `${newBookings.length} new booking${newBookings.length === 1 ? "" : "s"} since you last looked`}
            </h2>
          </div>
          {newBookings.length > 0 && (
            <button
              type="button"
              onClick={markSeen}
              disabled={marking}
              className="bg-white text-ink px-5 py-2.5 text-sm font-medium hover:bg-white/90 disabled:opacity-50 min-h-[44px]"
            >
              {marking ? "Marking…" : "Mark all as seen"}
            </button>
          )}
        </div>

        {newBookings.length > 0 && (
          <ul className="mt-6 divide-y divide-white/10">
            {newBookings.slice(0, 12).map((b) => (
              <li
                key={b.id}
                className="py-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1"
              >
                <div>
                  <span className="text-white font-medium">{b.guest_name}</span>
                  <span className="text-white/50">
                    {" "}· arriving {b.arrival_date} · {b.nights} night(s) · {b.guests || 0} guest(s)
                  </span>
                </div>
                <div className="text-sm text-white/60 tnum">
                  {b.status === "confirmed" ? "Paid in full" : "Deposit paid"} · £
                  {(Number(b.deposit_paid) || 0).toLocaleString("en-GB")}
                </div>
              </li>
            ))}
            {newBookings.length > 12 && (
              <li className="py-2 text-white/40 text-sm">
                + {newBookings.length - 12} more — see Bookings below
              </li>
            )}
          </ul>
        )}

        {digestFailed && (
          <p className="mt-5 text-sm text-signal">
            The last owner digest email ({format(new Date(state.last_digest_sent_at), "EEE d MMM yyyy 'at' HH:mm")}) failed to send — {state.last_digest_error || "unknown error"}. The items above are still recorded here regardless.
          </p>
        )}
      </div>

      {unansweredEnquiries.length > 0 && (
        <div className="mt-6 border border-white/15 bg-white/[0.03] p-6 md:p-8">
          <div>
            <p className="text-sm text-white/50">Unanswered contact-form enquiries</p>
            <h2 className="text-2xl md:text-3xl text-white mt-1">
              {unansweredEnquiries.length} unanswered enquiry{unansweredEnquiries.length === 1 ? "" : "ies"}
            </h2>
          </div>
          <ul className="mt-6 divide-y divide-white/10">
            {unansweredEnquiries.slice(0, 12).map((c) => {
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
            {unansweredEnquiries.length > 12 && (
              <li className="py-2 text-white/40 text-sm">
                + {unansweredEnquiries.length - 12} more — see Contacts below
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
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