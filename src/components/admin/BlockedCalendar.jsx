import { useMemo } from "react";
import { format, parseISO, isWithinInterval } from "date-fns";

// A compact admin-only calendar showing the next N months. Each day is
// colour-coded: blocked (owner) dates in signal amber, booked (guest) dates
// in slate, and both (a block overlapping a booking — should never happen but
// is shown if it does) in a warning red. Lets the owner distinguish their own
// blocks from real bookings at a glance. No selection, no interaction —
// display only.

function isDateInRange(dateStr, ranges) {
  if (!ranges?.length) return false;
  const d = parseISO(dateStr);
  return ranges.some((r) => {
    const s = parseISO(r.start_date);
    const e = parseISO(r.end_date);
    return isWithinInterval(d, { start: s, end: e });
  });
}

function monthGrid(year, month) {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(1 - ((first.getDay() + 6) % 7)); // back to Monday
  const days = [];
  const cursor = new Date(start);
  for (let i = 0; i < 42; i++) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function DayCell({ date, inMonth, blocked, booked }) {
  if (!inMonth) return <div className="aspect-square" />;
  const dateStr = format(date, "yyyy-MM-dd");
  let bg = "bg-white/5";
  let label = "";
  if (blocked && booked) {
    bg = "bg-red-500/40";
    label = "Conflict";
  } else if (blocked) {
    bg = "bg-signal/40";
    label = "Block";
  } else if (booked) {
    bg = "bg-white/25";
    label = "Booked";
  }
  return (
    <div
      className={`aspect-square flex flex-col items-center justify-center text-xs tnum ${bg} rounded-sm`}
      title={label ? `${dateStr} · ${label}` : dateStr}
    >
      <span className={blocked || booked ? "text-white" : "text-white/60"}>{date.getDate()}</span>
    </div>
  );
}

export default function BlockedCalendar({ blocks = [], bookings = [], months = 4 }) {
  const blockRanges = blocks.map((b) => ({ start_date: b.start_date, end_date: b.end_date }));
  const bookingRanges = useMemo(
    () =>
      bookings
        .filter((b) => b.status === "held" || b.status === "deposit_paid" || b.status === "confirmed")
        .map((b) => {
          const dep = new Date(parseISO(b.arrival_date));
          dep.setDate(dep.getDate() + b.nights - 1);
          return { start_date: b.arrival_date, end_date: format(dep, "yyyy-MM-dd") };
        }),
    [bookings]
  );

  const today = new Date();
  const monthList = useMemo(() => {
    const list = [];
    const cursor = new Date(today.getFullYear(), today.getMonth(), 1);
    for (let i = 0; i < months; i++) {
      list.push({ year: cursor.getFullYear(), month: cursor.getMonth() });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return list;
  }, []);

  return (
    <div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 mb-5 text-xs text-white/60">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-signal/40 rounded-sm" /> Owner block
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-white/25 rounded-sm" /> Guest booking
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-red-500/40 rounded-sm" /> Conflict
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-white/5 rounded-sm border border-white/10" /> Free
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {monthList.map((m) => {
          const days = monthGrid(m.year, m.month);
          return (
            <div key={`${m.year}-${m.month}`}>
              <h4 className="text-sm text-white/80 mb-2">{format(new Date(m.year, m.month, 1), "MMMM yyyy")}</h4>
              <div className="grid grid-cols-7 gap-1">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                  <div key={i} className="text-[0.6rem] text-white/30 text-center pb-1">{d}</div>
                ))}
                {days.map((date) => {
                  const dateStr = format(date, "yyyy-MM-dd");
                  const inMonth = date.getMonth() === m.month;
                  return (
                    <DayCell
                      key={dateStr}
                      date={date}
                      inMonth={inMonth}
                      blocked={isDateInRange(dateStr, blockRanges)}
                      booked={isDateInRange(dateStr, bookingRanges)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}