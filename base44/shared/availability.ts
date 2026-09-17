// Availability checks against the Booking entity. A single caravan, so we list
// bookings and check for date overlaps in JS. A held booking past its
// hold_expires_at is treated as released (does not block).
//
// Two call sites, two policies:
//   createCheckoutSession — includeHeld=true: an active hold blocks, so two
//     guests can't both create holds on the same dates (the second gets a 409).
//   confirmBookingPayment   — includeHeld=false: only deposit_paid/confirmed
//     bookings block. The first payment to confirm wins; a later overlapping
//     payment sees the first as confirmed and is refunded. (Holds block at
//     session-creation time, not at confirm time — otherwise two racing holds
//     would both see each other as conflicts and both lose.)

import { addDaysIso } from "./cancellation.ts";
import { allowedLengthsForArrival, seasonForDate } from "./bookingRules.ts";

export async function findConflict(base44, arrivalIso, nights, excludeId, includeHeld = true) {
  const departureIso = addDaysIso(arrivalIso, nights);

  // Owner-blocked dates are checked first and always win — a block makes the
  // dates unbookable regardless of booking races. A synthetic object with an
  // epoch created_date is returned so any post-update tiebreaker (which
  // compares created_date) always favours the block.
  const blocks = await base44.asServiceRole.entities.BlockedDate.list("-start_date", 500);
  for (const block of blocks || []) {
    // Block [start, end] inclusive overlaps stay [arrival, departure) if
    // arrival <= end AND start < departure.
    if (arrivalIso <= block.end_date && block.start_date < departureIso) {
      return { _isBlock: true, id: block.id || "block", created_date: new Date(0).toISOString(), reference: "Owner block" };
    }
  }

  const bookings = await base44.asServiceRole.entities.Booking.list("-arrival_date", 500);
  const now = Date.now();
  for (const b of bookings || []) {
    if (b.id === excludeId) continue;
    let statusOk;
    if (b.status === "deposit_paid" || b.status === "confirmed") {
      statusOk = true;
    } else if (b.status === "held" && includeHeld) {
      // Expired hold = released dates.
      if (b.hold_expires_at && new Date(b.hold_expires_at).getTime() < now) continue;
      statusOk = true;
    } else {
      continue;
    }
    const bDeparture = addDaysIso(b.arrival_date, b.nights);
    // Overlap: this arrival < their departure AND their arrival < this departure
    if (arrivalIso < bDeparture && b.arrival_date < departureIso) return b;
  }
  return null;
}

export async function isAvailable(base44, arrivalIso, nights, excludeId) {
  return !(await findConflict(base44, arrivalIso, nights, excludeId, true));
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