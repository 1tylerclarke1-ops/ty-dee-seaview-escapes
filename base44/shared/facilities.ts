// Shared facilities-closure logic (server-side). Mirrors src/lib/facilities.js
// so the booking engine and email function stay in sync with the site.
// Operates on ISO "yyyy-MM-dd" strings only. The closed window repeats
// annually from the month/day of the two settings dates.

export const DEFAULT_FACILITIES_SETTINGS = {
  facilities_closed_from: "2026-11-01",
  facilities_open_from: "2027-03-19",
  facilities_list:
    "Heated indoor pool, family entertainment, club house, children's play area, shop and takeaway — open to holiday park guests during the operating season.",
  facilities_winter_note:
    "The park's facilities are closed until 19 March — this is Cornwall at its quietest, and priced accordingly.",
};

function md(iso) {
  const parts = String(iso).split("-");
  return parseInt(parts[1], 10) * 100 + parseInt(parts[2], 10);
}

export function addDaysIso(iso, n) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// A date is facilities-closed if its month/day falls inside the annually
// recurring closed window [closed_from, open_from). open_from is itself OPEN.
export function isFacilitiesClosed(iso, settings) {
  const s = settings || DEFAULT_FACILITIES_SETTINGS;
  const c = md(s.facilities_closed_from);
  const o = md(s.facilities_open_from);
  const d = md(iso);
  if (c <= o) return d >= c && d < o; // non-wrapping window
  return d >= c || d < o; // wrapping window (e.g. Nov 1 -> Mar 19)
}

// Status of a specific stay: "open" | "closed" | "partial".
export function stayFacilitiesStatus(arrivalIso, nights, settings) {
  const s = settings || DEFAULT_FACILITIES_SETTINGS;
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

export function formatFacilitiesDate(iso) {
  if (!iso) return "";
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const parts = String(iso).split("-");
  return parseInt(parts[2], 10) + " " + months[parseInt(parts[1], 10) - 1];
}