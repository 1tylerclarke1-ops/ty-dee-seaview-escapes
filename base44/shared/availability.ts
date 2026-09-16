// Availability checks against the Booking entity. A single caravan, so we list
// bookings and check for date overlaps in JS. A held booking past its
// hold_expires_at is treated as released (does not block). Used by the payment
// flow to re-check availability before creating a session and before
// confirming payment (the race-condition guard).

import { addDaysIso } from "./cancellation.ts";
import { allowedLengthsForArrival, seasonForDate } from "./bookingRules.ts";

// Returns the conflicting booking (held/deposit_paid/confirmed) that overlaps
// the given stay, or null if the dates are free. `excludeId` skips the booking
// being confirmed (its own hold should not block itself).
export async function findConflict(base44, arrivalIso, nights, excludeId) {
  const departureIso = addDaysIso(arrivalIso, nights);
  const bookings = await base44.asServiceRole.entities.Booking.list("-arrival_date", 500);
  const now = Date.now();
  for (const b of bookings || []) {
    if (b.id === excludeId) continue;
    if (b.status !== "held" && b.status !== "deposit_paid" && b.status !== "confirmed") continue;
    // Expired hold = released dates
    if (b.status === "held" && b.hold_expires_at && new Date(b.hold_expires_at).getTime() < now) continue;
    const bDeparture = addDaysIso(b.arrival_date, b.nights);
    // Overlap: this arrival < their departure AND their arrival < this departure
    if (arrivalIso < bDeparture && b.arrival_date < departureIso) return b;
  }
  return null;
}

export async function isAvailable(base44, arrivalIso, nights, excludeId) {
  return !(await findConflict(base44, arrivalIso, nights, excludeId));
}

// Find the next N available arrival dates for a given stay length, starting
// the day after `afterIso`. Checks both booking rules and availability. Used
// for the "dates taken" apology email.
export async function findAlternativeDates(base44, afterIso, nights, count = 3) {
  const out = [];
  let d = addDaysIso(afterIso, 1);
  for (let i = 0; i < 180 && out.length < count; i++) {
    const date = new Date(d + "T00:00:00Z");
    if (seasonForDate(date) && allowedLengthsForArrival(date).includes(nights)) {
      if (await isAvailable(base44, d, nights)) {
        out.push(d);
      }
    }
    d = addDaysIso(d, 1);
  }
  return out;
}