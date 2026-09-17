import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { listUnavailableRanges } from "../../shared/availability.ts";

// Public: returns all unavailable date ranges — owner blocks AND booked
// nights (held [not expired], deposit_paid, confirmed) — as a flat list of
// { start_date, end_date } with no source, reason, notes, or guest details.
// A guest sees "not available" and nothing else; an owner block and a real
// booking are indistinguishable. The booking status set is shared with
// findConflict via isBlockingBooking, so the calendar and the server can
// never disagree on what blocks.
//
// Admin still distinguishes owner blocks from bookings via manageBlockedDates
// and the admin BlockedCalendar — this endpoint is the public path only.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const ranges = await listUnavailableRanges(base44);
    return Response.json({ ranges });
  } catch (error) {
    return Response.json({ ranges: [] });
  }
}