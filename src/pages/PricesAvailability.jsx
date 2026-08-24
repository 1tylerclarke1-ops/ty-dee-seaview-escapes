import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import PageHero from "@/components/PageHero";
import StayCalendar, { stayForArrival, isParkClosedPeriod } from "@/components/StayCalendar";
import { STAYS, SEASON_START, SEASON_END, PARK_CLOSURE_DATE } from "@/lib/siteConfig";

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
      <PageHero
        eyebrow="The Binary Matrix"
        title="Prices & Availability"
        subtitle="Two stay lengths, one season. Friday arrivals are three nights; Monday arrivals are four. Every other date is the sea's."
      />

      {/* Rate table */}
      <section className="px-6 md:px-10 max-w-[1400px] mx-auto pb-24">
        <p className="eyebrow mb-8">Rate card · per stay</p>
        <div className="border-t border-cornish-slate/20">
          <div className="grid grid-cols-12 py-4 border-b border-cornish-slate/20 font-mono text-[0.65rem] tracking-[0.2em] uppercase text-cornish-slate">
            <div className="col-span-6">Period</div>
            <div className="col-span-3 text-right">3 nights · Fri</div>
            <div className="col-span-3 text-right">4 nights · Mon</div>
          </div>
          {RATES.map((r) => (
            <div key={r.period} className="grid grid-cols-12 py-5 border-b border-cornish-slate/15 items-baseline">
              <div className="col-span-6">
                <span className="font-display text-xl md:text-2xl text-atlantic">{r.period}</span>
                {r.note && (
                  <span className="block font-mono text-[0.6rem] tracking-[0.15em] uppercase text-cornish-slate mt-1">
                    {r.note}
                  </span>
                )}
              </div>
              <div className="col-span-3 text-right font-mono text-atlantic">£{r.fri}</div>
              <div className="col-span-3 text-right font-mono text-atlantic">£{r.mon}</div>
            </div>
          ))}
        </div>
        <p className="font-mono text-[0.65rem] tracking-[0.1em] text-cornish-slate/70 mt-6">
          Rates are indicative pending final confirmation. No agency fees — booked direct with the owner.
        </p>
      </section>

      {/* Calendar */}
      <section className="px-6 md:px-10 max-w-[1400px] mx-auto pb-24 md:pb-40">
        <div className="grid md:grid-cols-12 gap-12">
          <div className="md:col-span-8">
            <p className="eyebrow mb-8">Stay-block calendar · {SEASON_START} → {SEASON_END}</p>
            <StayCalendar selectedArrival={arrival} onSelect={setArrival} />
          </div>
          <div className="md:col-span-4">
            <div className="sticky top-28 bg-salt border border-cornish-slate/20 p-8">
              <p className="eyebrow">Your selection</p>
              {stay ? (
                <div className="mt-6">
                  <p className="font-display text-3xl text-atlantic">{stay.label}</p>
                  <p className="font-mono text-sm text-cornish-slate mt-2">
                    Arriving {format(arrival, "EEE d MMM yyyy")}
                  </p>
                  {winter && (
                    <div role="alert" aria-live="assertive" className="mt-6 bg-atlantic text-salt p-5">
                      <p className="font-mono text-[0.6rem] tracking-[0.25em] uppercase text-gorse">Winter residency</p>
                      <p className="mt-2 text-sm text-salt/90">
                        Park facilities are closed from 1 November. You are booking a peaceful, self-catered retreat.
                      </p>
                    </div>
                  )}
                  <Link
                    to="/book"
                    className="mt-8 flex items-center justify-center bg-gorse text-atlantic px-6 py-4 font-mono text-xs tracking-[0.25em] uppercase hover:bg-atlantic hover:text-salt transition-colors min-h-[44px]"
                  >
                    Continue to Book →
                  </Link>
                </div>
              ) : (
                <p className="mt-6 text-cornish-slate">
                  Select a highlighted arrival date. Only Fridays (3 nights) and Mondays (4 nights) within season are bookable.
                </p>
              )}

              <div className="mt-10 decking-divider" />
              <div className="mt-6 space-y-3 font-mono text-[0.65rem] tracking-[0.1em] text-cornish-slate">
                <p className="flex items-center gap-3"><span className="w-4 h-4 bg-gorse/30 inline-block" /> Valid arrival</p>
                <p className="flex items-center gap-3"><span className="w-4 h-4 bg-gorse/20 inline-block" /> Selected stay block</p>
                <p className="flex items-center gap-3"><span className="w-4 h-4 strike-diagonal inline-block border border-cornish-slate/20" /> Outside season</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}