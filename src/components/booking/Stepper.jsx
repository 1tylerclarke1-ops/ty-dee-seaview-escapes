import { Minus, Plus } from "lucide-react";

// Compact +/- stepper used for guests and dogs.
export default function Stepper({ label, value, min, max, onChange }) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-ink">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={dec}
          disabled={value <= min}
          aria-label={`Fewer ${label.toLowerCase()}`}
          className="w-9 h-9 inline-flex items-center justify-center border border-line text-ink-soft hover:border-sea hover:text-sea disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <Minus className="w-4 h-4" strokeWidth={1.5} />
        </button>
        <span className="w-6 text-center tnum text-ink">{value}</span>
        <button
          type="button"
          onClick={inc}
          disabled={value >= max}
          aria-label={`More ${label.toLowerCase()}`}
          className="w-9 h-9 inline-flex items-center justify-center border border-line text-ink-soft hover:border-sea hover:text-sea disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <Plus className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}