import { Link } from "react-router-dom";
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
    <section className="max-w-[1400px] mx-auto px-6 md:px-10 py-20 md:py-28">
      <div className="max-w-3xl">
        <p className="text-sm tracking-wide uppercase text-sea">Winter breaks</p>
        <h2 className="mt-3 text-3xl md:text-5xl text-ink leading-tight">
          Winter on the Cornish coast
        </h2>

        <ul className="mt-6 space-y-3 text-ink-soft leading-relaxed">
          <li>The coast path to yourself</li>
          <li>Warm inside — electric fire, sea view from the sofa</li>
          <li>Dogs welcome — many beaches lift their summer dog bans</li>
        </ul>

        <p className="mt-8 text-xl md:text-2xl text-ink tnum">
          Short breaks from {gbp(price)}
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
          <Link
            to="/prices"
            className="inline-flex items-center bg-sea text-white px-8 py-4 text-sm font-medium hover:bg-sea-deep transition-colors min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-sea focus-visible:ring-offset-2 focus-visible:ring-offset-base"
          >
            See winter dates
          </Link>
          <Link
            to="/guides/polperro-in-winter"
            className="inline-flex items-center text-sea font-medium hover:text-sea-deep transition-colors min-h-[44px]"
          >
            Polperro in winter →
          </Link>
        </div>
      </div>
    </section>
  );
}