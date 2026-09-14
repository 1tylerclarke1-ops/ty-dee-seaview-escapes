import { PRICING_SETTINGS } from "@/lib/pricing";
import { seasonFacilitiesStatus, formatFacilitiesDate } from "@/lib/facilities";

// Per-season facilities status — replaces the removed rate card's location
// on Prices & Availability. Reads the same engine the booking rules use, so
// it can never advertise a state the engine contradicts.
export default function FacilitiesStatusPanel({ settings }) {
  return (
    <div className="bg-surface border border-line p-6 md:p-10">
      <p className="text-sm text-muted-foreground mb-3">Park facilities · by season</p>
      <p className="text-ink-soft text-sm max-w-2xl mb-6">{settings.facilities_list}</p>
      <div className="border-t border-line">
        {PRICING_SETTINGS.seasons.map((season) => {
          const st = seasonFacilitiesStatus(season, settings);
          const tone = st.state === "open" ? "text-sea" : "text-signal";
          const label =
            st.state === "open"
              ? "Open"
              : st.state === "closed"
              ? "Closed"
              : st.direction === "opening"
              ? `Opening ${formatFacilitiesDate(st.boundaryDate)}`
              : `Open until ${formatFacilitiesDate(st.boundaryDate)}`;
          return (
            <div key={season.name} className="flex items-baseline justify-between py-3 border-b border-line gap-4">
              <span className="text-base text-ink">{season.name}</span>
              <span className={`text-sm ${tone}`}>{label}</span>
            </div>
          );
        })}
      </div>
      <p className="text-sm text-ink-soft mt-5 max-w-2xl">{settings.facilities_winter_note}</p>
    </div>
  );
}