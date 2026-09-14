import { gbpMoney } from "@/lib/pricing";

// Slim sticky bar (mobile only) — keeps the total and the request button in
// sight once the breakdown scrolls out of view.
export default function StickyTotalBar({ total, canSubmit, submitting, onSubmit }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-surface border-t border-line shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
      <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div>
          <p className="text-[0.65rem] tracking-wide uppercase text-muted-foreground">Total</p>
          <p className="text-xl text-ink tnum leading-none">{gbpMoney(total)}</p>
        </div>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit || submitting}
          className={`px-6 py-3 text-sm font-medium transition-colors min-h-[44px] ${
            canSubmit && !submitting ? "bg-sea text-white hover:bg-sea-deep" : "bg-offseason text-muted-foreground cursor-not-allowed"
          }`}
        >
          {submitting ? "Checking…" : "Request these dates"}
        </button>
      </div>
    </div>
  );
}