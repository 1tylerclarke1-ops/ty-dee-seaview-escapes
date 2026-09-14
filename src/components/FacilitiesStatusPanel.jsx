import { useState } from "react";
import { parseISO, subDays, format } from "date-fns";
import { ChevronDown } from "lucide-react";
import FacilitiesTimeline from "@/components/FacilitiesTimeline";

// One status line reflecting the dates the guest is looking at, the winter
// note as context directly beneath, a slim year timeline, and the on-site
// facilities behind a disclosure. The per-season list is gone.
function statusLine(arrival, facStatus, settings) {
  const open = format(parseISO(settings.facilities_open_from), "d MMMM");
  const closed = format(parseISO(settings.facilities_closed_from), "d MMMM");
  const closedEve = format(subDays(parseISO(settings.facilities_closed_from), 1), "d MMMM");
  if (!arrival || !facStatus) {
    return `Park facilities are open from ${open} to ${closedEve}.`;
  }
  if (facStatus.state === "open") return "Park facilities are open for your dates.";
  if (facStatus.state === "closed") {
    return `Park facilities are closed for your dates — reopening ${open}.`;
  }
  if (facStatus.direction === "opening") {
    return `Park facilities open on ${open}, partway through your stay.`;
  }
  return `Park facilities close on ${closed}, partway through your stay.`;
}

export default function FacilitiesStatusPanel({ settings, arrival, length, facStatus }) {
  const [showSite, setShowSite] = useState(false);
  const items = (settings.facilities_list || "")
    .split(" — ")[0]
    .split(", ")
    .filter(Boolean);

  return (
    <div className="bg-surface border border-line p-6 md:p-10">
      <p className="text-xl md:text-2xl text-ink leading-snug max-w-3xl">
        {statusLine(arrival, facStatus, settings)}
      </p>
      <p className="text-sm text-ink-soft mt-3 max-w-2xl">{settings.facilities_winter_note}</p>

      <div className="mt-8">
        <FacilitiesTimeline settings={settings} arrival={arrival} length={length} />
      </div>

      <div className="mt-8 hairline pt-6">
        <button
          type="button"
          onClick={() => setShowSite((v) => !v)}
          className="flex items-center gap-2 text-sm text-ink-soft hover:text-sea transition-colors min-h-[44px]"
          aria-expanded={showSite}
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform ${showSite ? "rotate-180" : ""}`}
            strokeWidth={1.5}
          />
          What's on site
        </button>
        {showSite && (
          <ul className="mt-4 grid sm:grid-cols-2 gap-x-8 gap-y-2 max-w-2xl">
            {items.map((it) => (
              <li key={it} className="text-sm text-ink-soft flex items-start gap-2">
                <span className="mt-2 w-1 h-1 rounded-full bg-sea shrink-0" />
                <span>{it}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}