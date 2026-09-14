import { useMemo } from "react";
import {
  parseISO,
  format,
  addDays,
  differenceInDays,
  isAfter,
  isBefore,
  isEqual,
  startOfMonth,
} from "date-fns";
import { SEASON_START, SEASON_END } from "@/lib/pricing";
import { isFacilitiesClosed } from "@/lib/facilities";
import { useIsMobile } from "@/hooks/use-mobile";

const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// One slim bar across the whole booking window. Open and closed periods are
// two shades of the same teal (never red/green). The two annual boundaries
// (1 Nov, 19 Mar) carry a tick and a date label; a selected stay is marked on
// the bar so the guest sees which side of the line it falls.
export default function FacilitiesTimeline({ settings, arrival, length }) {
  const isMobile = useIsMobile();

  const { start, end, total, segs, months, boundaries } = useMemo(() => {
    const start = parseISO(SEASON_START);
    const end = parseISO(SEASON_END);
    const total = differenceInDays(end, start);

    const segs = [];
    let cursor = start;
    while (!isAfter(cursor, end)) {
      const closed = isFacilitiesClosed(format(cursor, "yyyy-MM-dd"), settings);
      let segEnd = cursor;
      while (
        !isAfter(segEnd, end) &&
        isFacilitiesClosed(format(segEnd, "yyyy-MM-dd"), settings) === closed
      ) {
        segEnd = addDays(segEnd, 1);
      }
      segs.push({ start: cursor, end: segEnd, closed });
      cursor = segEnd;
    }

    const months = [];
    let m = startOfMonth(start);
    while (isBefore(m, end) || isEqual(m, end)) {
      months.push(new Date(m));
      m = new Date(m.getFullYear(), m.getMonth() + 1, 1);
    }

    const s = settings || {};
    const boundaries = [];
    [s.facilities_closed_from, s.facilities_open_from].forEach((iso) => {
      if (!iso) return;
      const d = parseISO(iso);
      if (
        (isAfter(d, start) || isEqual(d, start)) &&
        (isBefore(d, end) || isEqual(d, end))
      ) {
        boundaries.push({ iso, date: d, label: format(d, "d MMM") });
      }
    });

    return { start, end, total, segs, months, boundaries };
  }, [settings]);

  const pct = (d) => {
    const diff = differenceInDays(d, start);
    return Math.max(0, Math.min(100, (diff / total) * 100));
  };

  const stayStart = arrival;
  const stayEnd = arrival && length ? addDays(arrival, length) : null;

  const labelMonths = isMobile
    ? months.filter((_, i) => i % 3 === 0)
    : months;

  return (
    <div className="select-none">
      {/* boundary date labels */}
      <div className="relative h-5 mb-1">
        {boundaries.map((b) => (
          <div
            key={b.iso}
            className="absolute -translate-x-1/2 text-[0.7rem] text-ink-soft tnum whitespace-nowrap"
            style={{ left: `${pct(b.date)}%` }}
          >
            {b.label}
          </div>
        ))}
      </div>

      {/* bar */}
      <div className="relative h-2.5">
        <div className="absolute inset-0 rounded-full overflow-hidden flex">
          {segs.map((seg, i) => (
            <div
              key={i}
              style={{ width: `${pct(seg.end) - pct(seg.start)}%` }}
              className={seg.closed ? "bg-sea/30" : "bg-sea"}
            />
          ))}
        </div>
        {boundaries.map((b) => (
          <div
            key={b.iso}
            className="absolute top-1/2 -translate-y-1/2 h-4 w-px bg-ink/60"
            style={{ left: `${pct(b.date)}%` }}
          />
        ))}
        {stayStart && stayEnd && (
          <div
            className="absolute top-1/2 -translate-y-1/2 h-4 rounded-full border-2 border-ink bg-white/50"
            style={{
              left: `${pct(stayStart)}%`,
              width: `${Math.max(1, pct(stayEnd) - pct(stayStart))}%`,
            }}
          />
        )}
      </div>

      {/* month labels */}
      <div className="relative h-4 mt-2">
        {labelMonths.map((m, i) => (
          <div
            key={i}
            className="absolute -translate-x-1/2 text-[0.65rem] text-muted-foreground tnum"
            style={{ left: `${pct(m)}%` }}
          >
            {MONTH_ABBR[m.getMonth()]}
          </div>
        ))}
      </div>
    </div>
  );
}