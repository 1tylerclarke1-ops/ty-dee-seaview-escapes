// Gaps view computation — unsold bookable stays in the next N days, plus
// orphan gaps (runs of 1, 2, 5 or 6 nights between bookings that no standard
// stay length can fill). Server-side, used by getGapsView and the weekly job.
import { seasonForDate, allowedLengthsForArrival } from "./bookingRules.ts";
import { calculatePrice } from "./pricing.ts";
import { ladderRung, suggestOffer, isProtectedSeason, CLEANING_COST } from "./offers.ts";

function parseD(s) { return new Date(s + "T00:00:00Z"); }
function iso(d) { return d.toISOString().slice(0, 10); }
function addDays(d, n) { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x; }
function daysBetween(a, b) { return Math.round((b.getTime() - a.getTime()) / 86400000); }

// A booking occupies [arrival, arrival+nights). Active = not cancelled.
function staysOverlap(arrival, nights, bookings) {
  const start = arrival.getTime();
  const end = addDays(arrival, nights).getTime();
  return bookings.some((b) => {
    if (!b.arrival_date || !b.nights) return false;
    const bs = parseD(b.arrival_date).getTime();
    const be = addDays(parseD(b.arrival_date), b.nights).getTime();
    return start < be && bs < end;
  });
}

// Every unsold bookable stay in the next `days` days from todayIso.
export function computeUnsoldStays(bookings, todayIso, days) {
  const today = parseD(todayIso);
  const windowEnd = addDays(today, days);
  const out = [];
  for (let d = new Date(today); d <= windowEnd; d = addDays(d, 1)) {
    const season = seasonForDate(d);
    if (!season) continue;
    const allowed = allowedLengthsForArrival(d);
    if (!allowed.length) continue;
    for (const n of allowed) {
      const dep = addDays(d, n);
      if (staysOverlap(d, n, bookings)) continue;
      const price = calculatePrice(d, n, 0);
      if (!price) continue;
      const dtoa = daysBetween(today, d);
      const suggested = suggestOffer(dtoa, season.name);
      out.push({
        arrival_date: iso(d),
        departure_date: iso(dep),
        nights: n,
        season: season.name,
        current_price: price.total,
        net_per_night: (price.total - CLEANING_COST) / n,
        days_to_arrival: dtoa,
        protected: isProtectedSeason(season.name),
        rung: ladderRung(dtoa)?.rung || null,
        rung_label: ladderRung(dtoa)?.label || null,
        offer_eligible: !!suggested,
        suggested_type: suggested?.type || null,
        suggested_visibility: suggested?.visibility || null,
        suggested_max: suggested?.max || null,
      });
    }
  }
  return out;
}

// Orphan gaps — runs of 1, 2, 5 or 6 nights between active bookings within the
// window. These cannot be sold as a standard stay length and are only sold by
// the owner, by hand.
const ORPHAN_LENGTHS = [1, 2, 5, 6];

export function computeOrphanGaps(bookings, todayIso, days) {
  const today = parseD(todayIso);
  const windowEnd = addDays(today, days);
  const spans = (bookings || [])
    .filter((b) => b.arrival_date && b.nights && b.status !== "cancelled")
    .map((b) => ({
      name: b.guest_name || "—",
      arrival: parseD(b.arrival_date),
      departure: addDays(parseD(b.arrival_date), b.nights),
    }))
    .filter((s) => s.departure > today)
    .sort((a, b) => a.arrival.getTime() - b.arrival.getTime());

  const out = [];
  // gap before the first booking (from today)
  if (spans.length && spans[0].arrival > today) {
    const n = daysBetween(today, spans[0].arrival);
    if (ORPHAN_LENGTHS.includes(n)) {
      out.push({ start_date: iso(today), nights: n, before: "—", after: spans[0].name });
    }
  }
  for (let i = 0; i < spans.length - 1; i++) {
    const a = spans[i];
    const b = spans[i + 1];
    const start = a.departure;
    if (start > windowEnd) break;
    const n = daysBetween(start, b.arrival);
    if (n > 0 && ORPHAN_LENGTHS.includes(n)) {
      out.push({ start_date: iso(start), nights: n, before: a.name, after: b.name });
    }
  }
  return out;
}

export function computeGaps(bookings, todayIso, days) {
  return {
    unsold: computeUnsoldStays(bookings, todayIso, days),
    orphans: computeOrphanGaps(bookings, todayIso, days),
  };
}