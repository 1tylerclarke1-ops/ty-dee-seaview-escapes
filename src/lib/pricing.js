// Single source of truth for all stay pricing.
// Seasons are contiguous, non-overlapping, covering 2026-10-05 -> 2027-10-21.
// Weekend = Friday, Saturday, Sunday (JS getDay 5, 6, 0).
// weekend nightly = nightly_rate * (1 + weekend_modifier/100), rounded to price_rounding.
// short_break_supplement is added once to any stay under 7 nights.
import {
  addDays,
  addMonths,
  format,
  isAfter,
  isBefore,
  isEqual,
  parseISO,
} from "date-fns";

export const PRICING_SETTINGS = {
  price_rounding: 5,
  short_break_supplement: 35,
  booking_window_months: 14,
  dog_fee: 25,
  dog_fee_per_dog: true,
  max_dogs: 2,
  damage_waiver: 25,
  deposit_percentage: 25,
  balance_due_days_before_arrival: 60,
  seasons: [
    { name: "Autumn",             start_date: "2026-10-05", end_date: "2026-10-22", nightly_rate:  80, weekend_modifier: 19 },
    { name: "October half-term",   start_date: "2026-10-23", end_date: "2026-11-02", nightly_rate:  95, weekend_modifier: 16 },
    { name: "Late autumn",         start_date: "2026-11-03", end_date: "2026-12-17", nightly_rate:  70, weekend_modifier: 28 },
    { name: "Christmas",           start_date: "2026-12-18", end_date: "2026-12-27", nightly_rate: 105, weekend_modifier: 19 },
    { name: "New Year",            start_date: "2026-12-28", end_date: "2027-01-03", nightly_rate: 110, weekend_modifier: 18 },
    { name: "Winter",              start_date: "2027-01-04", end_date: "2027-02-12", nightly_rate:  75, weekend_modifier: 20 },
    { name: "February half-term",  start_date: "2027-02-13", end_date: "2027-02-22", nightly_rate:  90, weekend_modifier: 22 },
    { name: "Early spring",        start_date: "2027-02-23", end_date: "2027-03-25", nightly_rate:  70, weekend_modifier: 28 },
    { name: "Easter",              start_date: "2027-03-26", end_date: "2027-04-06", nightly_rate:  95, weekend_modifier: 21 },
    { name: "Spring",              start_date: "2027-04-07", end_date: "2027-04-27", nightly_rate:  80, weekend_modifier: 13 },
    { name: "Late spring",         start_date: "2027-04-28", end_date: "2027-05-28", nightly_rate:  90, weekend_modifier: 22 },
    { name: "Spring half-term",    start_date: "2027-05-29", end_date: "2027-06-06", nightly_rate: 110, weekend_modifier: 18 },
    { name: "Early summer",        start_date: "2027-06-07", end_date: "2027-07-02", nightly_rate: 100, weekend_modifier: 20 },
    { name: "High summer",         start_date: "2027-07-03", end_date: "2027-07-22", nightly_rate: 115, weekend_modifier: 22 },
    { name: "Peak summer",         start_date: "2027-07-23", end_date: "2027-08-31", nightly_rate: 140, weekend_modifier: 21 },
    { name: "September",           start_date: "2027-09-01", end_date: "2027-09-30", nightly_rate: 100, weekend_modifier: 25 },
    { name: "Early autumn",        start_date: "2027-10-01", end_date: "2027-10-21", nightly_rate:  80, weekend_modifier: 19 },
  ],
};

export const SEASON_START = PRICING_SETTINGS.seasons[0].start_date;
export const SEASON_END =
  PRICING_SETTINGS.seasons[PRICING_SETTINGS.seasons.length - 1].end_date;

// Cash rounding — round to the nearest increment (half up).
export function roundTo(value, increment) {
  return Math.round(value / increment) * increment;
}

// Friday(5), Saturday(6), Sunday(0) are weekend nights.
export function isWeekendNight(date) {
  const d = date.getDay();
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

export function seasonForDate(date) {
  return (
    PRICING_SETTINGS.seasons.find((s) => {
      const start = parseISO(s.start_date);
      const end = parseISO(s.end_date);
      return (
        (isEqual(date, start) || isAfter(date, start)) &&
        (isEqual(date, end) || isBefore(date, end))
      );
    }) || null
  );
}

// A booking may be made up to booking_window_months ahead of today.
export function isWithinBookingWindow(date) {
  const now = new Date();
  const windowEnd = addMonths(now, PRICING_SETTINGS.booking_window_months);
  return isBefore(date, windowEnd) || isEqual(date, windowEnd);
}

// Dog supplement — charged once per stay (per dog when dog_fee_per_dog is
// true, flat otherwise). Capped at max_dogs.
export function calcDogFee(dogs) {
  const count = Math.min(dogs || 0, PRICING_SETTINGS.max_dogs);
  if (!count) return 0;
  return PRICING_SETTINGS.dog_fee_per_dog
    ? PRICING_SETTINGS.dog_fee * count
    : PRICING_SETTINGS.dog_fee;
}

// Balance due date — N days before arrival.
export function balanceDueDate(arrival) {
  return addDays(arrival, -(PRICING_SETTINGS.balance_due_days_before_arrival ?? 60));
}

// True when the balance due date is today or earlier: the stay is payable in
// full at booking, with no deposit/balance split.
export function isPayableInFull(arrival, today = new Date()) {
  const due = balanceDueDate(arrival);
  const t = new Date(today);
  return isEqual(due, t) || isBefore(due, t);
}

// Full price breakdown for a stay. All nights are priced at the arrival
// season's rates (a stay belongs to one season). The dog supplement is added
// once per stay and included in the deposit.
export function calculatePrice(arrival, nights, dogs = 0) {
  const season = seasonForDate(arrival);
  if (!season) return null;
  const wknd = weekendNightlyRate(season);
  const wd = season.nightly_rate;
  let weekendCount = 0;
  let weekdayCount = 0;
  let nightsSubtotal = 0;
  for (let i = 0; i < nights; i++) {
    const nightDate = addDays(arrival, i);
    if (isWeekendNight(nightDate)) {
      weekendCount += 1;
      nightsSubtotal += wknd;
    } else {
      weekdayCount += 1;
      nightsSubtotal += wd;
    }
  }
  const groups = [];
  if (weekendCount) groups.push({ rate: wknd, count: weekendCount, type: "weekend" });
  if (weekdayCount) groups.push({ rate: wd, count: weekdayCount, type: "weekday" });
  const shortBreakSupplement =
    nights < 7 ? PRICING_SETTINGS.short_break_supplement : 0;
  const dogFee = calcDogFee(dogs);
  const damageWaiver = PRICING_SETTINGS.damage_waiver || 0;
  const total = nightsSubtotal + shortBreakSupplement + dogFee + damageWaiver;
  // Deposit rounds UP (ceil), never down — £82.50 → £83.
  const deposit = Math.ceil(
    (total * (PRICING_SETTINGS.deposit_percentage ?? 25)) / 100
  );
  const balance = total - deposit;
  return {
    season,
    nights,
    groups,
    nightsSubtotal,
    shortBreakSupplement,
    dogFee,
    damageWaiver,
    dogs: Math.min(dogs || 0, PRICING_SETTINGS.max_dogs),
    accommodationSubtotal: nightsSubtotal + shortBreakSupplement,
    total,
    deposit,
    balance,
    weekendNightly: wknd,
    weekdayNightly: wd,
  };
}

// First date within a season falling on a given JS day-of-week (0=Sun..6=Sat).
export function firstArrivalInSeason(season, dayOfWeek) {
  let d = parseISO(season.start_date);
  const end = parseISO(season.end_date);
  while (d.getDay() !== dayOfWeek && isBefore(d, end)) {
    d = addDays(d, 1);
  }
  if (d.getDay() !== dayOfWeek) return null;
  return d;
}

// Format a number as pounds sterling, e.g. £1,070.
export const gbp = (n) => `£${n.toLocaleString("en-GB")}`;

// Format with pence, e.g. £70.00 — for the itemised breakdown.
export const gbpMoney = (n) =>
  n.toLocaleString("en-GB", { style: "currency", currency: "GBP" });

// ── Booking rules ─────────────────────────────────────────────────────────
// Data-driven stay lengths per arrival day. rule_type "fixed_or_multiples"
// means: a day's allowed lengths = its fixed lengths, unioned with multiples
// of each value in multiple_of, up to max_length. A season may override both
// the allowed lengths and the arrival days. No stay length or weekday is
// hard-coded in the logic below — only in this config.
// JS getDay: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat.
export const BOOKING_RULES = {
  rule_type: "fixed_or_multiples",
  multiple_of: [7],
  max_length: 28,
  by_arrival_day: {
    1: { fixed: [4] },
    5: { fixed: [3] },
    6: { fixed: [] },
  },
  season_overrides: {
    "Peak summer": { allowed_lengths: [7, 14, 21, 28], arrival_days: [1, 5, 6] },
  },
};

function multiplesUpToMax(multipleOf, maxLength) {
  const out = [];
  for (const base of multipleOf) {
    for (let n = base; n <= maxLength; n += base) {
      if (!out.includes(n)) out.push(n);
    }
  }
  return out.sort((a, b) => a - b);
}

export function seasonOverrideForDate(date) {
  const season = seasonForDate(date);
  if (!season) return null;
  return BOOKING_RULES.season_overrides?.[season.name] || null;
}

export function allowedLengthsForArrival(date) {
  const season = seasonForDate(date);
  if (!season) return [];
  const override = BOOKING_RULES.season_overrides?.[season.name];
  if (override) {
    if (!override.arrival_days.includes(date.getDay())) return [];
    return [...override.allowed_lengths].sort((a, b) => a - b);
  }
  const dayRule = BOOKING_RULES.by_arrival_day[date.getDay()];
  if (!dayRule) return [];
  const combined = [
    ...dayRule.fixed,
    ...multiplesUpToMax(BOOKING_RULES.multiple_of, BOOKING_RULES.max_length),
  ];
  return [...new Set(combined)].sort((a, b) => a - b);
}

export function isArrivalDay(date) {
  if (!isWithinBookingWindow(date)) return false;
  return allowedLengthsForArrival(date).length > 0;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatDayList(days) {
  const names = [...days].sort((a, b) => a - b).map((d) => DAY_NAMES[d]);
  if (names.length <= 1) return names.join("");
  return names.slice(0, -1).join(", ") + " or " + names[names.length - 1];
}

// Price for a given length in a season, or null if that length is not
// bookable in the season. Reads the booking rules + pricing engine directly
// so the rate card can never drift from the booking engine.
export function seasonPriceForLength(season, length) {
  const override = BOOKING_RULES.season_overrides?.[season.name];
  const arrivalDays = override
    ? override.arrival_days
    : Object.keys(BOOKING_RULES.by_arrival_day).map(Number);
  for (const day of arrivalDays) {
    const rep = firstArrivalInSeason(season, day);
    if (!rep) continue;
    if (allowedLengthsForArrival(rep).includes(length)) {
      return calculatePrice(rep, length)?.total ?? null;
    }
  }
  return null;
}

// A human note for any season whose stay options are restricted (overridden),
// e.g. "Peak summer — weekly stays only, arriving Monday, Friday or Saturday."
export function seasonRestrictionNote(season) {
  const override = BOOKING_RULES.season_overrides?.[season.name];
  if (!override) return null;
  const allWeekly = override.allowed_lengths.every((l) => l % 7 === 0);
  const lengthDesc = allWeekly
    ? "weekly stays only"
    : `${override.allowed_lengths.join(", ")}-night stays only`;
  return `${season.name} — ${lengthDesc}, arriving ${formatDayList(override.arrival_days)}.`;
}

// Validate that seasons are contiguous and non-overlapping.
export function validateSeasons() {
  const seasons = [...PRICING_SETTINGS.seasons].sort((a, b) =>
    a.start_date.localeCompare(b.start_date)
  );
  const overlaps = [];
  const gaps = [];
  for (let i = 0; i < seasons.length - 1; i++) {
    const a = seasons[i];
    const b = seasons[i + 1];
    const aEnd = parseISO(a.end_date);
    const bStart = parseISO(b.start_date);
    if (isBefore(bStart, aEnd) || isEqual(bStart, aEnd)) {
      overlaps.push({ a: a.name, b: b.name });
    }
    const expectedNext = addDays(aEnd, 1);
    if (isAfter(bStart, expectedNext)) {
      gaps.push({
        after: a.name,
        before: b.name,
        from: format(expectedNext, "yyyy-MM-dd"),
        to: format(addDays(bStart, -1), "yyyy-MM-dd"),
      });
    }
  }
  return { overlaps, gaps };
}

if (typeof console !== "undefined") {
  const { overlaps, gaps } = validateSeasons();
  if (overlaps.length || gaps.length) {
    console.error("[pricing] Season validation failed:", { overlaps, gaps });
  }
}