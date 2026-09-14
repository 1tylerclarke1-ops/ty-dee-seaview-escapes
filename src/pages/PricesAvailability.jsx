import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Image } from "@/components/ui/image";
import StayCalendar, { stayForArrival, isParkClosedPeriod } from "@/components/StayCalendar";
import { SEASON_START, SEASON_END } from "@/lib/siteConfig";

const BASE = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397";
const BANNER = `${BASE}/eba602fdb_View.jpg`;

// Placeholder rate tiers (per stay) — to be confirmed by owner.
const RATES = [
  { period: "October 2026", fri: 240, mon: 300 },
  { period: "November 2026 – February 2027", fri: 180, mon: 230, note: "Park facilities closed" },
  { period: "March 2027", fri: 260, mon: 320 },
  { period: "April 2027", fri: 300, mon: 380 },
];

export default function PricesAvailability() {
  const [arrival, setArrival] = useState(null);
  const stay = arrival ? stayForArrival(arrival) : null;
  const winter = arrival && isParkClosedPeriod(arrival);

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
            Two stay lengths, one season. Friday arrivals are three nights; Monday arrivals are four. Every other date is the sea's.
          </p>
        </div>
      </section>

      {/* Rate table */}
      <section className="px-6 md:px-10 max-w-[1400px] mx-auto py-14 md:py-20">
        <div className="bg-surface border border-line p-6 md:p-10">
          <p className="text-sm text-muted-foreground mb-6">Rate card · per stay</p>
          <div className="border-t border-line">
            <div className="grid grid-cols-12 py-3 border-b border-line text-xs tracking-wide uppercase text-muted-foreground">
              <div className="col-span-6">Period</div>
              <div className="col-span-3 text-right">3 nights · Fri</div>
              <div className="col-span-3 text-right">4 nights · Mon</div>
            </div>
            {RATES.map((r) => (
              <div key={r.period} className="grid grid-cols-12 py-4 border-b border-line items-baseline">
                <div className="col-span-6">
                  <span className="text-lg text-ink">{r.period}</span>
                  {r.note && <span className="block text-xs text-signal mt-1">{r.note}</span>}
                </div>
                <div className="col-span-3 text-right tnum text-ink">£{r.fri}</div>
                <div className="col-span-3 text-right tnum text-ink">£{r.mon}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-5">
            Rates are indicative pending final confirmation. No agency fees — booked direct with the owner.
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
              <StayCalendar selectedArrival={arrival} onSelect={setArrival} />
            </div>
          </div>
          <div className="md:col-span-4">
            <div className="sticky top-28 bg-surface border border-line p-6 md:p-8">
              <p className="text-sm text-muted-foreground">Your selection</p>
              {stay ? (
                <div className="mt-5">
                  <p className="text-2xl text-ink">{stay.label}</p>
                  <p className="text-sm text-muted-foreground mt-1 tnum">
                    Arriving {format(arrival, "EEE d MMM yyyy")}
                  </p>
                  {winter && (
                    <div role="alert" aria-live="assertive" className="mt-5 bg-ink text-white p-4">
                      <p className="text-xs tracking-wide uppercase text-signal">Winter residency</p>
                      <p className="mt-2 text-sm text-white/90">
                        Park facilities are closed from 1 November. You are booking a peaceful, self-catered retreat.
                      </p>
                    </div>
                  )}
                  <Link
                    to="/book"
                    className="mt-6 flex items-center justify-center bg-sea text-white px-6 py-4 text-sm font-medium hover:bg-sea-deep transition-colors min-h-[44px]"
                  >
                    Continue to Book →
                  </Link>
                </div>
              ) : (
                <p className="mt-5 text-ink-soft text-sm">
                  Select a highlighted arrival date. Only Fridays (3 nights) and Mondays (4 nights) within season are bookable.
                </p>
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