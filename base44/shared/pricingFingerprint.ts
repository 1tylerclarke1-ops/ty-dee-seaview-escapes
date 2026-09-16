// Runtime fingerprint of the pricing configuration — seasons, rules and
// scalars. Computed identically on client and server; the client sends its
// fingerprint with each booking request and the server compares it with its
// own. A mismatch means the published site and the server disagree on price,
// so the booking is refused rather than taken at an unintended price.
//
// The function body is byte-identical on both sides (enforced by the build-time
// drift check in scripts/checkPricingDrift.mjs) so the hashes are directly
// comparable. Keep this function free of type annotations and side effects.
export function pricingFingerprint(scalars, seasons, bookingRules) {
  const payload = JSON.stringify({
    scalars: {
      price_rounding: scalars.price_rounding,
      short_break_supplement: scalars.short_break_supplement,
      dog_fee: scalars.dog_fee,
      dog_fee_per_dog: scalars.dog_fee_per_dog,
      max_dogs: scalars.max_dogs,
      deposit_percentage: scalars.deposit_percentage,
      balance_due_days_before_arrival: scalars.balance_due_days_before_arrival
    },
    seasons: seasons.map((s) => ({
      name: s.name,
      start_date: s.start_date,
      end_date: s.end_date,
      nightly_rate: s.nightly_rate,
      weekend_modifier: s.weekend_modifier
    })),
    booking_rules: bookingRules
  });
  let h = 5381;
  for (let i = 0; i < payload.length; i++) {
    h = (h * 33 + payload.charCodeAt(i)) >>> 0;
  }
  return h.toString(16);
}