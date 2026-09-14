// Offer ladder + hard floor. Value before money. Server-side, used by
// createOffer, sendOfferEmail and the weekly gaps job. The site never shows
// a discount schedule — offers are one-off, private by default, and framed
// as late availability rather than "last minute discount".

export const CLEANING_COST = 80;
export const MIN_NET_PER_NIGHT = 60;

// Seasons never auto-discounted. The ladder never suggests an offer for these;
// the gaps view marks them "protected" and disables the one-click button.
export const PROTECTED_SEASONS = [
  "Peak summer",
  "High summer",
  "Christmas",
  "New Year",
  "October half-term",
  "February half-term",
  "Spring half-term",
  "Easter",
];

export const OFFER_TYPES = [
  "extra_night",
  "free_dog",
  "late_checkout",
  "percentage",
  "fixed_amount",
];

// Default ladder by days to arrival, evaluated top-down (first match wins).
// 21–15 days: monitoring only, no offer.
// 14–8 days: value offer (extra night or free dog).
// 7–4 days: private percentage, max 15%.
// under 4:  public percentage, max 20%.
const LADDER = [
  { min: 15, max: 21, rung: "monitor", label: "21–15 days · monitoring, no offer", types: [] },
  { min: 8, max: 14, rung: "value", label: "14–8 days · extra night or free dog", types: ["extra_night", "free_dog"], visibility: "private" },
  { min: 4, max: 7, rung: "private_percentage", label: "7–4 days · private %, max 15", types: ["percentage"], max: 15, visibility: "private" },
  { min: 0, max: 3, rung: "public_percentage", label: "Under 4 days · public %, max 20", types: ["percentage"], max: 20, visibility: "public" },
];

export function ladderRung(daysToArrival) {
  const d = Math.max(0, Math.floor(daysToArrival));
  return LADDER.find((r) => d >= r.min && d <= r.max) || null;
}

export function isProtectedSeason(seasonName) {
  return PROTECTED_SEASONS.includes(seasonName);
}

// Net per night after cleaning.
export function netPerNight(total, nights) {
  if (!nights || nights <= 0) return 0;
  return (total - CLEANING_COST) / nights;
}

// Evaluate an offer against the floor. For monetary offers (percentage /
// fixed_amount) the discount is reduced until net per night clears the floor,
// or to zero (allowed=false). Value offers (extra_night / free_dog /
// late_checkout) cost little or no real money, so they bypass the floor.
export function evaluateOffer(type, value, basePrice, nights) {
  if (type === "percentage") {
    const cap = Math.max(0, Math.min(value, 100));
    let best = 0;
    for (let p = cap; p >= 1; p--) {
      const discount = Math.round((basePrice * p) / 100);
      if (netPerNight(basePrice - discount, nights) >= MIN_NET_PER_NIGHT) {
        best = p;
        break;
      }
    }
    const discount = Math.round((basePrice * best) / 100);
    return {
      type, value: best, discount,
      netPerNight: netPerNight(basePrice - discount, nights),
      passesFloor: best > 0, allowed: best > 0, adjusted: best !== cap,
    };
  }
  if (type === "fixed_amount") {
    const cap = Math.max(0, Math.min(value, basePrice));
    let best = 0;
    for (let v = cap; v >= 1; v--) {
      if (netPerNight(basePrice - v, nights) >= MIN_NET_PER_NIGHT) {
        best = v;
        break;
      }
    }
    return {
      type, value: best, discount: best,
      netPerNight: netPerNight(basePrice - best, nights),
      passesFloor: best > 0, allowed: best > 0, adjusted: best !== cap,
    };
  }
  // value offers — no monetary discount, floor not applicable.
  return {
    type, value: value ?? null, discount: 0,
    netPerNight: netPerNight(basePrice, nights),
    passesFloor: true, allowed: true, adjusted: false,
  };
}

// Suggested offer for a stay. Null for monitor/protected rungs.
export function suggestOffer(daysToArrival, seasonName) {
  if (isProtectedSeason(seasonName)) return null;
  const rung = ladderRung(daysToArrival);
  if (!rung || !rung.types.length) return null;
  return {
    rung: rung.rung,
    label: rung.label,
    type: rung.types[0],
    visibility: rung.visibility || "private",
    max: rung.max || null,
  };
}

export function describeOffer(type, value) {
  switch (type) {
    case "extra_night": return "Stay an extra night on us";
    case "free_dog": return "Your dog stays free";
    case "late_checkout": return "Late checkout at no extra cost";
    case "percentage": return `${value}% off this stay`;
    case "fixed_amount": return `£${value} off this stay`;
    default: return "A private offer";
  }
}