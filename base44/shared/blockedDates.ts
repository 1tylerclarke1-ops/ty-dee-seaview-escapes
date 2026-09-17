// Owner-blocked date ranges. A block covers nights [start_date, end_date]
// inclusive — both dates are nights the caravan is unavailable. The reason
// and notes are admin-only; guests never see them (the public calendar gets
// only { start_date, end_date } via getBlockedDateRanges).
//
// A block is refused if it overlaps any active booking (held, deposit_paid,
// confirmed) — the owner must never block dates a guest has paid for. It may
// overlap another block, in which case the admin can merge or replace.

import { addDaysIso } from "./cancellation.ts";
import { SEASONS, allowedLengthsForArrival } from "./bookingRules.ts";
import { calculatePrice } from "./pricing.ts";

// Booking statuses that occupy dates and must not be overlapped by a block.
export const BLOCKING_STATUSES = ["held", "deposit_paid", "confirmed"];

export function isBlockingBooking(b, now = Date.now()) {
  if (!BLOCKING_STATUSES.includes(b.status)) return false;
  // An expired hold has released its dates — it does not block.
  if (b.status === "held" && b.hold_expires_at && new Date(b.hold_expires_at).getTime() < now) return false;
  return true;
}

// Does a block [start, end] (inclusive) overlap a booking's nights?
// Booking nights: [arrival, arrival + nights - 1]. Block nights: [start, end].
export function blockOverlapsBooking(block, booking) {
  const bookingLastNight = addDaysIso(booking.arrival_date, booking.nights - 1);
  return block.start_date <= bookingLastNight && booking.arrival_date <= block.end_date;
}

// Do two blocks (both inclusive [start, end]) overlap?
export function blocksOverlap(a, b) {
  return a.start_date <= b.end_date && b.start_date <= a.end_date;
}

// Active bookings that conflict with a proposed block range.
export function findBookingConflicts(bookings, startIso, endIso) {
  const now = Date.now();
  const block = { start_date: startIso, end_date: endIso };
  return (bookings || [])
    .filter((b) => isBlockingBooking(b, now))
    .filter((b) => blockOverlapsBooking(block, b));
}

// Existing blocks that overlap a proposed range (excluding the block being edited).
export function findBlockOverlaps(blocks, startIso, endIso, excludeId) {
  const block = { start_date: startIso, end_date: endIso };
  return (blocks || [])
    .filter((b) => !excludeId || b.id !== excludeId)
    .filter((b) => blocksOverlap(block, b));
}

// Cost preview for a proposed block: seasons covered, the number of bookable
// stays it removes (every valid arrival+length pair arriving within the range),
// and the rough revenue those stays represent at current rates. Dates outside
// all seasons (e.g. before the booking window opens) contribute zero.
export function previewBlockCost(startIso, endIso) {
  const seasonsCovered = [];
  for (const s of SEASONS) {
    if (s.start_date <= endIso && startIso <= s.end_date) {
      seasonsCovered.push(s.name);
    }
  }

  const removedStays = [];
  let cursor = new Date(startIso + "T00:00:00Z");
  const end = new Date(endIso + "T00:00:00Z");
  while (cursor <= end) {
    const lengths = allowedLengthsForArrival(cursor);
    for (const n of lengths) {
      const price = calculatePrice(cursor, n);
      removedStays.push({
        arrival: cursor.toISOString().slice(0, 10),
        nights: n,
        total: price?.total || 0,
      });
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const roughRevenue = removedStays.reduce((sum, s) => sum + s.total, 0);
  return {
    seasons: seasonsCovered,
    removedStaysCount: removedStays.length,
    roughRevenue,
  };
}

// Merge a set of overlapping blocks + a new range into one [start, end].
export function mergeBlockRanges(ranges) {
  if (!ranges.length) return null;
  const start = ranges.reduce((min, r) => (r.start_date < min ? r.start_date : min), ranges[0].start_date);
  const end = ranges.reduce((max, r) => (r.end_date > max ? r.end_date : max), ranges[0].end_date);
  return { start_date: start, end_date: end };
}

// Nights covered by a block [start, end] inclusive.
export function blockNights(block) {
  const s = new Date(block.start_date + "T00:00:00Z");
  const e = new Date(block.end_date + "T00:00:00Z");
  return Math.round((e - s) / 86_400_000) + 1;
}