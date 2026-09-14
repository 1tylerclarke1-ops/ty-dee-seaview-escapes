// Facilities-closure logic for the site. Pure functions mirror
// base44/shared/facilities.ts (server-side) so disclosure never drifts from
// the booking engine. The closed window repeats annually from the month/day
// of the two settings dates, so the owner rolls the dates forward each year.

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";

export const DEFAULT_FACILITIES_SETTINGS = {
  facilities_closed_from: "2026-11-01",
  facilities_open_from: "2027-03-19",
  facilities_list:
    "Heated indoor pool, family entertainment, club house, children's play area, shop and takeaway — open to holiday park guests during the operating season.",
  facilities_winter_note:
    "The park's facilities are closed until 19 March — this is Cornwall at its quietest, and priced accordingly.",
};

function md(value) {
  if (value instanceof Date) return value.getMonth() * 100 + value.getDate();
  const parts = String(value).split("-");
  return parseInt(parts[1], 10) * 100 + parseInt(parts[2], 10);
}

function toISO(value) {
  return value instanceof Date ? format(value, "yyyy-MM-dd") : value;
}

function addDaysIso(iso, n) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// A date is facilities-closed if its month/day falls inside the annually
// recurring closed window [closed_from, open_from). open_from is itself OPEN.
export function isFacilitiesClosed(date, settings) {
  const s = settings || DEFAULT_FACILITIES_SETTINGS;
  const c = md(s.facilities_closed_from);
  const o = md(s.facilities_open_from);
  const d = md(date);
  if (c <= o) return d >= c && d < o; // non-wrapping window
  return d >= c || d < o; // wrapping window (e.g. Nov 1 -> Mar 19)
}

// Status of a specific stay: "open" | "closed" | "partial". A stay is
// facilities-closed if ANY of its nights falls inside the closed window.
export function stayFacilitiesStatus(arrival, nights, settings) {
  const s = settings || DEFAULT_FACILITIES_SETTINGS;
  const arrivalIso = toISO(arrival);
  let closedNights = 0;
  let firstClosed = null;
  let firstOpen = null;
  for (let i = 0; i < nights; i++) {
    const night = addDaysIso(arrivalIso, i);
    if (isFacilitiesClosed(night, s)) {
      closedNights++;
      if (firstClosed === null) firstClosed = night;
    } else if (firstOpen === null) {
      firstOpen = night;
    }
  }
  let state = "open";
  if (closedNights === nights) state = "closed";
  else if (closedNights > 0) state = "partial";
  // For a partial stay, name the transition: "opening" (closed -> open) names
  // the reopening date; "closing" (open -> closed) names the closing date.
  let direction = null;
  let boundaryDate = null;
  if (state === "partial") {
    if (isFacilitiesClosed(arrivalIso, s)) {
      direction = "opening";
      boundaryDate = firstOpen;
    } else {
      direction = "closing";
      boundaryDate = firstClosed;
    }
  }
  return { state, direction, boundaryDate, closedNights, openNights: nights - closedNights };
}

// Status across a whole pricing season (contiguous date range).
export function seasonFacilitiesStatus(season, settings) {
  const s = settings || DEFAULT_FACILITIES_SETTINGS;
  let cursor = season.start_date;
  const end = season.end_date;
  let hasClosed = false;
  let hasOpen = false;
  let firstClosed = null;
  let firstOpen = null;
  let guard = 0;
  while (guard < 400 && cursor <= end) {
    if (isFacilitiesClosed(cursor, s)) {
      hasClosed = true;
      if (firstClosed === null) firstClosed = cursor;
    } else {
      hasOpen = true;
      if (firstOpen === null) firstOpen = cursor;
    }
    cursor = addDaysIso(cursor, 1);
    guard++;
  }
  let state = "open";
  if (hasClosed && !hasOpen) state = "closed";
  else if (hasClosed && hasOpen) state = "partial";
  let direction = null;
  let boundaryDate = null;
  if (state === "partial") {
    if (isFacilitiesClosed(season.start_date, s)) {
      direction = "opening";
      boundaryDate = firstOpen;
    } else {
      direction = "closing";
      boundaryDate = firstClosed;
    }
  }
  return { state, direction, boundaryDate };
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function formatFacilitiesDate(iso) {
  if (!iso) return "";
  const parts = String(iso).split("-");
  return `${parseInt(parts[2], 10)} ${MONTHS[parseInt(parts[1], 10) - 1]}`;
}

// Loads the single FacilitiesSettings record (admin-editable) and merges with
// defaults so the site always has sensible values before the owner sets any.
export function useFacilitiesSettings() {
  const [settings, setSettings] = useState(DEFAULT_FACILITIES_SETTINGS);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    base44.entities.FacilitiesSettings.list()
      .then((rows) => {
        if (!mounted || !rows || !rows.length) return;
        const r = rows[0];
        const merged = { ...DEFAULT_FACILITIES_SETTINGS };
        for (const k of Object.keys(DEFAULT_FACILITIES_SETTINGS)) {
          if (r[k]) merged[k] = r[k];
        }
        setSettings(merged);
      })
      .catch(() => {})
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);
  return { settings, loading };
}