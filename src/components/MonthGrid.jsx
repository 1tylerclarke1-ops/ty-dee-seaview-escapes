import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isEqual,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { SEASON_START, SEASON_END } from "@/lib/siteConfig";
import { isArrivalDay } from "@/lib/pricing";
import { isFacilitiesClosed } from "@/lib/facilities";

const WEEK_STARTS_ON = 1; // Monday

// A date is owner-blocked (unavailable) if it falls within any blocked range
// [start, end] inclusive. The reason is never shown to guests — only that the
// date is not available.
function isDateBlocked(date, blockedRanges) {
  if (!blockedRanges?.length) return false;
  const d = parseISO(format(date, "yyyy-MM-dd"));
  return blockedRanges.some((r) => {
    try {
      return isWithinInterval(d, { start: parseISO(r.start_date), end: parseISO(r.end_date) });
    } catch {
      return false;
    }
  });
}

function monthGrid(year, month) {
  const start = startOfWeek(startOfMonth(new Date(year, month, 1)), { weekStartsOn: WEEK_STARTS_ON });
  const end = endOfWeek(endOfMonth(new Date(year, month, 1)), { weekStartsOn: WEEK_STARTS_ON });
  return eachDayOfInterval({ start, end });
}

function inSeason(date) {
  const s = parseISO(SEASON_START);
  const e = parseISO(SEASON_END);
  return (isEqual(date, s) || isAfter(date, s)) && (isEqual(date, e) || isBefore(date, e));
}

function isParkClosedPeriod(date, settings) {
  return isFacilitiesClosed(date, settings);
}

// One month grid. Leading/trailing days from neighbouring months are inert
// spacers — no number, no border, no hover, not focusable, aria-hidden — so a
// date never appears in two grids.
export default function MonthGrid({ year, month, selectedArrival, selectedLength, onSelect, closedNote, openNote, facilitiesSettings, blockedRanges }) {
  const days = monthGrid(year, month);
  const blockDates =
    selectedArrival && selectedLength
      ? Array.from({ length: selectedLength }, (_, i) => addDays(selectedArrival, i))
      : [];
  const inBlock = (date) => blockDates.some((d) => isEqual(d, date));

  return (
    <div>
      <div className="flex flex-col min-[500px]:flex-row items-start min-[500px]:items-baseline justify-between mb-4 gap-1.5 min-[500px]:gap-3">
        <h3 className="text-2xl text-ink leading-tight">{format(new Date(year, month, 1), "MMMM yyyy")}</h3>
        {closedNote && (
          <span className="text-[0.65rem] tracking-wide uppercase text-muted-foreground min-[500px]:text-right leading-tight">
            {closedNote}
          </span>
        )}
        {openNote && (
          <span className="text-[0.65rem] tracking-wide uppercase text-muted-foreground min-[500px]:text-right leading-tight">
            {openNote}
          </span>
        )}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div key={i} className="text-[0.6rem] tracking-wide text-muted-foreground text-center pb-2">
            {d}
          </div>
        ))}
        {days.map((date) => {
          const inMonth = date.getMonth() === month;
          if (!inMonth) {
            return <div key={date.toISOString()} aria-hidden="true" className="aspect-square" />;
          }
          const season = inSeason(date);
          const arrival = isArrivalDay(date);
          const blocked = inBlock(date);
          const closed = isParkClosedPeriod(date, facilitiesSettings);
          const isSelectedArrival = selectedArrival && isEqual(date, selectedArrival);
          const ownerBlocked = isDateBlocked(date, blockedRanges);

          let cls =
            "relative aspect-square flex items-center justify-center text-sm transition-colors min-h-[44px] min-w-[44px] tnum ";
          if (!season) {
            cls += "text-muted-foreground opacity-50";
          } else if (ownerBlocked) {
            cls += "bg-booked text-muted-foreground cursor-not-allowed";
          } else if (arrival) {
            cls += isSelectedArrival
              ? "bg-sea text-white font-semibold ring-2 ring-sea-deep"
              : blocked
              ? "bg-offseason text-sea"
              : "bg-surface text-sea border border-sea hover:bg-sea hover:text-white cursor-pointer";
          } else if (blocked) {
            cls += "bg-offseason text-ink-soft border border-line";
          } else if (closed) {
            cls += "text-muted-foreground";
          } else {
            cls += "text-muted-foreground opacity-60";
          }

          return (
            <button
              key={date.toISOString()}
              disabled={!arrival || ownerBlocked}
              onClick={() => arrival && !ownerBlocked && onSelect && onSelect(date)}
              className={cls}
              aria-label={format(date, "EEEE d MMMM yyyy")}
              aria-pressed={isSelectedArrival || undefined}
            >
              {date.getDate()}
              {arrival && !isSelectedArrival && !blocked && (
                <span className="absolute inset-0 ring-1 ring-sea pointer-events-none" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}