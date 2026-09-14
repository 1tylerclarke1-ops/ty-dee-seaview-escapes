import { formatFacilitiesDate } from "@/lib/facilities";

// A small, quiet marker for the availability list — factual, not alarming.
export default function FacilitiesMarker({ status }) {
  if (!status || status.state === "open") return null;
  const line =
    status.state === "closed"
      ? "Park facilities closed for these dates — accommodation only."
      : status.direction === "opening"
      ? `Park facilities open from ${formatFacilitiesDate(status.boundaryDate)} — accommodation only until then.`
      : `Park facilities open until ${formatFacilitiesDate(status.boundaryDate)}, then closed — accommodation only.`;
  return <p className="text-xs text-signal mt-1">{line}</p>;
}