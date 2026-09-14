import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { base44 } from "@/api/base44Client";

const DESCRIPTIONS = {
  extra_night: "Stay an extra night on us — book the listed nights, stay one more, free.",
  free_dog: "Your dog stays free — the £25 dog supplement is waived for this stay.",
  late_checkout: "Late checkout at no extra cost — leave later on your last day.",
  percentage: (v) => `${v}% off this stay.`,
  fixed_amount: (v) => `£${v} off this stay.`,
};

// Public landing page for a private offer. Reached only via the single-use
// link in an offer email — never linked from the site, never indexed. The
// site shows no discount schedule or countdown; this is a one-off.
export default function OfferLanding() {
  const { token } = useParams();
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    base44.functions
      .invoke("resolveOffer", { token })
      .then((res) => {
        const d = res.data || res;
        if (d.ok) setOffer(d.offer);
        else setError(d.error || "This offer is no longer available.");
      })
      .catch(() => setError("This offer could not be loaded."))
      .finally(() => setLoading(false));
  }, [token]);

  const describe = (o) => {
    if (o.type === "percentage") return DESCRIPTIONS.percentage(o.value);
    if (o.type === "fixed_amount") return DESCRIPTIONS.fixed_amount(o.value);
    return DESCRIPTIONS[o.type] || "A private offer.";
  };

  return (
    <section className="px-6 md:px-10 max-w-3xl mx-auto py-20 md:py-28">
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading your offer…</p>
      ) : error ? (
        <div>
          <h1 className="text-3xl md:text-4xl">{error}</h1>
          <p className="mt-4 text-ink-soft">If you have a question about a stay, <Link to="/contact" className="text-sea underline">get in touch</Link>.</p>
        </div>
      ) : offer ? (
        <div>
          <p className="text-sm text-sea tracking-wide uppercase">Late availability</p>
          <h1 className="text-4xl md:text-5xl mt-3">
            {format(parseISO(offer.arrival_date), "EEE d MMM yyyy")} · {offer.nights} nights
          </h1>
          <p className="mt-5 text-lg text-ink-soft">{describe(offer)}</p>

          {offer.redeemed ? (
            <p className="mt-8 text-ink-soft">This offer has been taken. <Link to="/prices" className="text-sea underline">See other dates</Link>.</p>
          ) : (
            <div className="mt-8 space-y-4">
              <p className="text-sm text-muted-foreground">
                This is a one-off private offer, sent to you directly — there's no public discount schedule and no countdown. Once it's gone, it's gone.
              </p>
              <Link to="/prices" className="inline-flex items-center justify-center bg-sea text-white px-6 py-4 text-sm font-medium hover:bg-sea-deep min-h-[44px]">
                Enquire about these dates
              </Link>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}