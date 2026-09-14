import { format, parseISO } from "date-fns";
import { useCancellationPolicy, cancellationDisplay } from "@/lib/cancellation";
import { gbp } from "@/lib/pricing";

// The guest's cancellation position at checkout, with the 48-hour cooling-off
// period leading. Cooling-off gives a full refund of everything paid within
// the window regardless of arrival, so it is the first, reassuring line; the
// tiered bands then follow, dated to start AFTER the cooling-off window
// closes (never "Cancel now: 75%" while a full refund is still on the table
// today). When arrival is fewer than 7 days away the window is capped at 24
// hours before arrival and the lead line says so plainly.
export default function CancellationSummary({ arrival, total }) {
  const { settings } = useCancellationPolicy();
  if (!arrival) return null;

  const arrivalIso = arrival instanceof Date ? format(arrival, "yyyy-MM-dd") : arrival;
  const info = cancellationDisplay(arrivalIso, total, settings);
  if (!info) return null;

  const co = info.coolingOff;
  const leadLine = co.sevenDayException
    ? "Change your mind? Full refund until 24 hours before you arrive."
    : "Change your mind? Full refund within 48 hours of booking.";

  const bandLabel = (b, i) => {
    const pctLabel =
      b.percent === 100 ? "full refund" : b.percent === 0 ? "no refund" : `${b.percent}% refund`;
    const pounds = b.percent === 0 ? "" : ` (${gbp(b.pounds)})`;
    if (b.kind === "now") return `Cancel now: ${pctLabel}${pounds}`;
    const prefix = i === 0 ? "Cancel from " : "From ";
    return `${prefix}${format(parseISO(b.date), "d MMM")}: ${pctLabel}${pounds}`;
  };

  return (
    <div className="mt-5 pt-4 border-t border-line">
      <p className="text-xs tracking-wide uppercase text-muted-foreground">
        Cancellation — please read before booking
      </p>
      {co.active && (
        <p className="mt-2 text-sm text-sea font-medium">{leadLine}</p>
      )}
      {co.active && <p className="mt-2 text-xs text-muted-foreground">After that:</p>}
      <div className="mt-1 space-y-1.5">
        {info.bands.map((b, i) => {
          const isNoRefundLine = b.kind === "now" && b.percent === 0;
          return (
            <p
              key={i}
              className={`text-sm tnum ${
                isNoRefundLine
                  ? "text-destructive font-medium"
                  : b.kind === "now"
                  ? "text-ink"
                  : "text-ink-soft"
              }`}
            >
              {bandLabel(b, i)}
            </p>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Refunds are calculated on the total paid at the time you cancel.
      </p>
    </div>
  );
}