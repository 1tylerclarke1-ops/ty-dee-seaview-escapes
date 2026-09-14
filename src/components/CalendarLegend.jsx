// Legend for the stay calendar. Selected (dark green) and your-stay (grey)
// differ in more than colour — selected is bold with a deep ring, your-stay
// has a hairline border — so the distinction holds for colour-blind guests.
function Swatch({ children, className }) {
  return (
    <span className={`w-5 h-5 inline-flex items-center justify-center ${className}`}>
      {children}
    </span>
  );
}

const ITEMS = [
  {
    label: "Available arrival",
    swatch: (
      <Swatch className="bg-surface border border-sea">
        <span className="w-1.5 h-1.5 rounded-full bg-sea" />
      </Swatch>
    ),
  },
  {
    label: "Selected arrival",
    swatch: (
      <Swatch className="bg-sea ring-2 ring-sea-deep">
        <span className="w-1.5 h-1.5 rounded-full bg-white" />
      </Swatch>
    ),
  },
  {
    label: "Your stay",
    swatch: (
      <Swatch className="bg-offseason border border-line">
        <span className="w-1.5 h-1.5 rounded-full bg-ink-soft" />
      </Swatch>
    ),
  },
  {
    label: "Not an arrival day",
    swatch: (
      <Swatch className="border border-line">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
      </Swatch>
    ),
  },
  {
    label: "Outside season",
    swatch: (
      <Swatch className="border border-line opacity-50">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
      </Swatch>
    ),
  },
];

export default function CalendarLegend() {
  return (
    <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
      {ITEMS.map((it) => (
        <div key={it.label} className="flex items-center gap-2">
          {it.swatch}
          <span className="text-xs text-muted-foreground">{it.label}</span>
        </div>
      ))}
    </div>
  );
}