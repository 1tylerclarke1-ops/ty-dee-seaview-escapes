// Client-side cancellation policy + refund engine. Pure functions mirror
// base44/shared/cancellation.ts (server-side) so the checkout, Terms page and
// admin never drift from the booking engine. Tiers are evaluated top-down;
// the first match wins. Refunds are always calculated on money received.

import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

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

export function addDaysIso(iso, n) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function daysBetween(fromIso, toIso) {
  const a = new Date(fromIso + "T00:00:00Z").getTime();
  const b = new Date(toIso + "T00:00:00Z").getTime();
  return Math.floor((b - a) / 86400000);
}

export function formatPolicyDate(iso) {
  if (!iso) return "";
  const parts = String(iso).split("-");
  return `${parseInt(parts[2], 10)} ${MONTHS[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
}

export function normalizePolicy(record) {
  const base = record || {};
  let tiers;
  if (Array.isArray(base.tiers) && base.tiers.length) {
    tiers = base.tiers.map((t) => ({
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

export function arrivalMs(arrivalIso) {
  return new Date(arrivalIso + "T00:00:00Z").getTime();
}

export function computeCoolingOffExpiry(bookedAtMs, arrivalIso, policy) {
  const p = normalizePolicy(policy);
  const arr = arrivalMs(arrivalIso);
  const fromBooking = bookedAtMs + p.cooling_off_hours * HOUR_MS;
  const cap = arr - p.cooling_off_min_hours_before_arrival * HOUR_MS;
  let expiry = Math.min(fromBooking, cap);
  if (expiry > arr) expiry = arr;
  if (expiry < bookedAtMs) expiry = bookedAtMs;
  return expiry;
}

export function coolingOffUsesArrivalCap(bookedAtMs, arrivalIso, policy) {
  const p = normalizePolicy(policy);
  const fromBooking = bookedAtMs + p.cooling_off_hours * HOUR_MS;
  const cap = arrivalMs(arrivalIso) - p.cooling_off_min_hours_before_arrival * HOUR_MS;
  return cap <= fromBooking;
}

export function formatCoolingOffExpiry(expiryMs) {
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

export function refundTierForDays(days, policy) {
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
export function computeRefund(arrivalIso, totalPaid, policy, todayIsoValue, bookingCtx) {
  const today = todayIsoValue || todayIso();
  const nowMs = (bookingCtx && bookingCtx.nowMs) || Date.now();
  const paid = Math.max(0, Number(totalPaid) || 0);

  let coolingOffExpiryMs = null;
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

export function cancellationDateBands(arrivalIso, policy) {
  const p = normalizePolicy(policy);
  const bands = p.tiers.map((t) => ({
    percent: t.refund_percent,
    until: addDaysIso(arrivalIso, -t.days_before_arrival),
  }));
  bands.push({ percent: 0, until: null });
  return bands;
}

// Checkout-facing cancellation position for a given arrival and amount. Drops
// tiers whose refund window has already passed, leads with the guest's current
// position, and returns each remaining band with its real "from" date and the
// pounds it is worth. Refunds are calculated on the amount paid.
export function cancellationDisplay(arrivalIso, total, policy, todayIsoValue) {
  const nowMs = todayIsoValue ? new Date(todayIsoValue + "T00:00:00Z").getTime() : Date.now();
  const p = normalizePolicy(policy);
  const expiryMs = computeCoolingOffExpiry(nowMs, arrivalIso, p);
  const coolingOffActive = nowMs < expiryMs;
  const sevenDayException = coolingOffUsesArrivalCap(nowMs, arrivalIso, p);
  // Tier positioning is relative to the cooling-off close, so the first band
  // starts AFTER the full-refund window — never "Cancel now: 75%" while a
  // full refund is still on the table today.
  const refIso = coolingOffActive
    ? new Date(expiryMs).toISOString().slice(0, 10)
    : (todayIsoValue || todayIso());
  let days = daysBetween(refIso, arrivalIso);
  if (days < 0) days = 0;
  const tiers = p.tiers; // sorted desc by days_before_arrival
  let currentIdx = -1;
  for (let i = 0; i < tiers.length; i++) {
    if (days >= tiers[i].days_before_arrival) {
      currentIdx = i;
      break;
    }
  }
  const inNoRefund = currentIdx === -1;
  const currentTier = inNoRefund
    ? { days_before_arrival: 0, refund_percent: 0 }
    : tiers[currentIdx];
  const pastFullRefund = currentIdx !== 0;
  const paid = Math.max(0, Number(total) || 0);
  const poundsFor = (pct) => Math.round((pct / 100) * paid);
  const bands = [];
  if (inNoRefund) {
    bands.push({
      kind: coolingOffActive ? "from" : "now",
      date: coolingOffActive ? refIso : null,
      percent: 0,
      pounds: 0,
    });
  } else {
    bands.push({
      kind: coolingOffActive ? "from" : "now",
      date: coolingOffActive ? refIso : null,
      percent: currentTier.refund_percent,
      pounds: poundsFor(currentTier.refund_percent),
    });
    for (let i = currentIdx + 1; i < tiers.length; i++) {
      const fromDate = addDaysIso(arrivalIso, -tiers[i - 1].days_before_arrival);
      bands.push({
        kind: "from",
        date: fromDate,
        percent: tiers[i].refund_percent,
        pounds: poundsFor(tiers[i].refund_percent),
      });
    }
    const lastTier = tiers[tiers.length - 1];
    bands.push({
      kind: "from",
      date: addDaysIso(arrivalIso, -lastTier.days_before_arrival),
      percent: 0,
      pounds: 0,
    });
  }
  return {
    days,
    inNoRefund,
    pastFullRefund,
    currentTier,
    bands,
    coolingOff: {
      active: coolingOffActive,
      expiryMs,
      expiryIso: new Date(expiryMs).toISOString(),
      expiryDateIso: new Date(expiryMs).toISOString().slice(0, 10),
      sevenDayException,
    },
  };
}

export function tierDisplayRows(policy) {
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

export function describeRefundTier(matchedTier, policy) {
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

export function buildPolicyText(policy) {
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

// Loads the single CancellationPolicy record (admin-editable) and merges with
// defaults so the site always has sensible values before the owner sets any.
export function useCancellationPolicy() {
  const [settings, setSettings] = useState(DEFAULT_CANCELLATION_POLICY);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    base44.entities.CancellationPolicy.list()
      .then((rows) => {
        if (!mounted || !rows || !rows.length) return;
        setSettings(normalizePolicy(rows[0]));
      })
      .catch(() => {})
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);
  return { settings, loading };
}