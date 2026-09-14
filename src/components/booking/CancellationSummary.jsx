import { format, parseISO } from "date-fns";
import { useCancellationPolicy, cancellationDateBands } from "@/lib/cancellation";

// The guest's actual cancellation boundary dates, shown beside the payment
// schedule at checkout. "Full refund until 6 Aug 2027 · 75% until 5 Sep · 50%
// until 21 Sep · no refund after" — computed from the arrival date and the
// current tier set, never a generic day count.
export default function CancellationSummary({ arrival }) {
  const { settings } = useCancellationPolicy();
  if (!arrival) return null;
  const bands = cancellationDateBands(
    arrival instanceof Date ? format(arrival, "yyyy-MM-dd") : arrival,
    settings
  );
  if (!bands.length) return null;

  const top = bands[0];
  const topDate = top.until ? format(parseISO(top.until), "d MMM yyyy") : null;
  const topLine = top.percent === 100
    ? `Full refund until ${topDate}`
    : `${top.percent}% refund until ${topDate}`;

  const rest = bands.slice(1).map((b) => {
    if (b.percent === 0) return "no refund after";
    return `${b.percent}% until ${b.until ? format(parseISO(b.until), "d MMM yyyy") : ""}`;
  });

  return (
    <div className="mt-5 pt-4 border-t border-line">
      <p className="text-xs tracking-wide uppercase text-muted-foreground">Cancellation</p>
      <p className="mt-2 text-sm text-ink tnum">{topLine}</p>
      {rest.length > 0 && (
        <p className="mt-1 text-sm text-ink-soft tnum">{rest.join(" · ")}</p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Refunds are calculated on the total paid at the time you cancel.
      </p>
    </div>
  );
}