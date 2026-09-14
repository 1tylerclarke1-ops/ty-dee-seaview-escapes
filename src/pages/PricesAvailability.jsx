import { useState } from "react";
import { format } from "date-fns";
import { Image } from "@/components/ui/image";
import StayCalendar from "@/components/StayCalendar";
import FacilitiesStatusPanel from "@/components/FacilitiesStatusPanel";
import FacilitiesMarker from "@/components/FacilitiesMarker";
import BookingPanel from "@/components/booking/BookingPanel";
import { SEASON_START, SEASON_END, allowedLengthsForArrival } from "@/lib/pricing";
import { useFacilitiesSettings, stayFacilitiesStatus } from "@/lib/facilities";

const BASE = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397";
const BANNER = `${BASE}/eba602fdb_View.jpg`;

export default function PricesAvailability() {
  const [arrival, setArrival] = useState(null);
  const [length, setLength] = useState(null);
  const { settings } = useFacilitiesSettings();
  const allowedLengths = arrival ? allowedLengthsForArrival(arrival) : [];
  const facStatus = arrival && length ? stayFacilitiesStatus(arrival, length, settings) : null;
  const affected = facStatus && facStatus.state !== "open";

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

      {/* Park facilities — per-season status */}
      <section className="px-6 md:px-10 max-w-[1400px] mx-auto py-14 md:py-20">
        <FacilitiesStatusPanel settings={settings} />
      </section>

      {/* Calendar + selection */}
      <section className="px-6 md:px-10 max-w-[1400px] mx-auto pb-10 md:pb-16">
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
                      {affected && (
                        <div className="mt-4">
                          <FacilitiesMarker status={facStatus} />
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Inline booking panel — guests, dogs, live breakdown, details */}
      <BookingPanel arrival={arrival} length={length} affected={affected} />
    </div>
  );
}