import { useMemo, useState } from "react";
import { format, isBefore, isEqual, parseISO, startOfMonth } from "date-fns";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SEASON_START, SEASON_END } from "@/lib/siteConfig";
import { useIsMobile } from "@/hooks/use-mobile";
import { useFacilitiesSettings } from "@/lib/facilities";
import MonthGrid from "@/components/MonthGrid";
import CalendarLegend from "@/components/CalendarLegend";

// Single-month view with prev/next arrows + a dropdown of every month in the
// booking window. Mobile shows one month; desktop shows two side by side.
// The selected stay is preserved while navigating — only the view moves.
export default function StayCalendar({ selectedArrival, selectedLength, onSelect }) {
  const isMobile = useIsMobile();
  const showCount = isMobile ? 1 : 2;
  const reduce = useReducedMotion();

  const months = useMemo(() => {
    const start = startOfMonth(parseISO(SEASON_START));
    const end = startOfMonth(parseISO(SEASON_END));
    const list = [];
    let cursor = new Date(start);
    while (isBefore(cursor, end) || isEqual(cursor, end)) {
      list.push({
        year: cursor.getFullYear(),
        month: cursor.getMonth(),
        label: format(cursor, "MMMM yyyy"),
      });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
    return list;
  }, []);

  const [viewIndex, setViewIndex] = useState(() => {
    const now = new Date();
    const exact = months.findIndex((m) => m.year === now.getFullYear() && m.month === now.getMonth());
    if (exact !== -1) return exact;
    const nowMs = startOfMonth(now).getTime();
    const firstMs = new Date(months[0].year, months[0].month, 1).getTime();
    return nowMs < firstMs ? 0 : months.length - 1;
  });
  const [dir, setDir] = useState(0);

  const atStart = viewIndex === 0;
  const atEnd = viewIndex + showCount >= months.length;

  const goPrev = () => {
    if (viewIndex > 0) {
      setDir(-1);
      setViewIndex(viewIndex - 1);
    }
  };
  const goNext = () => {
    if (viewIndex + showCount < months.length) {
      setDir(1);
      setViewIndex(viewIndex + 1);
    }
  };
  const handleKey = (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goPrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goNext();
    }
  };

  const { settings: facilities } = useFacilitiesSettings();

  const closedNoteFor = (m) => {
    const cf = parseISO(facilities.facilities_closed_from);
    const inMonth = m.year === cf.getFullYear() && m.month === cf.getMonth();
    const prev = new Date(cf.getFullYear(), cf.getMonth() - 1, 1);
    const inPrevMonth = m.year === prev.getFullYear() && m.month === prev.getMonth();
    return inMonth || inPrevMonth ? `Facilities closed from ${format(cf, "d MMM")}` : null;
  };

  const openNoteFor = (m) => {
    const of = parseISO(facilities.facilities_open_from);
    return m.year === of.getFullYear() && m.month === of.getMonth()
      ? `Facilities open from ${format(of, "d MMM")}`
      : null;
  };

  const visible = months.slice(viewIndex, viewIndex + showCount);

  return (
    <div onKeyDown={handleKey} tabIndex={-1} className="outline-none">
      <div className="flex items-center justify-between gap-4 mb-8">
        <button
          type="button"
          onClick={goPrev}
          disabled={atStart}
          aria-label="Previous month"
          className="w-10 h-10 inline-flex items-center justify-center border border-line text-ink-soft hover:border-sea hover:text-sea disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
        </button>

        <select
          value={viewIndex}
          onChange={(e) => {
            setDir(0);
            setViewIndex(Number(e.target.value));
          }}
          aria-label="Choose month"
          className="bg-transparent text-xl md:text-2xl font-heading text-ink text-center cursor-pointer focus:outline-none focus:text-sea px-2 py-1"
        >
          {months.map((m, i) => (
            <option key={`${m.year}-${m.month}`} value={i}>
              {m.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={goNext}
          disabled={atEnd}
          aria-label="Next month"
          className="w-10 h-10 inline-flex items-center justify-center border border-line text-ink-soft hover:border-sea hover:text-sea disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronRight className="w-5 h-5" strokeWidth={1.5} />
        </button>
      </div>

      <div className="overflow-hidden">
        <motion.div
          key={viewIndex}
          initial={reduce ? false : { x: dir * 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className={showCount === 2 ? "grid grid-cols-2 gap-8" : ""}
        >
          {visible.map((m) => (
            <MonthGrid
              key={`${m.year}-${m.month}`}
              year={m.year}
              month={m.month}
              selectedArrival={selectedArrival}
              selectedLength={selectedLength}
              onSelect={onSelect}
              closedNote={closedNoteFor(m)}
              openNote={openNoteFor(m)}
              facilitiesSettings={facilities}
            />
          ))}
        </motion.div>
      </div>

      <CalendarLegend />
    </div>
  );
}