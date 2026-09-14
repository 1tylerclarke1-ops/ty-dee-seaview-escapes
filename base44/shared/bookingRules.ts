// Server-side mirror of the booking rules in src/lib/pricing.js.
// The platform keeps base44/ (server) and src/ (client) separate, so this
// config is duplicated — keep both copies in sync when changing stay rules.
// JS getDay: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat.

export const SEASONS = [
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
];

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

export function seasonForDate(date) {
  const t = date.getTime();
  return SEASONS.find((s) => {
    const start = new Date(s.start_date + "T00:00:00Z").getTime();
    const end = new Date(s.end_date + "T00:00:00Z").getTime();
    return t >= start && t <= end;
  }) || null;
}

export function allowedLengthsForArrival(date) {
  const season = seasonForDate(date);
  if (!season) return [];
  const override = BOOKING_RULES.season_overrides[season.name];
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