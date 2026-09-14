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

// Full price breakdown for a stay. All nights are priced at the arrival
// season's rates (a stay belongs to one season).
export function calculatePrice(arrival, nights) {
  const season = seasonForDate(arrival);
  if (!season) return null;
  const wknd = weekendNightlyRate(season);
  const wd = season.nightly_rate;
  const groups = [];
  let nightsSubtotal = 0;
  for (let i = 0; i < nights; i++) {
    const nightDate = addDays(arrival, i);
    const type = isWeekendNight(nightDate) ? "weekend" : "weekday";
    const rate = type === "weekend" ? wknd : wd;
    nightsSubtotal += rate;
    const last = groups[groups.length - 1];
    if (last && last.type === type) {
      last.count += 1;
    } else {
      groups.push({ rate, count: 1, type });
    }
  }
  const shortBreakSupplement =
    nights < 7 ? PRICING_SETTINGS.short_break_supplement : 0;
  return {
    season,
    nights,
    groups,
    nightsSubtotal,
    shortBreakSupplement,
    accommodationSubtotal: nightsSubtotal + shortBreakSupplement,
    total: nightsSubtotal + shortBreakSupplement,
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