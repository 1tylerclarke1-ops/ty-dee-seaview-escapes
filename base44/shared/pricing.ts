// Server-side pricing mirror of src/lib/pricing.js. The platform keeps
// base44/ (server) and src/ (client) separate, so this is duplicated — keep
// both in sync when changing rates or rules. Used by the offer + gaps logic.
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

// Full price breakdown for a stay. All nights priced at the arrival season's
// rates. Dog supplement added once per stay (included in deposit). Mirrors
// src/lib/pricing.js calculatePrice exactly.
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
  const dogCount = Math.min(dogs || 0, PRICING_SETTINGS.max_dogs);
  const dogFee = dogCount
    ? PRICING_SETTINGS.dog_fee_per_dog
      ? PRICING_SETTINGS.dog_fee * dogCount
      : PRICING_SETTINGS.dog_fee
    : 0;
  const total = nightsSubtotal + shortBreakSupplement + dogFee;
  const deposit = Math.round((total * PRICING_SETTINGS.deposit_percentage) / 100);
  const balance = total - deposit;
  return {
    season,
    nights,
    nightsSubtotal,
    shortBreakSupplement,
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