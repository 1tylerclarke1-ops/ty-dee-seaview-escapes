import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { parseISO, isWithinInterval } from "date-fns";
import { PITCH_FEE_SETTINGS } from "@/lib/pitchFeeConfig";
import { SEASON_END } from "@/lib/pricing";

// Compact, one-line context for the Today tab — not a task, just where the
// pitch fee stands. A single progress line: "£X of £Y · Z%" with a thin bar.
// The full breakdown lives on the Settings tab (PitchFeeTracker).
const gbp = (n) => `£${Math.round(n).toLocaleString("en-GB")}`;

export default function PitchFeeLine() {
  const [bookings, setBookings] = useState(null);

  useEffect(() => {
    base44.entities.Booking
      .list("-created_date", 500)
      .then(setBookings)
      .catch(() => setBookings([]));
  }, []);

  if (!bookings) return null;

  const periodStart = parseISO(PITCH_FEE_SETTINGS.target_period_start);
  const periodEnd = parseISO(SEASON_END);
  const target = PITCH_FEE_SETTINGS.annual_target;
  const inPeriod = (b) =>
    b.arrival_date && isWithinInterval(parseISO(b.arrival_date), { start: periodStart, end: periodEnd });

  const revenue = bookings.filter(
    (b) => (b.status === "deposit_paid" || b.status === "confirmed") && inPeriod(b)
  );
  const cancelled = bookings.filter((b) => b.status === "cancelled" && inPeriod(b));
  const gross = revenue.reduce((s, b) => s + (b.gross_revenue || 0), 0);
  const cleaning = revenue.length * PITCH_FEE_SETTINGS.cleaning_cost;
  const stripeFees = revenue.reduce((s, b) => s + (b.stripe_fee || 0), 0);
  const retained = cancelled.reduce((s, b) => s + (b.deposit_retained || 0), 0);
  const bookedNet = gross - cleaning - stripeFees + retained;
  const pct = target > 0 ? Math.min(100, (bookedNet / target) * 100) : 0;

  return (
    <div className="mb-6">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs text-white/50">Pitch fee tracker</span>
        <span className="text-xs tnum text-white/70">
          {gbp(bookedNet)} of {gbp(target)} · {Math.round(pct)}%
        </span>
      </div>
      <div className="h-1.5 bg-white/10 w-full">
        <div className="h-full bg-sea" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}