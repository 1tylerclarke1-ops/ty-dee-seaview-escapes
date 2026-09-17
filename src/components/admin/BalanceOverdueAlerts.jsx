import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { base44 } from "@/api/base44Client";
import { gbpMoney } from "@/lib/pricing";
import AlertSection from "@/components/admin/AlertSection";

// Admin alert for bookings flagged balance-overdue (53+ days from arrival,
// balance unpaid). Shows the guest's details and a one-click cancel-and-release
// that retains the deposit. No auto-cancel — the owner decides.
export default function BalanceOverdueAlerts({ onCount }) {
  const [bookings, setBookings] = useState([]);
  const [cancelling, setCancelling] = useState(null);
  const [error, setError] = useState(null);

  const load = () => {
    base44.entities.Booking
      .filter({ balance_overdue_flagged: true, status: "deposit_paid" }, "-arrival_date", 50)
      .then((rows) => setBookings(rows || []))
      .catch(() => setBookings([]));
  };

  useEffect(load, []);
  useEffect(() => { onCount?.(bookings.length); }, [bookings, onCount]);

  const cancelAndRelease = async (b) => {
    if (!confirm(`Cancel ${b.guest_name}'s booking and release the dates? The deposit is retained — no refund.`)) return;
    setCancelling(b.id);
    setError(null);
    try {
      const res = await base44.functions.invoke("cancelBooking", {
        booking_id: b.id, confirm: true, balance_overdue: true,
      });
      const data = res.data || res;
      if (data.error) { setError(data.error); }
      else { load(); }
    } catch (e) {
      const data = e?.data || e;
      setError(data?.error || "Could not cancel.");
    } finally {
      setCancelling(null);
    }
  };

  return (
    <AlertSection title="Balance overdue" count={bookings.length} tone="problem">
      <p className="text-sm text-white/60 mb-4">
        These bookings are past the 7-day grace period with an unpaid balance. The deposit is retained if you cancel and release the dates.
      </p>
      {error && <p className="text-sm text-signal mb-3">{error}</p>}
      {bookings.map((b) => {
        const balanceOwed = Math.max(
          (b.gross_revenue || 0) - (b.deposit_paid || 0) - (b.balance_paid || 0), 0
        );
        return (
          <div key={b.id} className="border-t border-white/10 pt-3 mt-3 first:border-0 first:mt-0 first:pt-0">
            <div className="flex flex-wrap justify-between items-start gap-3">
              <div>
                <p className="text-white font-medium">{b.guest_name}</p>
                <p className="text-xs text-white/40 tnum">
                  Ref {b.reference} · arriving {b.arrival_date ? format(parseISO(b.arrival_date), "d MMM yyyy") : "—"} · {b.nights || 0} nights
                </p>
                <p className="text-sm text-white/60 tnum mt-1">
                  Balance owed: {gbpMoney(balanceOwed)} · deposit paid: {gbpMoney(b.deposit_paid || 0)}
                </p>
                {b.guest_email && (
                  <p className="text-xs text-white/40 mt-1">{b.guest_email}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => cancelAndRelease(b)}
                disabled={cancelling === b.id}
                className="bg-signal text-white px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity min-h-[44px] disabled:opacity-50"
              >
                {cancelling === b.id ? "Cancelling…" : "Cancel & release"}
              </button>
            </div>
          </div>
        );
      })}
    </AlertSection>
  );
}