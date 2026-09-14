import { format } from "date-fns";
import { gbpMoney, balanceDueDate } from "@/lib/pricing";

// Itemised, live price breakdown. Updates as guests and dogs change.
export default function PriceBreakdown({ breakdown, arrival }) {
  if (!breakdown) return null;

  const rows = breakdown.groups.map((g) => ({
    label: `${g.count} × ${gbpMoney(g.rate)} ${g.type === "weekend" ? "weekend" : "per night"}`,
    value: gbpMoney(g.count * g.rate),
  }));
  if (breakdown.shortBreakSupplement > 0) {
    rows.push({ label: "Short break supplement", value: gbpMoney(breakdown.shortBreakSupplement) });
  }
  if (breakdown.dogFee > 0) {
    rows.push({ label: `Dogs (${breakdown.dogs})`, value: gbpMoney(breakdown.dogFee) });
  }

  const balanceDue = balanceDueDate(arrival);

  return (
    <div>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex items-baseline justify-between">
            <span className="text-sm text-ink-soft tnum">{r.label}</span>
            <span className="text-sm text-ink tnum">{r.value}</span>
          </div>
        ))}
      </div>
      <div className="hairline mt-3" />
      <div className="flex items-baseline justify-between mt-3">
        <span className="text-xs tracking-wide uppercase text-muted-foreground">Total</span>
        <span className="text-2xl text-ink tnum">{gbpMoney(breakdown.total)}</span>
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-ink-soft">Deposit due today</span>
          <span className="text-sm text-ink tnum">{gbpMoney(breakdown.deposit)}</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-ink-soft">Balance due {format(balanceDue, "d MMM yyyy")}</span>
          <span className="text-sm text-ink tnum">{gbpMoney(breakdown.balance)}</span>
        </div>
      </div>
    </div>
  );
}