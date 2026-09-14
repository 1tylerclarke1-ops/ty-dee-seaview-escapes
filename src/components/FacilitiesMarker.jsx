import { parseISO, subDays, format } from "date-fns";
import { formatFacilitiesDate } from "@/lib/facilities";

// A small, quiet marker for the availability list — factual, not alarming.
// Boundary wording uses "to"/"from", never "until".
export default function FacilitiesMarker({ status }) {
  if (!status || status.state === "open") return null;

  if (status.state === "closed") {
    return (
      <p className="text-xs text-signal mt-1">
        Park facilities closed for these dates — accommodation only.
      </p>
    );
  }

  const bd = status.boundaryDate;
  if (status.direction === "opening") {
    return (
      <p className="text-xs text-signal mt-1">
        Park facilities reopen on {formatFacilitiesDate(bd)} — accommodation only before then.
      </p>
    );
  }

  const eve = format(subDays(parseISO(bd), 1), "d MMMM");
  return (
    <p className="text-xs text-signal mt-1">
      Park facilities open to {eve}, then closed from {formatFacilitiesDate(bd)} — accommodation only.
    </p>
  );
}