import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  parseISO,
  isWithinInterval,
  eachDayOfInterval,
  eachMonthOfInterval,
  startOfMonth,
  endOfMonth,
  format,
} from "date-fns";
import { weekendNightlyRate, seasonForDate, SEASON_END } from "@/lib/pricing";
import { PITCH_FEE_SETTINGS } from "@/lib/pitchFeeConfig";

const gbp = (n) => `£${Math.round(n).toLocaleString("en-GB")}`;

export default function PitchFeeTracker() {
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    base44.entities.Booking.list("-created_date", 500)
      .then(setBookings)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-signal">Could not load bookings: {error}</p>;
  if (!bookings) return <p className="text-white/50">Loading tracker…</p>;

  const periodStart = parseISO(PITCH_FEE_SETTINGS.target_period_start);
  const periodEnd = parseISO(SEASON_END);
  const cleaningCost = PITCH_FEE_SETTINGS.cleaning_cost;
  const target = PITCH_FEE_SETTINGS.annual_target;

  const inPeriod = (b) => {
    if (!b.arrival_date) return false;
    const d = parseISO(b.arrival_date);
    return isWithinInterval(d, { start: periodStart, end: periodEnd });
  };

  // Only deposit_paid or confirmed count as revenue. Enquiries, holds and
  // expired holds are ignored. Cancelled bookings are excluded from revenue;
  // any deposit retained on a cancellation is shown as its own line.
  const revenueBookings = bookings.filter(
    (b) => (b.status === "deposit_paid" || b.status === "confirmed") && inPeriod(b)
  );
  const cancelled = bookings.filter((b) => b.status === "cancelled" && inPeriod(b));

  const gross = revenueBookings.reduce((s, b) => s + (b.gross_revenue || 0), 0);
  // Cleaning is charged once per booking, not per week.
  const cleaning = revenueBookings.length * cleaningCost;
  // Stripe processing fees — stored on each booking at payment time.
  const stripeFees = revenueBookings.reduce((s, b) => s + (b.stripe_fee || 0), 0);
  const net = gross - cleaning - stripeFees;
  const depositsRetained = cancelled.reduce((s, b) => s + (b.deposit_retained || 0), 0);
  const bookedNet = net + depositsRetained;
  const netPct = target > 0 ? Math.min(100, (bookedNet / target) * 100) : 0;
  const bookedShortfall = Math.max(0, target - bookedNet);

  const allPeriodDays = eachDayOfInterval({ start: periodStart, end: periodEnd });
  const nightsAvailable = allPeriodDays.length;
  const nightsBooked = revenueBookings.reduce((s, b) => s + (b.nights || 0), 0);
  const occupancyPct = nightsAvailable > 0 ? (nightsBooked / nightsAvailable) * 100 : 0;

  // Monthly breakdown. A month with revenue bookings reports actuals; a
  // month with none is projected from the rate card and the per-season
  // occupancy assumption. Booked and projected are never blended.
  const months = eachMonthOfInterval({
    start: startOfMonth(periodStart),
    end: startOfMonth(periodEnd),
  });

  const monthly = months.map((m) => {
    const mStart = startOfMonth(m);
    const mEnd = endOfMonth(m);
    const inMonth = (b) => {
      if (!b.arrival_date) return false;
      return isWithinInterval(parseISO(b.arrival_date), { start: mStart, end: mEnd });
    };
    const mRevenue = revenueBookings.filter(inMonth);
    const daysInSeason = allPeriodDays.filter(
      (d) => isWithinInterval(d, { start: mStart, end: mEnd }) && seasonForDate(d)
    );

    if (mRevenue.length > 0) {
      const mGross = mRevenue.reduce((s, b) => s + (b.gross_revenue || 0), 0);
      const mCleaning = mRevenue.length * cleaningCost;
      const mFees = mRevenue.reduce((s, b) => s + (b.stripe_fee || 0), 0);
      const mRetained = cancelled.filter(inMonth).reduce((s, b) => s + (b.deposit_retained || 0), 0);
      const mNights = mRevenue.reduce((s, b) => s + (b.nights || 0), 0);
      return {
        month: m,
        status: "booked",
        gross: mGross,
        cleaning: mCleaning,
        net: mGross - mCleaning - mFees + mRetained,
        nights: mNights,
        bookings: mRevenue.length,
        capacity: daysInSeason.length,
      };
    }

    // Projected: per-day occupancy × blended nightly rate for the day's season.
    let projNights = 0;
    let projGross = 0;
    for (const d of daysInSeason) {
      const season = seasonForDate(d);
      const occ = PITCH_FEE_SETTINGS.occupancy_by_season?.[season.name] || 0;
      const wknd = weekendNightlyRate(season);
      const blended = (4 * season.nightly_rate + 3 * wknd) / 7;
      projNights += occ;
      projGross += occ * blended;
    }
    const projBookings = projNights / 7;
    const projCleaning = projBookings * cleaningCost;
    return {
      month: m,
      status: "projected",
      gross: projGross,
      cleaning: projCleaning,
      net: projGross - projCleaning,
      nights: projNights,
      bookings: projBookings,
      capacity: daysInSeason.length,
    };
  });

  const projectedNet = monthly
    .filter((m) => m.status === "projected")
    .reduce((s, m) => s + m.net, 0);
  const outlookNet = bookedNet + projectedNet;
  const outlookShortfall = Math.max(0, target - outlookNet);
  const alert = outlookShortfall > 0;
  const unsoldMonths = monthly
    .filter((m) => m.status === "projected")
    .sort((a, b) => b.capacity - a.capacity)
    .slice(0, 3);

  return (
    <div className="space-y-10">
      <div>
        <p className="text-sm text-white/50">{PITCH_FEE_SETTINGS.target_label} target</p>
        <p className="text-4xl text-white mt-1 tnum">{gbp(target)}</p>
        <p className="text-xs text-white/40 mt-1 tnum">
          Period {format(periodStart, "d MMM yyyy")} → {format(periodEnd, "d MMM yyyy")}
        </p>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-sm text-white/70">Booked net contribution</span>
          <span className="text-sm text-white tnum">
            {gbp(bookedNet)} · {Math.round(netPct)}%
          </span>
        </div>
        <div className="h-3 bg-white/10 w-full">
          <div className="h-full bg-sea" style={{ width: `${netPct}%` }} />
        </div>
        <p className="text-xs text-white/40 mt-2 tnum">
          {bookedShortfall > 0
            ? `${gbp(bookedShortfall)} still to cover from booked stays`
            : "Target covered by booked stays"}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Gross booked" value={gbp(gross)} />
        <Stat label="Cleaning" value={`−${gbp(cleaning)}`} />
        <Stat label="Stripe fees" value={`−${gbp(stripeFees)}`} />
        <Stat label="Net (booked)" value={gbp(net)} />
        <Stat label="Deposits retained" value={gbp(depositsRetained)} />
        <Stat label="Nights booked" value={`${nightsBooked} / ${nightsAvailable}`} />
        <Stat label="Occupancy" value={`${Math.round(occupancyPct)}%`} />
        <Stat label="Bookings taken" value={`${revenueBookings.length}`} />
        <Stat label="Shortfall (booked)" value={gbp(bookedShortfall)} />
      </div>

      <div className="border border-white/10 p-5">
        <p className="text-sm text-white/70">Full-year outlook</p>
        <div className="mt-3 flex flex-wrap gap-6">
          <div>
            <p className="text-xs text-white/40">Booked net</p>
            <p className="text-2xl text-white tnum">{gbp(bookedNet)}</p>
          </div>
          <div>
            <p className="text-xs text-white/40">Projected net (remaining months)</p>
            <p className="text-2xl text-white/70 tnum">{gbp(projectedNet)}</p>
          </div>
          <div>
            <p className="text-xs text-white/40">Outlook (booked + projected)</p>
            <p className="text-2xl text-white tnum">{gbp(outlookNet)}</p>
          </div>
        </div>
        {alert && (
          <div className="mt-5 bg-signal/20 border border-signal/40 p-4">
            <p className="text-xs tracking-wide uppercase text-signal">Shortfall warning</p>
            <p className="mt-2 text-sm text-white/90">
              Projected net of {gbp(outlookNet)} falls {gbp(outlookShortfall)} short of the {gbp(target)} target.
              Most unsold capacity: {unsoldMonths.map((m) => format(m.month, "MMM yyyy")).join(", ")}.
            </p>
          </div>
        )}
      </div>

      <div>
        <p className="text-sm text-white/70 mb-4">Monthly breakdown</p>
        <div className="border-t border-white/10">
          <div className="grid grid-cols-12 py-2 border-b border-white/10 text-[0.7rem] tracking-wide uppercase text-white/40">
            <div className="col-span-3">Month</div>
            <div className="col-span-2 text-right">Gross</div>
            <div className="col-span-2 text-right">Cleaning</div>
            <div className="col-span-2 text-right">Net</div>
            <div className="col-span-2 text-right">Nights</div>
            <div className="col-span-1 text-right">Type</div>
          </div>
          {monthly.map((m, i) => (
            <div key={i} className="grid grid-cols-12 py-3 border-b border-white/10 items-baseline tnum text-sm">
              <div className="col-span-3 text-white">{format(m.month, "MMM yyyy")}</div>
              <div className="col-span-2 text-right text-white/80">{gbp(m.gross)}</div>
              <div className="col-span-2 text-right text-white/50">−{gbp(m.cleaning)}</div>
              <div className="col-span-2 text-right text-white">{gbp(m.net)}</div>
              <div className="col-span-2 text-right text-white/70">{Math.round(m.nights)}</div>
              <div className="col-span-1 text-right">
                <span className={m.status === "booked" ? "text-sea" : "text-white/40"}>
                  {m.status === "booked" ? "booked" : "proj"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="border border-white/10 p-4">
      <p className="text-xs text-white/40">{label}</p>
      <p className="text-xl text-white mt-1 tnum">{value}</p>
    </div>
  );
}