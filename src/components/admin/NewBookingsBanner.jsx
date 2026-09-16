import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

// The primary, email-independent record for owner awareness. Shows an
// unmissable count of paid bookings created since the owner last marked the
// dashboard seen, with the bookings listed underneath. This cannot be
// throttled or filtered by any email cap — the daily digest email is only a
// convenience on top of this. Also surfaces the last digest send status so a
// throttled/failed digest is flagged, not silently lost.
export default function NewBookingsBanner() {
  const [state, setState] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bs, rows] = await Promise.all([
        base44.entities.Booking.list("-created_date", 500),
        base44.entities.AdminState.list(null, 10),
      ]);
      setBookings(bs || []);
      setState((rows && rows[0]) || null);
    } catch {
      setBookings([]);
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

  const markSeen = async () => {
    setMarking(true);
    try {
      await base44.functions.invoke("markBookingsSeen", {});
      await load();
    } finally {
      setMarking(false);
    }
  };

  const digestFailed =
    state && state.last_digest_sent_at && state.last_digest_ok === false;

  if (loading) {
    return (
      <div className="mb-10 text-white/40 text-sm">Checking for new bookings…</div>
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
            The last owner digest email ({format(new Date(state.last_digest_sent_at), "EEE d MMM yyyy 'at' HH:mm")}) failed to send — {state.last_digest_error || "unknown error"}. The bookings above are still recorded here regardless.
          </p>
        )}
      </div>
    </div>
  );
}