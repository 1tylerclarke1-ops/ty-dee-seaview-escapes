import { useState } from "react";
import { Link } from "react-router-dom";
import { format, addDays } from "date-fns";
import { Image } from "@/components/ui/image";
import StayCalendar, { isParkClosedPeriod } from "@/components/StayCalendar";
import { PRICING_SETTINGS, calculatePrice, gbp, SEASON_START, SEASON_END, allowedLengthsForArrival, seasonPriceForLength, seasonRestrictionNote } from "@/lib/pricing";

const BASE = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397";
const BANNER = `${BASE}/eba602fdb_View.jpg`;

// Rate card — one row per pricing season, one column per stay length. Each
// cell reads seasonPriceForLength from the pricing engine, so a price only
// appears where that length is actually bookable in that season; otherwise
// an em dash. The rate card can never drift from the booking engine.
const RATE_LENGTHS = [3, 4, 7, 14, 21, 28];
const RATE_ROWS = PRICING_SETTINGS.seasons.map((season) => ({
  name: season.name,
  prices: RATE_LENGTHS.map((l) => seasonPriceForLength(season, l)),
}));
const RESTRICTIONS = PRICING_SETTINGS.seasons
  .map((season) => seasonRestrictionNote(season))
  .filter(Boolean);

// Responsive grid templates for the rate card. On mobile, 4 columns
// (season + 3/4/7) by default, expanding to 7 when "Longer stays" is open.
// Desktop always shows all 7 columns.
const GRID_LONG = "grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr] md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr]";
const GRID_SHORT = "grid-cols-[2fr_1fr_1fr_1fr] md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr]";

export default function PricesAvailability() {
  const [arrival, setArrival] = useState(null);
  const [length, setLength] = useState(null);
  const [showLonger, setShowLonger] = useState(false);
  const allowedLengths = arrival ? allowedLengthsForArrival(arrival) : [];
  const winter = arrival && isParkClosedPeriod(arrival);
  const departure = arrival && length ? addDays(arrival, length) : null;
  const breakdown = arrival && length ? calculatePrice(arrival, length) : null;

  const handleSelectArrival = (d) => {
    setArrival(d);
    const allowed = allowedLengthsForArrival(d);
    setLength(allowed[0]);
  };

  return (
    <div>
      {/* Narrow banner strip — no more than 220px */}
      <section className="relative w-full h-[220px] overflow-hidden">
        <Image
          src={BANNER}
          alt="The Atlantic horizon from the caravan decking at Polperro"
          fittingType="fill"
          loading="eager"
          className="block w-full h-full"
        />
        <div className="absolute inset-0 scrim-bottom" />
        <div className="relative h-full flex flex-col justify-end max-w-[1400px] mx-auto w-full px-6 md:px-10 pb-8">
          <h1 className="text-white text-4xl md:text-5xl">Prices & Availability</h1>
          <p className="mt-2 text-white/80 max-w-xl text-sm md:text-base">
            Two stay lengths, a full twelve-month season. Friday arrivals are three nights; Monday arrivals four. Every other date is the sea's.
          </p>
        </div>
      </section>

      {/* Rate table */}
      <section className="px-6 md:px-10 max-w-[1400px] mx-auto py-14 md:py-20">
        <div className="bg-surface border border-line p-6 md:p-10">
          <p className="text-sm text-muted-foreground mb-6">Rate card · per stay</p>
          <div className="border-t border-line">
            <div className={`${showLonger ? GRID_LONG : GRID_SHORT} py-3 border-b border-line text-xs tracking-wide uppercase text-muted-foreground`}>
              <div>Season</div>
              <div className="text-right">3</div>
              <div className="text-right">4</div>
              <div className="text-right">7</div>
              <div className={`text-right ${showLonger ? "" : "hidden md:block"}`}>14</div>
              <div className={`text-right ${showLonger ? "" : "hidden md:block"}`}>21</div>
              <div className={`text-right ${showLonger ? "" : "hidden md:block"}`}>28</div>
            </div>
            {RATE_ROWS.map((r) => (
              <div key={r.name} className={`${showLonger ? GRID_LONG : GRID_SHORT} py-4 border-b border-line items-baseline`}>
                <div className="text-base text-ink">{r.name}</div>
                <div className="text-right tnum text-ink">{r.prices[0] != null ? gbp(r.prices[0]) : "—"}</div>
                <div className="text-right tnum text-ink">{r.prices[1] != null ? gbp(r.prices[1]) : "—"}</div>
                <div className="text-right tnum text-ink">{r.prices[2] != null ? gbp(r.prices[2]) : "—"}</div>
                <div className={`text-right tnum text-ink ${showLonger ? "" : "hidden md:block"}`}>{r.prices[3] != null ? gbp(r.prices[3]) : "—"}</div>
                <div className={`text-right tnum text-ink ${showLonger ? "" : "hidden md:block"}`}>{r.prices[4] != null ? gbp(r.prices[4]) : "—"}</div>
                <div className={`text-right tnum text-ink ${showLonger ? "" : "hidden md:block"}`}>{r.prices[5] != null ? gbp(r.prices[5]) : "—"}</div>
              </div>
            ))}
          </div>
          {RESTRICTIONS.map((note) => (
            <p key={note} className="text-xs text-muted-foreground mt-3">{note}</p>
          ))}
          <button
            onClick={() => setShowLonger((v) => !v)}
            className="md:hidden mt-5 text-xs tracking-wide uppercase text-sea hover:text-sea-deep"
          >
            {showLonger ? "Hide longer stays" : "Longer stays +"}
          </button>
          <p className="text-xs text-muted-foreground mt-5">
            Per-stay totals include the £35 short break supplement on 3- and 4-night stays. No agency fees — booked direct with the owner.
          </p>
        </div>
      </section>

      {/* Calendar */}
      <section className="px-6 md:px-10 max-w-[1400px] mx-auto pb-24 md:pb-32">
        <div className="grid md:grid-cols-12 gap-8 md:gap-12">
          <div className="md:col-span-8">
            <div className="bg-surface border border-line p-6 md:p-10">
              <p className="text-sm text-muted-foreground mb-6">
                Stay-block calendar · {SEASON_START} → {SEASON_END}
              </p>
              <StayCalendar selectedArrival={arrival} selectedLength={length} onSelect={handleSelectArrival} />
            </div>
          </div>
          <div className="md:col-span-4">
            <div className="sticky top-28 bg-surface border border-line p-6 md:p-8">
              <p className="text-sm text-muted-foreground">Your selection</p>
              {!arrival ? (
                <p className="mt-5 text-ink-soft text-sm">
                  Select a highlighted arrival date. Available stay lengths will appear here.
                </p>
              ) : (
                <div className="mt-5">
                  <p className="text-sm text-muted-foreground tnum">
                    Arriving {format(arrival, "EEE d MMM yyyy")}
                  </p>
                  {allowedLengths.length === 0 ? (
                    <p className="mt-3 text-ink-soft text-sm">No stays available from this date.</p>
                  ) : (
                    <>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {allowedLengths.map((n) => (
                          <button
                            key={n}
                            onClick={() => setLength(n)}
                            className={`px-4 py-2 text-sm tnum min-h-[44px] transition-colors ${
                              length === n
                                ? "bg-sea text-white"
                                : "bg-surface border border-line text-ink-soft hover:border-sea hover:text-sea"
                            }`}
                          >
                            {n} nights
                          </button>
                        ))}
                      </div>
                      {length && breakdown && (
                        <div className="mt-5">
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs tracking-wide uppercase text-muted-foreground">Total</span>
                            <span className="text-2xl text-ink tnum">{gbp(breakdown.total)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 tnum">
                            {length} nights · departing {format(departure, "EEE d MMM yyyy")}
                          </p>
                        </div>
                      )}
                      {winter && (
                        <div role="alert" aria-live="assertive" className="mt-5 bg-ink text-white p-4">
                          <p className="text-xs tracking-wide uppercase text-signal">Winter residency</p>
                          <p className="mt-2 text-sm text-white/90">
                            Park facilities are closed from 1 November. You are booking a peaceful, self-catered retreat.
                          </p>
                        </div>
                      )}
                      <Link
                        to={`/book?arrival=${format(arrival, "yyyy-MM-dd")}&nights=${length}`}
                        className="mt-6 flex items-center justify-center bg-sea text-white px-6 py-4 text-sm font-medium hover:bg-sea-deep transition-colors min-h-[44px]"
                      >
                        Continue to Book →
                      </Link>
                    </>
                  )}
                </div>
              )}

              <div className="hairline mt-8" />
              <div className="mt-5 space-y-2 text-xs text-muted-foreground">
                <p className="flex items-center gap-3"><span className="w-4 h-4 bg-surface border border-sea inline-block" /> Available arrival</p>
                <p className="flex items-center gap-3"><span className="w-4 h-4 bg-offseason inline-block" /> Your stay</p>
                <p className="flex items-center gap-3"><span className="w-4 h-4 bg-offseason inline-block opacity-50" /> Out of season</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}