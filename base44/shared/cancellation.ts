// Server-side cancellation policy + refund engine. Pure functions, no SDK.
// Mirrored by src/lib/cancellation.js for the client — keep both in sync.
// Tiers are evaluated top-down (descending by days_before_arrival); the first
// tier whose threshold the days-remaining meets is the refund band. Anything
// below the lowest tier gets 0%. Refunds are always calculated on money
// actually received (deposit + balance paid), never on the booking total.

export const DEFAULT_CANCELLATION_POLICY = {
  tiers: [
    { days_before_arrival: 60, refund_percent: 100 },
    { days_before_arrival: 30, refund_percent: 75 },
    { days_before_arrival: 14, refund_percent: 50 },
  ],
  season_overrides: [],
  deposit_refundable: true,
  cooling_off_hours: 48,
  cooling_off_min_hours_before_arrival: 24,
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function addDaysIso(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso + "T00:00:00Z").getTime();
  const b = new Date(toIso + "T00:00:00Z").getTime();
  return Math.floor((b - a) / 86400000);
}

export function formatPolicyDate(iso: string): string {
  if (!iso) return "";
  const parts = String(iso).split("-");
  return `${parseInt(parts[2], 10)} ${MONTHS[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
}

// Coerce a stored policy record into a clean, sorted shape, falling back to
// defaults for any missing piece.
export function normalizePolicy(record: any) {
  const base = record || {};
  let tiers: any[];
  if (Array.isArray(base.tiers) && base.tiers.length) {
    tiers = base.tiers.map((t: any) => ({
      days_before_arrival: Number(t.days_before_arrival),
      refund_percent: Number(t.refund_percent),
    }));
  } else {
    tiers = DEFAULT_CANCELLATION_POLICY.tiers.map((t) => ({ ...t }));
  }
  tiers.sort((a, b) => b.days_before_arrival - a.days_before_arrival);
  const coolingOffHours = Number(base.cooling_off_hours);
  const coolingOffMin = Number(base.cooling_off_min_hours_before_arrival);
  return {
    tiers,
    season_overrides: Array.isArray(base.season_overrides) ? base.season_overrides : [],
    deposit_refundable: base.deposit_refundable !== false,
    cooling_off_hours: coolingOffHours > 0 ? coolingOffHours : 48,
    cooling_off_min_hours_before_arrival: coolingOffMin > 0 ? coolingOffMin : 24,
  };
}

const HOUR_MS = 3600000;
const DAY_MS = 86400000;
const SEVEN_DAYS_MS = 7 * DAY_MS;

// Arrival as an epoch ms. Arrival is a date-only ISO; check-in is treated as
// the start of the arrival day (00:00 UTC) — we hold no check-in time.
export function arrivalMs(arrivalIso: string): number {
  return new Date(arrivalIso + "T00:00:00Z").getTime();
}

// Cooling-off expiry (epoch ms) for a booking made at bookedAtMs. The window
// runs to bookedAt + cooling_off_hours, but is capped at arrival minus
// cooling_off_min_hours_before_arrival and never extends past arrival. The
// cap always applies; it only shortens the window when arrival is close (the
// "7-day exception"). Never before the booking time itself.
export function computeCoolingOffExpiry(bookedAtMs: number, arrivalIso: string, policy: any): number {
  const p = normalizePolicy(policy);
  const arr = arrivalMs(arrivalIso);
  const fromBooking = bookedAtMs + p.cooling_off_hours * HOUR_MS;
  const cap = arr - p.cooling_off_min_hours_before_arrival * HOUR_MS;
  let expiry = Math.min(fromBooking, cap);
  if (expiry > arr) expiry = arr;
  if (expiry < bookedAtMs) expiry = bookedAtMs;
  return expiry;
}

// Whether the "24 hours before you arrive" wording applies: the arrival cap
// (arrival - min_hours_before_arrival) is the binding deadline, i.e. it lands
// sooner than the plain bookedAt + cooling_off_hours window. Only then is it
// honest to say "until 24 hours before you arrive" — otherwise the 48-hour
// window is sooner and that is what we state.
export function coolingOffUsesArrivalCap(bookedAtMs: number, arrivalIso: string, policy: any): boolean {
  const p = normalizePolicy(policy);
  const fromBooking = bookedAtMs + p.cooling_off_hours * HOUR_MS;
  const cap = arrivalMs(arrivalIso) - p.cooling_off_min_hours_before_arrival * HOUR_MS;
  return cap <= fromBooking;
}

// Human-readable cooling-off close, in Europe/London, for the confirmation
// email: "16 September 2026 at 2:30 pm".
export function formatCoolingOffExpiry(expiryMs: number): string {
  try {
    const d = new Date(expiryMs);
    const date = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
    const time = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);
    return `${date} at ${time}`;
  } catch {
    return new Date(expiryMs).toISOString().replace("T", " ").slice(0, 16);
  }
}

// First matching tier top-down, or a 0% catch-all.
export function refundTierForDays(days: number, policy: any) {
  const p = normalizePolicy(policy);
  for (const t of p.tiers) {
    if (days >= t.days_before_arrival) return { ...t };
  }
  return { days_before_arrival: 0, refund_percent: 0 };
}

// Refund due on money actually received. If a booking context is supplied
// (bookedAtMs / coolingOffExpiresAtMs), the cooling-off window is honoured
// first: while now is on or before cooling_off_expires_at, the refund is 100%
// of totalPaid with reason "cooling_off", bypassing the tiers entirely. Without
// a booking context only the tier bands apply (backward compatible). Past
// arrival (days < 0) -> 0%.
export function computeRefund(
  arrivalIso: string,
  totalPaid: number,
  policy: any,
  todayIsoValue?: string,
  bookingCtx?: { bookedAtMs?: number; coolingOffExpiresAtMs?: number; nowMs?: number }
) {
  const today = todayIsoValue || todayIso();
  const nowMs = (bookingCtx && bookingCtx.nowMs) || Date.now();
  const paid = Math.max(0, Number(totalPaid) || 0);

  let coolingOffExpiryMs: number | null = null;
  let insideCoolingOff = false;
  if (bookingCtx && (bookingCtx.coolingOffExpiresAtMs || bookingCtx.bookedAtMs)) {
    coolingOffExpiryMs = bookingCtx.coolingOffExpiresAtMs
      ? bookingCtx.coolingOffExpiresAtMs
      : computeCoolingOffExpiry(bookingCtx.bookedAtMs, arrivalIso, policy);
    insideCoolingOff = nowMs <= coolingOffExpiryMs;
  }

  if (insideCoolingOff) {
    return {
      daysBeforeArrival: Math.max(0, daysBetween(today, arrivalIso)),
      tier: { days_before_arrival: 0, refund_percent: 100 },
      refundPercent: 100,
      totalPaid: paid,
      refundDue: paid,
      retained: 0,
      reason: "cooling_off",
      insideCoolingOff: true,
      coolingOffExpiryMs,
    };
  }

  let days = daysBetween(today, arrivalIso);
  if (days < 0) days = 0;
  const tier = refundTierForDays(days, policy);
  const pct = tier.refund_percent || 0;
  const refundDue = Math.round((pct / 100) * paid);
  return {
    daysBeforeArrival: days,
    tier,
    refundPercent: pct,
    totalPaid: paid,
    refundDue,
    retained: paid - refundDue,
    reason: "tier",
    insideCoolingOff: false,
    coolingOffExpiryMs,
  };
}

// The guest's actual cancellation boundary dates, for checkout display.
// Each band's "until" date is arrival - tier.days_before_arrival.
export function cancellationDateBands(arrivalIso: string, policy: any) {
  const p = normalizePolicy(policy);
  const bands = p.tiers.map((t) => ({
    percent: t.refund_percent,
    until: addDaysIso(arrivalIso, -t.days_before_arrival),
  }));
  bands.push({ percent: 0, until: null });
  return bands;
}

// Human-readable band labels for the Terms table, derived from the tiers.
export function tierDisplayRows(policy: any) {
  const p = normalizePolicy(policy);
  const rows = p.tiers.map((t, i) => {
    const label =
      i === 0
        ? `${t.days_before_arrival} days or more before arrival`
        : `${t.days_before_arrival} to ${p.tiers[i - 1].days_before_arrival - 1} days`;
    return { label, percent: t.refund_percent };
  });
  if (p.tiers.length) {
    const last = p.tiers[p.tiers.length - 1].days_before_arrival;
    rows.push({ label: `Fewer than ${last} days`, percent: 0 });
  }
  return rows;
}

// A compact label for the matched tier, recorded on the booking.
export function describeRefundTier(matchedTier: any, policy: any): string {
  const p = normalizePolicy(policy);
  const idx = p.tiers.findIndex(
    (t) =>
      t.days_before_arrival === matchedTier.days_before_arrival &&
      t.refund_percent === matchedTier.refund_percent
  );
  if (idx === -1) {
    const last = p.tiers.length ? p.tiers[p.tiers.length - 1].days_before_arrival : 0;
    return `0% (under ${last} days)`;
  }
  const pct = matchedTier.refund_percent;
  if (idx === 0) return `${pct}% (${matchedTier.days_before_arrival}+ days)`;
  const prev = p.tiers[idx - 1].days_before_arrival;
  return `${pct}% (${matchedTier.days_before_arrival}\u2013${prev - 1} days)`;
}

// The full canonical policy text — snapshotted onto a booking at creation so a
// later policy change never alters what a guest agreed to.
export function buildPolicyText(policy: any): string {
  const p = normalizePolicy(policy);
  const rows = tierDisplayRows(p);
  const tierLines = rows.map((r) => {
    const refund =
      r.percent === 0
        ? "no refund"
        : r.percent === 100
        ? "full refund of everything paid"
        : `${r.percent}% refund`;
    return `${r.label} \u2014 ${refund}.`;
  });
  const topDays = p.tiers.length ? p.tiers[0].days_before_arrival : 60;
  return [
    "Cancellation policy",
    "",
    "Cooling-off \u2014 cancel within " + p.cooling_off_hours + " hours of booking for a full refund of everything paid, regardless of the tiers below. If your arrival is fewer than 7 days away, this runs until " + p.cooling_off_min_hours_before_arrival + " hours before you arrive.",
    "",
    ...tierLines,
    "",
    "The refund percentage applies to the total paid at the time you cancel.",
    "Refunds are returned to the original payment method within 10 working days.",
    "",
    "Changes to your dates",
    `One date change may be requested more than ${topDays} days before arrival, subject to availability and any price difference. Inside ${topDays} days a change is treated as a cancellation under the tiers above.`,
    "",
    "Late arrival or early departure \u2014 no refund or reduction.",
    "",
    "If we cancel",
    "In the unlikely event we cannot honour your booking, you receive a full refund of everything paid. Our liability is limited to that refund.",
    "",
    "Travel insurance",
    "We strongly recommend it.",
  ].join("\n");
}