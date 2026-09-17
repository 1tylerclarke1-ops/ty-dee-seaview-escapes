import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { base44 } from "@/api/base44Client";
import { gbpMoney } from "@/lib/pricing";

// Shows bookings in an active grace period (restored after auto-cancellation).
// The grace period deadline is displayed so the owner can see which bookings
// are in it and when the final payment is due.
export default function GracePeriodAlerts() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    base44.entities.Booking
      .filter({ status: "deposit_paid" }, "-updated_date", 50)
      .then((rows) => {
        const today = new Date().toISOString().slice(0, 10);
        const filtered = (rows || []).filter(
          (b) => b.grace_period_deadline && b.grace_period_deadline >= today
        );
        setBookings(filtered);
      })
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading || !bookings.length) return null;

  return (
    <div className="border border-sea/50 bg-sea/15 p-5 mb-8">
      <h2 className="text-xl text-white mb-1">Grace period — restored bookings</h2>
      <p className="text-sm text-white/50 mb-4">
        These bookings were restored after auto-cancellation. The guest has until the grace period deadline to pay the balance before the booking is cancelled again.
      </p>
      {bookings.map((b) => {
        const deadline = b.grace_period_deadline
          ? format(parseISO(b.grace_period_deadline), "d MMM yyyy")
          : "—";
        const startedAt = b.grace_period_started_at
          ? format(parseISO(b.grace_period_started_at), "d MMM yyyy, HH:mm")
          : "—";
        const reminders = b.grace_period_reminders_sent || [];
        const balanceOwed = Math.max(
          Number(b.gross_revenue || 0) - Number(b.deposit_paid || 0) - Number(b.balance_paid || 0),
          0
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
                  Balance due: {gbpMoney(balanceOwed)} · please pay by {deadline}
                </p>
                <p className="text-xs text-white/40 tnum mt-1">
                  Grace period started {startedAt} · reminders sent: {reminders.length ? reminders.join(", ") : "none yet"}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}