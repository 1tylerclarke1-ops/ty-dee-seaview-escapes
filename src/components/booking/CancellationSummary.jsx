import { format, parseISO } from "date-fns";
import { useCancellationPolicy, cancellationDisplay, addDaysIso } from "@/lib/cancellation";
import { gbp } from "@/lib/pricing";

// The guest's actual cancellation position at checkout, computed from the
// arrival date, the current tier set, and today. Expired tiers are dropped
// entirely (never greyed out). The guest's current position leads; remaining
// tiers follow with real "from" dates and the pounds each is worth. When the
// guest is inside the no-refund window that fact is the most visible line.
export default function CancellationSummary({ arrival, total }) {
  const { settings } = useCancellationPolicy();
  if (!arrival) return null;

  const arrivalIso = arrival instanceof Date ? format(arrival, "yyyy-MM-dd") : arrival;
  const info = cancellationDisplay(arrivalIso, total, settings);
  if (!info) return null;

  const daysWord = info.days === 1 ? "1 day" : `${info.days} days`;
  const fullRefundUntil = addDaysIso(arrivalIso, -settings.tiers[0].days_before_arrival);

  let positionLine;
  if (info.inNoRefund) {
    positionLine = `You are ${daysWord} from arrival — this booking is in the no-refund window. A cancellation would not be refunded.`;
  } else if (info.pastFullRefund) {
    positionLine = `You are ${daysWord} from arrival, so this booking is already past the full refund window.`;
  } else {
    positionLine = `You are ${daysWord} from arrival — full refund available until ${format(parseISO(fullRefundUntil), "d MMM yyyy")}.`;
  }

  const bandLabel = (b) => {
    const pctLabel =
      b.percent === 100 ? "full refund" : b.percent === 0 ? "no refund" : `${b.percent}% refund`;
    const pounds = b.percent === 0 ? "" : ` (${gbp(b.pounds)})`;
    if (b.kind === "now") return `Cancel now: ${pctLabel}${pounds}`;
    return `From ${format(parseISO(b.date), "d MMM")}: ${pctLabel}${pounds}`;
  };

  const noRefundActive = info.inNoRefund;

  return (
    <div className="mt-5 pt-4 border-t border-line">
      <p className="text-xs tracking-wide uppercase text-muted-foreground">
        Cancellation — please read before booking
      </p>
      <p
        className={`mt-2 text-sm ${noRefundActive ? "text-destructive font-medium" : "text-ink"}`}
      >
        {positionLine}
      </p>
      <div className="mt-3 space-y-1.5">
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
              {bandLabel(b)}
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