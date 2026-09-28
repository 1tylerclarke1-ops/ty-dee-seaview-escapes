// Canonical source of truth for stay pricing (server enforces these).
// The platform keeps base44/ (server) and src/ (client) in separate module
// trees, so src/lib/pricing.js mirrors this file. The mirror MUST match
// exactly — enforced at build/dev time by scripts/checkPricingDrift.mjs,
// which fails loudly on any mismatch. Used by the offer + gaps logic.
import { SEASONS, seasonForDate } from "./bookingRules.ts";

export { seasonForDate };

export const PRICING_SETTINGS = {
  price_rounding: 5,
  short_break_supplement: 35,
  dog_fee: 25,
  dog_fee_per_dog: true,
  max_dogs: 2,
  deposit_percentage: 25,
  balance_due_days_before_arrival: 60,
  // Net-per-night floor and cleaning cost used by the LOS discount floor check.
  // Mirrored from offers.ts (the offer floor) so there is one source of truth.
  min_net_per_night: 60,
  cleaning_cost: 80,
  // Length-of-stay discount tiers (percent). A stay earns the highest tier whose
  // threshold it meets or exceeds; under 7 nights earns nothing. Applied to the
  // accommodation subtotal after nightly rates resolve, before the dog fee.
  los_discount_7_nights: 10,
  los_discount_14_nights: 15,
  los_discount_21_nights: 20,
  los_discount_28_nights: 25,
  // Per-season LOS discount overrides. A season named here can set any subset of
  // the four tier percentages; missing tiers fall back to the defaults above.
  // Empty by default — populate it to exclude a season tier from the discount.
  los_discount_overrides: { "Peak summer": { los_discount_7_nights: 0 } },
};

export function roundTo(value, increment) {
  return Math.round(value / increment) * increment;
}

export function isWeekendNight(date) {
  const d = date.getUTCDay();
  return d === 5 || d === 6 || d === 0;
}

export function weekendNightlyRate(season) {
  return roundTo(
    season.nightly_rate * (1 + season.weekend_modifier / 100),
    PRICING_SETTINGS.price_rounding
  );
}

export function nightlyRateFor(season, date) {
  return isWeekendNight(date) ? weekendNightlyRate(season) : season.nightly_rate;
}

function addDaysUTC(d, n) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

// Balance due date — N days before arrival (UTC date).
export function balanceDueDate(arrival) {
  return addDaysUTC(arrival, -(PRICING_SETTINGS.balance_due_days_before_arrival ?? 60));
}

// Balance due date as an ISO yyyy-mm-dd string.
export function balanceDueIso(arrivalIso) {
  const d = new Date(arrivalIso + "T00:00:00Z");
  return addDaysUTC(d, -(PRICING_SETTINGS.balance_due_days_before_arrival ?? 60))
    .toISOString()
    .slice(0, 10);
}

// True when the balance due date is today or earlier: the stay is payable in
// full at booking, with no deposit/balance split.
export function isPayableInFullIso(arrivalIso, todayIsoValue) {
  const today = todayIsoValue || new Date().toISOString().slice(0, 10);
  return balanceDueIso(arrivalIso) <= today;
}

// Length-of-stay discount tier for a stay of N nights. Tiers are cumulative:
// a stay of N nights earns the highest configured tier whose threshold N
// meets or exceeds. Stays under 7 nights earn no discount.
export function losDiscountPercent(nights, seasonName) {
  const s = PRICING_SETTINGS;
  const ov = seasonName && s.los_discount_overrides ? s.los_discount_overrides[seasonName] : null;
  const pick = (key) => (ov && ov[key] != null ? ov[key] : s[key]);
  if (nights >= 28) return pick("los_discount_28_nights");
  if (nights >= 21) return pick("los_discount_21_nights");
  if (nights >= 14) return pick("los_discount_14_nights");
  if (nights >= 7) return pick("los_discount_7_nights");
  return 0;
}

export function losDiscountTierNights(nights) {
  if (nights >= 28) return 28;
  if (nights >= 21) return 21;
  if (nights >= 14) return 14;
  if (nights >= 7) return 7;
  return 0;
}

// Computes the LOS discount on the accommodation subtotal (nights + short-break
// supplement). Never breaches the min_net_per_night floor: if the full tier
// discount would push net per night (after cleaning) below the floor, the
// discount is reduced to the largest amount that still clears it — or to zero
// if the base is already at the floor. `floorLimited` is true whenever the
// applied amount is less than the requested tier amount, so admin can be told
// the discount was capped.
export function computeLosDiscount(nights, accommodationSubtotal, seasonName) {
  const pct = losDiscountPercent(nights, seasonName);
  const tierNights = losDiscountTierNights(nights);
  if (!pct || accommodationSubtotal <= 0) {
    return { amount: 0, percent: 0, tierNights: 0, floorLimited: false };
  }
  const requested = Math.round((accommodationSubtotal * pct) / 100);
  const maxDiscount = accommodationSubtotal -
    (PRICING_SETTINGS.min_net_per_night * nights + PRICING_SETTINGS.cleaning_cost);
  const amount = Math.max(0, Math.min(requested, Math.max(0, maxDiscount)));
  return { amount, percent: pct, tierNights, floorLimited: amount < requested };
}

// Full price breakdown for a stay. All nights priced at the arrival season's
// rates. The LOS discount is applied to the accommodation subtotal (nights +
// short-break supplement) before the dog fee. Dog supplement added once per
// stay (included in deposit). Mirrors src/lib/pricing.js calculatePrice exactly.
export function calculatePrice(arrival, nights, dogs = 0) {
  const season = seasonForDate(arrival);
  if (!season) return null;
  const wknd = weekendNightlyRate(season);
  const wd = season.nightly_rate;
  let nightsSubtotal = 0;
  for (let i = 0; i < nights; i++) {
    const nightDate = addDaysUTC(arrival, i);
    nightsSubtotal += isWeekendNight(nightDate) ? wknd : wd;
  }
  const shortBreakSupplement = nights < 7 ? PRICING_SETTINGS.short_break_supplement : 0;
  const accommodationSubtotal = nightsSubtotal + shortBreakSupplement;
  const los = computeLosDiscount(nights, accommodationSubtotal, season.name);
  const dogCount = Math.min(dogs || 0, PRICING_SETTINGS.max_dogs);
  const dogFee = dogCount
    ? PRICING_SETTINGS.dog_fee_per_dog
      ? PRICING_SETTINGS.dog_fee * dogCount
      : PRICING_SETTINGS.dog_fee
    : 0;
  const total = accommodationSubtotal - los.amount + dogFee;
  // Deposit rounds UP (ceil), never down — £82.50 → £83.
  const deposit = Math.ceil((total * PRICING_SETTINGS.deposit_percentage) / 100);
  const balance = total - deposit;
  return {
    season,
    nights,
    nightsSubtotal,
    shortBreakSupplement,
    accommodationSubtotal,
    losDiscount: los.amount,
    losDiscountPercent: los.percent,
    losDiscountTierNights: los.tierNights,
    losDiscountFloorLimited: los.floorLimited,
    dogFee,
    total,
    deposit,
    balance,
    weekendNightly: wknd,
    weekdayNightly: wd,
  };
}

export const gbp = (n) => `£${Math.round(n).toLocaleString("en-GB")}`;
export const gbpMoney = (n) =>
  n.toLocaleString("en-GB", { style: "currency", currency: "GBP" });

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatLong(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00Z");
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function formatShort(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00Z");
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}