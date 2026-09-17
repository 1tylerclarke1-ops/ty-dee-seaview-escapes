import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { base44 } from "@/api/base44Client";
import { gbpMoney } from "@/lib/pricing";
import AlertSection from "@/components/admin/AlertSection";

// Prominent 24-hour undo for auto-cancelled bookings. Shows each booking
// cancelled for non-payment within the last 24 hours, with a one-click
// "Undo cancellation" that restores the booking, re-blocks the dates and
// emails the guest a fresh payment link. Refuses (with a reason) if the
// dates have been taken since.
export default function AutoCancelUndoAlerts({ onCount }) {
  const [bookings, setBookings] = useState([]);
  const [undoing, setUndoing] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const load = () => {
    base44.entities.Booking
      .filter({ status: "cancelled" }, "-updated_date", 50)
      .then((rows) => {
        const now = Date.now();
        const filtered = (rows || []).filter(
          (b) =>
            b.cancellation_reason === "unpaid_balance" &&
            b.auto_cancelled_at &&
            now - new Date(b.auto_cancelled_at).getTime() < 86_400_000
        );
        setBookings(filtered);
      })
      .catch(() => setBookings([]));
  };

  useEffect(load, []);
  useEffect(() => { onCount?.(bookings.length); }, [bookings, onCount]);

  const undo = async (b) => {
    setUndoing(b.id);
    setError(null);
    setSuccess(null);
    try {
      const res = await base44.functions.invoke("undoCancellation", { booking_id: b.id });
      const data = res.data || res;
      if (data.error) {
        setError(data.error);
      } else {
        setSuccess(`${b.guest_name}'s booking has been restored. A fresh payment link has been emailed.`);
        load();
      }
    } catch (e) {
      const data = e?.data || e;
      setError(data?.error || "Could not undo the cancellation.");
    } finally {
      setUndoing(null);
    }
  };

  // forceShow keeps the section visible after an undo so the success (or
  // error) message is not lost when the booking drops out of the list.
  return (
    <AlertSection
      title="Auto-cancelled — 24-hour undo"
      count={bookings.length}
      tone="action"
      forceShow={!!success || !!error}
      defaultOpen={!!success || !!error}
    >
      <p className="text-sm text-white/60 mb-4">
        These bookings were automatically cancelled for non-payment. You have 24 hours to undo the cancellation and restore the booking. If the dates have been taken since, the undo will be refused.
      </p>
      {success && (
        <div className="border border-sea/40 bg-sea/10 p-3 mb-4 text-sm text-white/80">
          {success}
        </div>
      )}
      {error && (
        <div className="border border-signal/40 bg-signal/10 p-3 mb-4 text-sm text-signal">
          {error}
        </div>
      )}
      {bookings.map((b) => {
        const cancelledAt = b.auto_cancelled_at
          ? format(parseISO(b.auto_cancelled_at), "d MMM yyyy, HH:mm")
          : "—";
        const hoursLeft = b.auto_cancelled_at
          ? Math.max(0, 24 - Math.floor((Date.now() - new Date(b.auto_cancelled_at).getTime()) / 3_600_000))
          : 0;
        return (
          <div key={b.id} className="border-t border-white/10 pt-3 mt-3 first:border-0 first:mt-0 first:pt-0">
            <div className="flex flex-wrap justify-between items-start gap-3">
              <div>
                <p className="text-white font-medium">{b.guest_name}</p>
                <p className="text-xs text-white/40 tnum">
                  Ref {b.reference} · arriving {b.arrival_date ? format(parseISO(b.arrival_date), "d MMM yyyy") : "—"} · {b.nights || 0} nights
                </p>
                <p className="text-sm text-white/60 tnum mt-1">
                  Deposit retained: {gbpMoney(b.deposit_retained || 0)} · cancelled {cancelledAt}
                </p>
                <p className="text-xs text-signal mt-1 tnum">
                  Undo window: {hoursLeft} hour{hoursLeft === 1 ? "" : "s"} left
                </p>
              </div>
              <button
                type="button"
                onClick={() => undo(b)}
                disabled={undoing === b.id}
                className="bg-sea text-white px-4 py-2.5 text-sm font-medium hover:bg-sea-deep transition-colors min-h-[44px] disabled:opacity-50"
              >
                {undoing === b.id ? "Restoring…" : "Undo cancellation"}
              </button>
            </div>
          </div>
        );
      })}
    </AlertSection>
  );
}