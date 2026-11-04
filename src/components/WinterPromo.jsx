import { Link } from "react-router-dom";
import { Waves, Flame, CalendarDays } from "lucide-react";
import { Image } from "@/components/ui/image";
import { PRICING_SETTINGS, seasonPriceForLength, gbp } from "@/lib/pricing";

const TARGET_SEASONS = ["Late autumn", "Winter", "Early spring"];
const LENGTHS = [3, 4];

// Lowest bookable short-break price across the three off-season bands, for a
// 3-night and a 4-night stay. Nulls (lengths not bookable in a season) are
// ignored. Never hard-codes a price — everything resolves from the pricing
// engine so it can never drift from what a guest is actually quoted.
function lowestShortBreakPrice() {
  const seasons = PRICING_SETTINGS.seasons.filter((s) =>
    TARGET_SEASONS.includes(s.name)
  );
  const prices = [];
  for (const season of seasons) {
    for (const length of LENGTHS) {
      const price = seasonPriceForLength(season, length);
      if (price != null) prices.push(price);
    }
  }
  return prices.length ? Math.min(...prices) : null;
}

export default function WinterPromo() {
  const spring = PRICING_SETTINGS.seasons.find((s) => s.name === "Early spring");
  if (!spring) return null;

  const today = new Date().toISOString().slice(0, 10);
  if (today > spring.end_date) return null;

  const price = lowestShortBreakPrice();
  if (price == null) return null;

  return (
    <section className="pb-20 md:pb-28">
      {/* Full-width photo panel */}
      <div className="relative h-[60vh] min-h-[420px] overflow-hidden">
        <Image
          src="https://media.base44.com/images/public/6a8c357fbddaa3182705f397/23d07571c_DeckingandView.jpg"
          alt="The caravan's private decking looking out over the park to the Cornish coast"
          fittingType="fill"
          loading="lazy"
          className="block w-full h-full"
        />
        <div className="absolute inset-0 scrim-bottom" />
        <div className="absolute inset-x-0 top-0">
          <div className="max-w-[1400px] mx-auto px-6 md:px-10 pt-6 md:pt-8">
            <span className="inline-block text-xs tracking-[0.2em] uppercase bg-white/90 text-ink px-4 py-2">
              November — March
            </span>
          </div>
        </div>
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-[1400px] mx-auto px-6 md:px-10 pb-12 w-full">
            <h2 className="text-white hero-text-shadow text-4xl md:text-6xl leading-tight">
              Winter by the Cornish coast
            </h2>
            <p className="mt-4 text-white/90 text-lg md:text-xl max-w-xl">
              Quiet coastal days, sea views and cosy evenings to make your own.
            </p>
          </div>
        </div>
      </div>

      {/* Overlapping card */}
      <div className="relative -mt-10 md:-mt-16 mx-6 md:mx-auto md:max-w-[1200px] bg-surface border border-line rounded-t-lg p-8 md:p-12">
        <div className="grid md:grid-cols-12 gap-10">
          <div className="md:col-span-7">
            <div className="flex gap-4 py-5 border-b border-line">
              <Waves className="w-6 h-6 text-sea shrink-0" strokeWidth={1.5} />
              <div>
                <p className="font-display text-lg text-ink">The coast, at its quietest</p>
                <p className="mt-1 text-ink-soft">Calmer beaches, harbour villages and fresh sea air, without the crowds.</p>
              </div>
            </div>
            <div className="flex gap-4 py-5 border-b border-line">
              <Flame className="w-6 h-6 text-sea shrink-0" strokeWidth={1.5} />
              <div>
                <p className="font-display text-lg text-ink">A warm welcome back</p>
                <p className="mt-1 text-ink-soft">Settle in beside the electric fireplace, with your own space to unwind.</p>
              </div>
            </div>
            <div className="flex gap-4 py-5">
              <CalendarDays className="w-6 h-6 text-sea shrink-0" strokeWidth={1.5} />
              <div>
                <p className="font-display text-lg text-ink">A few days, or a full week</p>
                <p className="mt-1 text-ink-soft">Three nights from Friday, four from Monday, or longer if you prefer.</p>
              </div>
            </div>
          </div>

          <div className="md:col-span-5 md:border-l border-line md:pl-10 flex flex-col items-center justify-center text-center">
            <p className="text-xs tracking-[0.2em] uppercase text-sea">Winter short breaks</p>
            <p className="mt-3 text-6xl md:text-7xl text-ink tnum leading-none">{gbp(price)}</p>
            <p className="mt-2 text-ink-soft">from, per break</p>
            <p className="mt-4 text-sm text-muted-foreground">Sleeps 6 · 2 bedrooms · Dogs welcome</p>
          </div>

          <div className="md:col-span-12 flex flex-col sm:flex-row gap-4">
            <Link
              to="/prices"
              className="inline-flex items-center justify-center bg-sea text-white px-8 py-4 text-sm font-medium hover:bg-sea-deep transition-colors min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-sea focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              View winter availability →
            </Link>
            <Link
              to="/caravan"
              className="inline-flex items-center justify-center border border-ink text-ink px-8 py-4 text-sm font-medium min-h-[44px] hover:bg-ink hover:text-white transition-colors"
            >
              Explore the caravan →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}