import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { computeGaps } from "../../shared/gaps.ts";

// The gaps view — every unsold bookable stay in the next 30 days with price,
// net per night after cleaning, days to arrival, the ladder rung it qualifies
// for, and a suggested offer; plus orphan gaps between bookings. Admin-only.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin required" }, { status: 403 });
    }
    const bookings = await base44.asServiceRole.entities.Booking.list("-arrival_date", 500);
    const active = (bookings || []).filter((b) => b.status !== "cancelled");
    const today = new Date().toISOString().slice(0, 10);
    const view = computeGaps(active, today, 30);
    return Response.json({ ok: true, today, ...view });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}