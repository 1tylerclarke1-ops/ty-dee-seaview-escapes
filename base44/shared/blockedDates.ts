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
import { OCCUPANCY_BY_SEASON, CLEANING_COST } from "./pitchFeeConfig.ts";

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

// Cost preview for a proposed block. Estimates the realistic net revenue at
// risk — not the sum of every overlapping stay (which double-counts the same
// nights), but the maximum non-overlapping set of stays that could tile the
// range, priced at current rates, then adjusted by seasonal occupancy and
// reduced by the cleaning cost per booking. The result is what the owner is
// actually giving up: a few hundred pounds in a quiet season, not thousands.
//
// Algorithm: weighted interval scheduling (DP) over all candidate stays that
// fit within [start, end]. Each candidate is a valid (arrival day, length)
// pair whose nights fall entirely in the range. The DP picks the set with the
// maximum gross revenue. Each selected stay is then weighted by its season's
// occupancy assumption, and £80 cleaning is deducted per stay.
export function previewBlockCost(startIso, endIso) {
  const seasonsCovered = [];
  for (const s of SEASONS) {
    if (s.start_date <= endIso && startIso <= s.end_date) {
      seasonsCovered.push(s.name);
    }
  }

  // Generate every candidate stay that fits within the range.
  const candidates = [];
  let cursor = new Date(startIso + "T00:00:00Z");
  const end = new Date(endIso + "T00:00:00Z");
  while (cursor <= end) {
    const lengths = allowedLengthsForArrival(cursor);
    for (const n of lengths) {
      const stayEnd = new Date(cursor);
      stayEnd.setUTCDate(stayEnd.getUTCDate() + n - 1);
      if (stayEnd <= end) {
        const price = calculatePrice(cursor, n);
        if (price) {
          candidates.push({
            arrival: cursor.toISOString().slice(0, 10),
            nights: n,
            startMs: cursor.getTime(),
            endMs: stayEnd.getTime(),
            revenue: price.total,
            season: price.season.name,
          });
        }
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  if (!candidates.length) {
    return {
      seasons: seasonsCovered,
      stayCount: 0,
      stays: [],
      grossRevenue: 0,
      occupancyRevenue: 0,
      cleaningTotal: 0,
      netContribution: 0,
      occupancyAssumptions: [],
    };
  }

  // Weighted interval scheduling: sort by end night, then DP.
  candidates.sort((a, b) => a.endMs - b.endMs || a.startMs - b.startMs);

  const latestNonOverlapping = (i) => {
    for (let j = i - 1; j >= 0; j--) {
      if (candidates[j].endMs < candidates[i].startMs) return j;
    }
    return -1;
  };

  const n = candidates.length;
  const dp = new Array(n).fill(0);
  const take = new Array(n).fill(false);
  for (let i = 0; i < n; i++) {
    const lno = latestNonOverlapping(i);
    const incl = candidates[i].revenue + (lno >= 0 ? dp[lno] : 0);
    const excl = i > 0 ? dp[i - 1] : 0;
    if (incl >= excl) {
      dp[i] = incl;
      take[i] = true;
    } else {
      dp[i] = excl;
      take[i] = false;
    }
  }

  // Reconstruct the selected stays.
  const selected = [];
  let i = n - 1;
  while (i >= 0) {
    if (take[i]) {
      selected.push(candidates[i]);
      i = latestNonOverlapping(i);
    } else {
      i--;
    }
  }
  selected.reverse();

  // Apply per-season occupancy and deduct cleaning per stay.
  const grossRevenue = selected.reduce((sum, s) => sum + s.revenue, 0);
  const occupancyRevenue = selected.reduce((sum, s) => {
    const occ = OCCUPANCY_BY_SEASON[s.season] ?? 0;
    return sum + s.revenue * occ;
  }, 0);
  const cleaningTotal = selected.length * CLEANING_COST;
  const netContribution = occupancyRevenue - cleaningTotal;

  const seen = new Set();
  const occupancyAssumptions = [];
  for (const s of selected) {
    if (!seen.has(s.season)) {
      seen.add(s.season);
      occupancyAssumptions.push({ season: s.season, occupancy: OCCUPANCY_BY_SEASON[s.season] ?? 0 });
    }
  }

  return {
    seasons: seasonsCovered,
    stayCount: selected.length,
    stays: selected.map((s) => ({
      arrival: s.arrival,
      nights: s.nights,
      season: s.season,
      gross: s.revenue,
    })),
    grossRevenue,
    occupancyRevenue,
    cleaningTotal,
    netContribution,
    occupancyAssumptions,
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