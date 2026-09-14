import { useMemo, useState } from "react";
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isEqual,
  parseISO,
  startOfMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { STAYS, SEASON_START, SEASON_END, PARK_CLOSURE_DATE, MAX_GUESTS } from "@/lib/siteConfig";

const WEEK_STARTS_ON = 1; // Monday

// Build a 6x7 grid of dates for a given month
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

function isParkClosedPeriod(date) {
  return isEqual(date, parseISO(PARK_CLOSURE_DATE)) || isAfter(date, parseISO(PARK_CLOSURE_DATE));
}

// Returns the stay config if this date is a valid arrival day within season
function stayForArrival(date) {
  if (!inSeason(date)) return null;
  return STAYS.find((s) => s.arrivalDay === date.getDay()) || null;
}

export default function StayCalendar({ selectedArrival, onSelect, compact = false }) {
  const seasonMonths = useMemo(() => {
    const start = parseISO(SEASON_START);
    const end = parseISO(SEASON_END);
    const months = [];
    let cursor = startOfMonth(start);
    while (isBefore(cursor, end) || isEqual(startOfMonth(cursor), startOfMonth(end))) {
      months.push({ year: cursor.getFullYear(), month: cursor.getMonth() });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
    return months;
  }, []);

  const selectedStay = selectedArrival ? stayForArrival(selectedArrival) : null;
  const blockDates = useMemo(() => {
    if (!selectedArrival || !selectedStay) return [];
    return Array.from({ length: selectedStay.nights }, (_, i) => addDays(selectedArrival, i));
  }, [selectedArrival, selectedStay]);

  const inBlock = (date) => blockDates.some((d) => isEqual(d, date));

  return (
    <div className="space-y-10">
      {seasonMonths.map(({ year, month }) => {
        const days = monthGrid(year, month);
        return (
          <div key={`${year}-${month}`}>
            <div className="flex items-baseline justify-between mb-4">
              <h3 className="text-2xl text-ink">
                {format(new Date(year, month, 1), "MMMM yyyy")}
              </h3>
              {month === 10 && year === 2026 && (
                <span className="text-[0.65rem] tracking-wide uppercase text-muted-foreground">
                  Park facilities close Nov 1
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
                const season = inSeason(date);
                const stay = stayForArrival(date);
                const isArrival = Boolean(stay);
                const blocked = inBlock(date);
                const closed = isParkClosedPeriod(date);
                const isSelectedArrival = selectedArrival && isEqual(date, selectedArrival);

                let cls =
                  "relative aspect-square flex items-center justify-center text-sm transition-colors min-h-[44px] min-w-[44px] tnum ";
                if (!inMonth) {
                  cls += "text-transparent";
                } else if (!season) {
                  cls += "text-muted-foreground opacity-50";
                } else if (isArrival) {
                  cls += isSelectedArrival
                    ? "bg-sea text-white"
                    : blocked
                    ? "bg-offseason text-sea"
                    : "bg-surface text-sea border border-sea hover:bg-sea hover:text-white cursor-pointer";
                } else if (blocked) {
                  cls += "bg-offseason text-ink-soft";
                } else if (closed) {
                  cls += "text-muted-foreground";
                } else {
                  cls += "text-muted-foreground opacity-60";
                }

                return (
                  <button
                    key={date.toISOString()}
                    disabled={!isArrival}
                    onClick={() => isArrival && onSelect && onSelect(date, stay)}
                    className={cls}
                    aria-label={format(date, "EEEE d MMMM yyyy")}
                  >
                    {inMonth && date.getDate()}
                    {isArrival && !isSelectedArrival && (
                      <span className="absolute inset-0 ring-1 ring-sea pointer-events-none" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { stayForArrival, inSeason, isParkClosedPeriod };