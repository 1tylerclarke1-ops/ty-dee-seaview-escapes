import { gbp } from "@/lib/pricing";

// Quiet public-offer marker for the availability list. Never a banner, never
// a countdown, never "was/now" language on the rate card itself. For monetary
// offers it shows the original total struck through beside the offer; for
// value offers (extra night, free dog, late checkout) it states the offer
// alone — there is no price reduction to strike through.
export default function PublicOfferMarker({ offer, originalTotal }) {
  if (!offer) return null;

  let discounted = null;
  if (offer.type === "percentage") {
    discounted = Math.round(originalTotal * (1 - (offer.value || 0) / 100));
  } else if (offer.type === "fixed_amount") {
    discounted = Math.max(0, originalTotal - (offer.value || 0));
  }
  const isMonetary = discounted != null && discounted < originalTotal;

  return (
    <div className="mt-4 border-t border-line pt-4">
      {isMonetary ? (
        <p className="text-sm text-ink-soft tnum">
          <span className="line-through text-muted-foreground mr-2">{gbp(originalTotal)}</span>
          <span className="text-ink">{gbp(discounted)}</span>
        </p>
      ) : null}
      <p className="text-sm text-sea mt-1">{offer.description}</p>
      {offer.reason && (
        <p className="text-xs text-muted-foreground mt-1">{offer.reason}</p>
      )}
    </div>
  );
}