import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import AlertSection from "@/components/admin/AlertSection";

// Today-tab alert: paid bookings created since the owner last marked the
// dashboard seen. Split out of the old NewBookingsBanner so new bookings and
// unanswered enquiries each collapse to their own one-line row. The "Mark all
// as seen" action and the last-digest-failed note live inside the expanded
// section. Reports its count up to the Today tab for the empty-state check.
export default function NewBookingsAlert({ onCount }) {
  const [state, setState] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
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
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const lastViewed = state?.last_viewed_at ? new Date(state.last_viewed_at) : null;
  const newBookings = bookings.filter((b) => {
    if (!["deposit_paid", "confirmed"].includes(b.status)) return false;
    if (!lastViewed) return true;
    return new Date(b.created_date) > lastViewed;
  });

  useEffect(() => { onCount?.(newBookings.length); }, [newBookings, onCount]);

  const markSeen = async () => {
    setMarking(true);
    try {
      await base44.functions.invoke("markBookingsSeen", {});
      await load();
    } finally {
      setMarking(false);
    }
  };

  const digestFailed = state && state.last_digest_sent_at && state.last_digest_ok === false;

  return (
    <AlertSection title="New bookings since you last looked" count={newBookings.length} tone="info">
      {newBookings.length > 0 && (
        <div className="flex justify-end mb-3">
          <button
            type="button"
            onClick={markSeen}
            disabled={marking}
            className="bg-white text-ink px-4 py-2 text-sm font-medium hover:bg-white/90 disabled:opacity-50 min-h-[40px]"
          >
            {marking ? "Marking…" : "Mark all as seen"}
          </button>
        </div>
      )}
      <ul className="divide-y divide-white/10">
        {newBookings.slice(0, 12).map((b) => (
          <li key={b.id} className="py-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
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
          <li className="py-2 text-white/40 text-sm">+ {newBookings.length - 12} more — see Bookings</li>
        )}
      </ul>
      {digestFailed && (
        <p className="mt-4 text-sm text-signal">
          The last owner digest email ({format(new Date(state.last_digest_sent_at), "EEE d MMM yyyy 'at' HH:mm")}) failed to send — {state.last_digest_error || "unknown error"}. The items above are still recorded here regardless.
        </p>
      )}
    </AlertSection>
  );
}